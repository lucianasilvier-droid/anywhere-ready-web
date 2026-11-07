import { createFileRoute } from "@tanstack/react-router";

const STOP_WORDS = ["parar", "sair", "descadastrar", "remover", "nao quero", "não quero", "bloquear"];
const YES_WORDS = ["sim", "autorizo", "pode enviar", "pode mandar", "aceito", "concordo", "ok"];

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
        const payload = await request.json().catch(() => null);
        if (!payload) return Response.json({ received: true });

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
            "";
          if (!from || !text) continue;

          const page = await base44.entities.Lead.list({ sort: "-created_date", limit: 300 });
          const leads = Array.isArray(page) ? page : page?.items || [];
          const lead = leads.find((l) => {
            const tel = digits(l.telefone);
            return tel && (tel.endsWith(from.slice(-8)) || from.endsWith(tel.slice(-8)));
          });
          if (!lead) continue;

          const normalizado = normalize(text);
          const recusou = STOP_WORDS.some((w) => normalizado.includes(normalize(w)));
          const autorizou =
            !recusou && YES_WORDS.some((w) => normalizado.includes(normalize(w))) && text.length <= 120;
          const agora = new Date().toISOString();

          const patch = { consent_resposta: text, ultimo_contato_em: agora };
          if (recusou) {
            patch.consentimento = "recusado";
            patch.consent_revogado_em = agora;
            patch.bloqueado = true;
            patch.etapa = "bloqueado";
          } else if (autorizou) {
            patch.consentimento = "autorizado";
            patch.consent_autorizado_em = agora;
            patch.consent_origem = "Resposta do estabelecimento via WhatsApp";
            patch.etapa = "contato_autorizado";
          }

          await base44.entities.Lead.update(lead.id, patch);
          await base44.entities.LeadInteraction.create({
            lead_id: lead.id,
            empresa: lead.empresa,
            tipo: "whatsapp_recebido",
            mensagem: text,
            autor: lead.empresa,
            detalhe: recusou
              ? "Resposta interpretada como recusa/opt-out. Contato bloqueado."
              : autorizou
                ? "Resposta interpretada como autorização."
                : "Resposta registrada sem alteração de autorização.",
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});