import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";

const STOP_WORDS = [
  "parar", "sair", "descadastrar", "remover", "nao quero", "nao tenho interesse",
  "nao autorizo", "prefiro nao", "bloquear", "nao aceito",
];
// Só considera autorização quando a resposta expressa claramente o aceite de receber mensagens.
 // Respostas genéricas como "sim", "ok", "claro" ou "pode" não comprovam opt-in.
const YES_PHRASES = [
  "autorizo", "sim autorizo", "sim eu autorizo", "aceito receber",
  "concordo em receber", "pode enviar mensagens", "pode mandar mensagens",
  "autorizo receber mensagens", "aceito mensagens", "pode me enviar mensagens",
];

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyReply(text) {
  const normalized = normalize(text);
  if (!normalized) return "indefinida";
  if (normalized === "nao" || normalized === "negativo" || STOP_WORDS.some((word) => normalized === word || normalized.startsWith(word + " "))) return "nao";
  if (YES_PHRASES.some((phrase) => normalized === phrase || normalized.startsWith(phrase + " "))) return "sim";
  return "indefinida";
}

/** Confere a assinatura SHA-256 do corpo bruto enviada pela Meta. */
export function validarAssinaturaMeta(rawBody, assinatura, appSecret) {
  const recebido = String(assinatura || "").startsWith("sha256=")
    ? String(assinatura).slice(7)
    : "";
  if (!appSecret || !/^[a-f0-9]{64}$/i.test(recebido)) return false;
  const esperado = createHmac("sha256", appSecret).update(rawBody).digest();
  const recebidoBuffer = Buffer.from(recebido, "hex");
  return recebidoBuffer.length === esperado.length && timingSafeEqual(recebidoBuffer, esperado);
}

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const { readSecret, resolveCredentials } = await import("@/lib/integrations.server");
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        let esperadoPainel = "";
        try {
          const creds = await resolveCredentials(context.getBase44().asServiceRole, "whatsapp");
          esperadoPainel = creds.values.whatsapp_verify_token || "";
        } catch {
          esperadoPainel = "";
        }
        const expected = esperadoPainel || readSecret("WHATSAPP_VERIFY_TOKEN");

        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge || "ok", { status: 200 });
        }
        return Response.json(
          {
            error:
              "Verificação recusada. Salve o verify token em Painel → Integrações e APIs e informe o mesmo texto na Meta.",
          },
          { status: 403 },
        );
      },

      POST: async ({ request, context }) => {
        const { readSecret, resolveCredentials } = await import("@/lib/integrations.server");
        const rawBody = Buffer.from(await request.arrayBuffer());
        const creds = await resolveCredentials(context.getBase44().asServiceRole, "whatsapp");
        const appSecret = creds.values.whatsapp_app_secret || readSecret("WHATSAPP_APP_SECRET");
        if (!appSecret) {
          return Response.json(
            { error: "App Secret da Meta não configurado. Salve-o em Painel → Integrações e APIs." },
            { status: 503 },
          );
        }

        // Valida a assinatura HMAC enviada pela Meta antes de processar qualquer evento.
        const assinatura = request.headers.get("x-hub-signature-256") || "";
        if (!validarAssinaturaMeta(rawBody, assinatura, appSecret)) {
          return Response.json({ error: "Assinatura do webhook ausente ou inválida." }, { status: 401 });
        }

        const payload = JSON.parse(rawBody.toString("utf8"));
        const base44 = context.getBase44().asServiceRole;
        const messages =
          payload?.entry?.flatMap((entry) =>
            (entry?.changes || []).flatMap((change) => change?.value?.messages || []),
          ) || [];

        for (const message of messages) {
          const from = digits(message.from);
          const text =
            message?.text?.body ||
            message?.button?.text ||
            message?.interactive?.button_reply?.title ||
            message?.interactive?.list_reply?.title ||
            "";
          if (!from || !text) continue;

          // Meta may retry webhook deliveries. The message ID makes recording idempotent.
          if (message.id) {
            const duplicada = await base44.entities.LeadInteraction.filter(
              { whatsapp_message_id: message.id },
              { limit: 1 },
            );
            if (duplicada?.length) continue;
          }

          const page = await base44.entities.Lead.list({ sort: "-created_date", limit: 300 });
          const leads = Array.isArray(page) ? page : page?.items || [];
          const lead = leads.find((l) => {
            const tel = digits(l.telefone);
            return tel && (tel.endsWith(from.slice(-8)) || from.endsWith(tel.slice(-8)));
          });
          if (!lead) continue;

          const respostaTipo = classifyReply(text);
          const agora = new Date().toISOString();
          const patch = { consent_resposta: text, ultimo_contato_em: agora };

          if (respostaTipo === "nao") {
            patch.consentimento = "recusado";
            patch.consent_revogado_em = agora;
            patch.bloqueado = true;
            patch.etapa = "bloqueado";
          } else if (respostaTipo === "sim") {
            // A refusal is never overwritten by a later affirmative reply.
            if (!["recusado", "revogado"].includes(lead.consentimento) && !lead.bloqueado) {
              patch.consentimento = "autorizado";
              patch.consent_autorizado_em = agora;
              patch.consent_origem = "Resposta do estabelecimento via WhatsApp";
              patch.etapa = "contato_autorizado";
            }
          }

          await base44.entities.Lead.update(lead.id, patch);
          const tipoNotificacao = respostaTipo === "sim" && patch.consentimento !== "autorizado" ? "sim_bloqueado" : respostaTipo;
          await base44.entities.LeadInteraction.create({
            lead_id: lead.id,
            empresa: lead.empresa,
            tipo: "whatsapp_recebido",
            mensagem: text,
            autor: lead.empresa,
            detalhe:
              respostaTipo === "nao"
                ? "Resposta identificada como NÃO. Contato bloqueado e abordagem interrompida."
                : respostaTipo === "sim"
                  ? patch.consentimento === "autorizado"
                    ? "Resposta identificada como SIM. Autorização registrada."
                    : "Resposta SIM recebida, mas o bloqueio anterior foi preservado."
                  : "Resposta recebida, mas não foi possível classificar como SIM ou NÃO. Revisar manualmente.",
            resposta_tipo: tipoNotificacao,
            notificacao_lida: false,
            recebido_em: message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : agora,
            whatsapp_message_id: message.id || "",
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});
