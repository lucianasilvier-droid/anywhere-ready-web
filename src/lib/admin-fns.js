import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { BRAND_NAME } from "@/lib/site-content";
import {
  CREDENTIAL_KEYS,
  iaJSON,
  readSecret,
  resolveCredentials,
  searchPlaces,
  sendWhatsappText,
  testIntegration,
} from "@/lib/integrations.server";

async function iaValues(base44) {
  return (await resolveCredentials(base44.asServiceRole || base44, "groq")).values;
}

function requireAdmin(context) {
  if (context.user?.role !== "admin") {
    setResponseStatus(403);
    throw Object.assign(new Error("Apenas administradores podem executar esta ação."), { status: 403 });
  }
}

// CRM tools are open to administrators and to active sales representatives. A
// representative only reaches their own leads: the visitor's data client enforces it.
async function requireCrmAccess(context) {
  if (context.user?.role === "admin") return;
  if (await context.getBase44().representante()) return;
  setResponseStatus(403);
  throw Object.assign(new Error("Seu acesso ao CRM não está liberado. Fale com o administrador."), { status: 403 });
}

const CONTEXT_TOOL = `Você é um assistente comercial especialista em marketing local.
A empresa vende quatro serviços para negócios locais no Brasil:
1) Criação e configuração do Perfil da Empresa no Google Maps;
2) Administração e gestão mensal desse perfil;
3) Placas NFC que levam clientes ao link de avaliação do Google e ao Instagram;
4) Criação de site com mapa do Google Maps e agendamento pelo WhatsApp (ofereça sempre que a empresa não tiver site).
Nunca prometa primeira posição no Google, quantidade garantida de avaliações ou resultados não comprováveis.
Respeite a LGPD e as regras do WhatsApp: nenhuma mensagem promocional sem autorização prévia do estabelecimento.
Escreva em português do Brasil, com tom profissional, cordial e direto.`;

function leadBrief(lead) {
  return [
    `Empresa: ${lead.empresa || "não informada"}`,
    `Categoria: ${lead.categoria || "não informada"}`,
    `Cidade: ${lead.cidade || "não informada"}${lead.bairro ? `, bairro ${lead.bairro}` : ""}`,
    `Telefone: ${lead.telefone || "não informado"}`,
    `Site: ${lead.site || "não informado"}`,
    `Nota no Google: ${lead.nota_google ?? "sem dados"} (${lead.total_avaliacoes ?? 0} avaliações)`,
    `Serviço de interesse: ${lead.servico_interesse || "a definir"}`,
    `Observações: ${lead.observacoes || "nenhuma"}`,
  ].join("\n");
}

// Who is sending the message: the company name set in Configurações (or the brand) and
// the person writing (sales representative or the signed-in operator).
async function senderIdentity(context) {
  const base44 = context.getBase44();
  const svc = base44.asServiceRole || base44;
  let empresa = "";
  try {
    const page = await svc.entities.Configuracao.filter({ chave: "empresa_nome" }, { limit: 1 });
    empresa = String((Array.isArray(page) ? page : page?.items || [])[0]?.valor || "").trim();
  } catch {
    empresa = "";
  }
  let remetente = "";
  try {
    const rep = await base44.representante();
    remetente = String(rep?.nome || "").trim();
  } catch {
    remetente = "";
  }
  if (!remetente) remetente = String(context.user?.full_name || "").trim();
  return { empresa: empresa || BRAND_NAME, remetente: remetente.split(/\s+/)[0] || "" };
}

// Replaces any "[Nome da Empresa]"-style placeholder the model still leaves behind.
function preencherPlaceholders(texto, { empresa, remetente }, lead) {
  return String(texto || "")
    .replace(/\[\s*(nome\s+d[ao]\s+)?(sua\s+|nossa\s+)?(empresa|ag[êe]ncia|companhia)\s*\]/gi, empresa)
    .replace(/\[\s*(seu\s+|meu\s+)?nome(\s+do\s+(remetente|vendedor|representante|consultor))?\s*\]/gi, remetente || empresa)
    .replace(/\[\s*(nome\s+d[ao]\s+)?(estabelecimento|neg[óo]cio|cliente|barbearia|loja)\s*\]/gi, lead.empresa || "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

/* --------------------------- Google Places (CRM) -------------------------- */

export const searchPlacesFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      textQuery: z.string().trim().min(3).max(160),
      max: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const creds = await resolveCredentials(context.getBase44().asServiceRole, "google_places");
    return searchPlaces({ textQuery: data.textQuery, maxResultCount: data.max || 10 }, creds.values);
  });

/* ----------------------------------- IA (Groq) -------------------------------- */

export const analyzeLeadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ leadId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);

    const result = await iaJSON(
      `${CONTEXT_TOOL}

Analise a empresa abaixo e identifique o que faz sentido vender para ela.

${leadBrief(lead)}

Devolva:
- "resumo": 2 a 3 frases sobre o momento digital da empresa e o que isso indica.
- "oportunidades": quais dos quatro serviços fazem sentido, explicando o porquê em até 4 frases.
- "abordagem": como iniciar a conversa em até 4 frases, sem parecer spam.
- "proposta": um esboço curto de proposta comercial (escopo + próximo passo), sem preços inventados.
- "prioridade": "alta", "media" ou "baixa" conforme o potencial.`,
      '{"resumo": string, "oportunidades": string, "abordagem": string, "proposta": string, "prioridade": string}',
      await iaValues(base44),
    );

    if (!result.ok) {
      setResponseStatus(400);
      throw Object.assign(new Error(result.error), { status: 400 });
    }

    const d = result.data || {};
    await base44.entities.Lead.update(lead.id, {
      ai_resumo: d.resumo || "",
      ai_oportunidades: d.oportunidades || "",
      ai_abordagem: d.abordagem || "",
      ai_proposta: d.proposta || "",
      ai_analisado_em: new Date().toISOString(),
      etapa: lead.etapa === "novo_lead" ? "empresa_analisada" : lead.etapa,
    });

    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa: lead.empresa,
      tipo: "ia",
      mensagem: d.resumo || "Análise de IA concluída.",
      autor: "IA Roq",
      detalhe: `Prioridade sugerida: ${d.prioridade || "não informada"}`,
    });

    return { ok: true, analise: d };
  });

export const draftMessageFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      leadId: z.string().min(1),
      tipo: z.enum(["autorizacao", "proposta", "followup", "resposta_avaliacao"]),
      previewSiteUrl: z.preprocess(
        (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
        z.string().url().max(500).optional(),
      ),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);

    const instrucoes = {
      autorizacao: `Escreva a PRIMEIRA mensagem de WhatsApp (máx. 90 palavras). Abra com um elogio verdadeiro e específico, usando apenas dados reais do estabelecimento: categoria, bairro, nota/quantidade de avaliações ou algum detalhe disponível. Apresente as placas NFC para facilitar o acesso dos clientes à avaliação no Google. Se a empresa NÃO tem site e existe uma URL de prévia informada adiante, diga que preparamos uma prévia de um site moderno e bonito para valorizar o negócio e pergunte se podemos enviar. Peça resposta SIM. Não envie preços, links, vídeo nem material promocional nesta primeira mensagem. Não afirme que o site está pronto se não houver URL de prévia.`,
      proposta: `Escreva a abertura de uma apresentação comercial curta para WhatsApp (máx. 90 palavras). IMPORTANTE: o cliente JÁ AUTORIZOU receber a proposta. Não peça autorização novamente, não pergunte se pode enviar materiais, não use frases como “posso enviar”, “gostaria de enviar” ou “aguardo sua autorização”. Fale como continuação natural da conversa, apresente os benefícios e convide o cliente a abrir os links e assistir ao vídeo que seguem abaixo. Não invente preços, produtos, links ou recursos.`,
      followup: `Escreva uma mensagem de acompanhamento (máx. 60 palavras) para um contato que já autorizou o recebimento de informações, retomando a conversa sem pressão e oferecendo ajuda.`,
      resposta_avaliacao: `Escreva uma sugestão de resposta pública a uma avaliação de cliente no Google (máx. 80 palavras), agradecendo, sendo cordial e convidando o cliente a continuar o contato. Não prometa nada em nome da empresa.`,
    }[data.tipo];

    const remetente = await senderIdentity(context);
    const previewSiteUrl = String(data.previewSiteUrl || "").trim();
    const videoDemoUrl = String(process.env.WHATSAPP_DEMO_VIDEO_URL || process.env.DEMO_VIDEO_URL || "").trim();
    const catalogoFallback = [
      { nome: "Placa Google NFC", preco: "R$ 55,00", url: "https://loja.infinitepay.io/bikercourierexpress/hhy2911-placa-google-nfc", descricao: "Acesso direto à página de avaliação do Google." },
      { nome: "Placa Instagram NFC", preco: "R$ 55,00", url: "https://loja.infinitepay.io/bikercourierexpress/xpg6030-placas-nfc-instagram", descricao: "Acesso direto ao Instagram do estabelecimento." },
      { nome: "Kit Google + Instagram", preco: "R$ 95,00", url: "https://loja.infinitepay.io/bikercourierexpress/vhh6927-kit-google-e-instagram", descricao: "Duas placas para divulgar os dois canais." },
    ];
    let catalogo = catalogoFallback;
    try {
      const svc = base44.asServiceRole || base44;
      const page = await svc.entities.Produto.filter({ ativo: true }, { limit: 30 });
      const produtos = (Array.isArray(page) ? page : page?.items || [])
        .filter((p) => Number(p.preco) > 0)
        .filter((p) => /nfc|placa|google|instagram/i.test(p.nome || ""));
      if (produtos.length) {
        const appUrl = String(process.env.APP_URL || process.env.VITE_APP_URL || "https://anywhere-ready-web-lucianasilvier-droid.vercel.app").replace(/\/$/, "");
        catalogo = produtos.slice(0, 6).map((p) => ({
          nome: p.nome,
          preco: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.preco)),
          url: p.checkout_url || p.link_pagamento || (p.slug ? appUrl + "/loja/" + p.slug : appUrl + "/loja"),
          descricao: p.descricao_curta || p.descricao || "Produto NFC personalizado.",
        }));
      }
    } catch {
      // Mantém o catálogo público de contingência caso a listagem do banco falhe.
    }

    const result = await iaJSON(
      `${CONTEXT_TOOL}

${instrucoes}

Quem envia a mensagem (nós):
- Nome da nossa empresa: ${remetente.empresa}
${remetente.remetente ? `- Nome de quem assina: ${remetente.remetente}` : "- Não assine com nome de pessoa."}

Regras obrigatórias:
- Use os nomes reais acima. NUNCA escreva colchetes ou campos para preencher como "[Nome da Empresa]", "[Seu nome]" ou "[nome do cliente]".
- Personalize de verdade para este estabelecimento: cite o nome dele e pelo menos um detalhe concreto dos dados abaixo
  (bairro/cidade, categoria, nota e avaliações no Google, ausência de site ou observações). Evite texto genérico que serviria para qualquer empresa.
- A mensagem deve estar pronta para enviar, sem nenhuma edição.
- Na primeira mensagem, nunca inclua catálogo, preços, vídeo ou links; apenas peça autorização.
- Nunca diga que criou um site quando não houver URL de prévia disponível.
- Se quem envia for representante comercial, assine com o primeiro nome dele; caso contrário, identifique apenas a empresa.

Contexto de materiais disponíveis:
- Prévia real do site: ${previewSiteUrl || "não disponível"}
- Vídeo demonstrativo: ${videoDemoUrl || "ainda não configurado no servidor"}
- Catálogo de produtos e preços: ${JSON.stringify(catalogo)}

Dados do estabelecimento que vai receber a mensagem:
${leadBrief(lead)}

${lead.ai_abordagem ? `Sugestão de abordagem já registrada: ${lead.ai_abordagem}` : ""}

Devolva {"mensagem": string}.`,
      '{"mensagem": string}',
      await iaValues(base44),
    );

    if (!result.ok) {
      setResponseStatus(400);
      throw Object.assign(new Error(result.error), { status: 400 });
    }
    let mensagemFinal = preencherPlaceholders(result.data?.mensagem, remetente, lead);
    if (data.tipo === "proposta") {
      const materiais = [
        "🌐 Conheça o Google NFC CONNECT:",
        "https://google-nfc-connect.vercel.app",
      ];
      if (previewSiteUrl && !lead.site) materiais.push("🌐 Prévia do site preparado para " + lead.empresa + ":\n" + previewSiteUrl);
      if (videoDemoUrl) materiais.push("🎥 Assista ao vídeo demonstrativo das placas NFC:\n" + videoDemoUrl);
      materiais.push("🛍️ CATÁLOGO NFC");
      for (const item of catalogo) materiais.push("\n" + item.nome + " — " + item.preco + "\n" + item.descricao + "\n" + item.url);
      mensagemFinal = (mensagemFinal + "\n\n" + materiais.join("\n")).slice(0, 1450);
    }
    return { ok: true, mensagem: mensagemFinal };
  });


export const summarizeHistoryFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ leadId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);
    const page = await base44.entities.LeadInteraction.filter(
      { lead_id: data.leadId },
      { sort: "-created_date", limit: 40 },
    );
    const interacoes = Array.isArray(page) ? page : page?.items || [];

    const historico = interacoes
      .slice()
      .reverse()
      .map((i) => `[${i.tipo}] ${i.mensagem || ""}`)
      .join("\n");

    const result = await iaJSON(
      `${CONTEXT_TOOL}

Resuma o histórico de atendimento abaixo em até 5 linhas objetivas e sugira a próxima ação comercial.
Devolva {"resumo": string, "proxima_acao": string}.

Empresa: ${lead.empresa}
Histórico:
${historico || "sem interações registradas"}`,
      '{"resumo": string, "proxima_acao": string}',
      await iaValues(base44),
    );

    if (!result.ok) {
      setResponseStatus(400);
      throw Object.assign(new Error(result.error), { status: 400 });
    }

    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa: lead.empresa,
      tipo: "ia",
      mensagem: result.data?.resumo || "",
      autor: "IA Roq",
      detalhe: `Próxima ação sugerida: ${result.data?.proxima_acao || ""}`,
    });

    return { ok: true, ...result.data };
  });

/* -------------------------------- WhatsApp ------------------------------- */

export const sendWhatsappFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      leadId: z.string().min(1),
      mensagem: z.string().trim().min(5).max(1500),
      tipo: z.enum(["autorizacao", "proposta", "followup"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);

    if (lead.bloqueado || lead.consentimento === "recusado" || lead.consentimento === "revogado") {
      setResponseStatus(409);
      throw Object.assign(
        new Error("Este contato recusou ou revogou a autorização. Nenhuma mensagem será enviada."),
        { status: 409 },
      );
    }

    if (data.tipo !== "autorizacao" && lead.consentimento !== "autorizado") {
      setResponseStatus(409);
      throw Object.assign(
        new Error("É necessário ter autorização registrada antes de enviar material promocional."),
        { status: 409 },
      );
    }

    const credsWhats = await resolveCredentials(base44.asServiceRole, "whatsapp");
    const envio = await sendWhatsappText({ to: lead.telefone, body: data.mensagem }, credsWhats.values);
    if (!envio.ok) {
      setResponseStatus(400);
      throw Object.assign(new Error(envio.error), { status: 400 });
    }

    const agora = new Date().toISOString();
    const patch = { ultimo_contato_em: agora };
    if (data.tipo === "autorizacao") {
      patch.consentimento = "solicitado";
      patch.consent_solicitado_em = agora;
      patch.consent_mensagem = data.mensagem;
      patch.consent_origem = "WhatsApp Business Platform";
      patch.etapa = "aguardando_autorizacao";
    } else if (data.tipo === "proposta") {
      patch.etapa = "proposta_enviada";
    }
    await base44.entities.Lead.update(lead.id, patch);

    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa: lead.empresa,
      tipo: "whatsapp_enviado",
      mensagem: data.mensagem,
      autor: context.user.email,
      detalhe: `Enviado via WhatsApp Business API (${data.tipo}).`,
    });

    return { ok: true, messageId: envio.messageId };
  });

export const registerConsentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      leadId: z.string().min(1),
      status: z.enum(["autorizado", "recusado", "revogado"]),
      resposta: z.string().trim().max(1000).optional().default(""),
      origem: z.string().trim().max(200).optional().default("Registro manual pelo operador"),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);
    const agora = new Date().toISOString();

    const patch = { consent_resposta: data.resposta, ultimo_contato_em: agora };
    if (data.status === "autorizado") {
      patch.consentimento = "autorizado";
      patch.consent_autorizado_em = agora;
      patch.consent_origem = data.origem;
      patch.etapa = "contato_autorizado";
    } else {
      patch.consentimento = data.status;
      patch.consent_revogado_em = agora;
      patch.bloqueado = true;
      patch.etapa = data.status === "recusado" ? "recusou_contato" : "bloqueado";
    }

    await base44.entities.Lead.update(lead.id, patch);
    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa: lead.empresa,
      tipo: "sistema",
      mensagem:
        data.status === "autorizado"
          ? "Autorização registrada para receber informações comerciais."
          : `Contato bloqueado (${data.status}). ${data.resposta}`.trim(),
      autor: context.user.email,
      detalhe: data.origem,
    });

    return { ok: true };
  });

/* ------------------------- Integrações e configuração --------------------- */

export const integrationStatusFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user?.role !== "admin") return { items: [] };
    const base44 = context.getBase44();
    const page = await base44.entities.Integracao.list({ limit: 50 });
    const registros = Array.isArray(page) ? page : page?.items || [];

    const defs = [
      { tipo: "google_places", nome: "Google Maps / Places", campos: ["GOOGLE_MAPS_API_KEY"] },
      { tipo: "groq", nome: "API Roq", campos: ["GROQ_API_KEY"] },
      { tipo: "claude", nome: "Claude AI", campos: ["ANTHROPIC_API_KEY"] },
      { tipo: "openai", nome: "ChatGPT (OpenAI)", campos: ["OPENAI_API_KEY"] },
      {
        tipo: "whatsapp",
        nome: "WhatsApp Business",
        campos: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"],
      },
    ];

    const items = [];
    for (const def of defs) {
      const reg = registros.find((r) => r.tipo === def.tipo) || null;
      const { origem } = await resolveCredentials(base44, def.tipo);
      const configurado = def.campos
        .filter((campo) => campo !== "WHATSAPP_VERIFY_TOKEN")
        .every((campo) => !!origem[campo]);
      items.push({
        tipo: def.tipo,
        nome: def.nome,
        campos: def.campos,
        origem,
        configurado,
        status: configurado ? reg?.status || "aguardando_configuracao" : "aguardando_configuracao",
        ultimo_teste: reg?.ultimo_teste || "",
        mensagem: configurado
          ? reg?.mensagem || "Chaves cadastradas. Execute um teste para confirmar a conexão."
          : "Aguardando configuração: cadastre a chave abaixo para ativar esta API.",
      });
    }

    return { items };
  });

/** Salva as chaves de API digitadas no painel. Os valores nunca voltam ao navegador. */
export const saveIntegrationKeysFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      tipo: z.enum(["google_places", "groq", "claude", "openai", "whatsapp"]),
      valores: z.record(z.string(), z.string().max(600)),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const mapa = CREDENTIAL_KEYS[data.tipo] || {};

    const page = await base44.entities.Integracao.filter({ tipo: data.tipo }, { limit: 1 });
    const registros = Array.isArray(page) ? page : page?.items || [];
    const atual = registros[0] || null;
    const config = { ...(atual?.config || {}) };

    let alterados = 0;
    for (const campo of Object.keys(mapa)) {
      if (!(campo in data.valores)) continue;
      const valor = String(data.valores[campo] || "").trim();
      if (valor) {
        config[mapa[campo]] = valor;
        alterados += 1;
      } else if (config[mapa[campo]]) {
        delete config[mapa[campo]];
        alterados += 1;
      }
    }

    if (!alterados) return { ok: true, alterados: 0 };

    const patch = {
      tipo: data.tipo,
      nome:
        data.tipo === "google_places"
          ? "Google Maps / Places"
          : data.tipo === "groq"
            ? "API Roq"
            : data.tipo === "claude"
              ? "Claude AI"
              : data.tipo === "openai"
                ? "ChatGPT (OpenAI)"
                : "WhatsApp Business",
      config,
      status: "aguardando_configuracao",
      mensagem: "Chaves salvas no painel. Execute um teste para confirmar a conexão.",
      ativo: true,
    };

    if (atual) await base44.entities.Integracao.update(atual.id, patch);
    else await base44.entities.Integracao.create(patch);

    await base44.entities.AtividadeLog.create({
      acao: "Chaves de API atualizadas no painel",
      entidade: "Integracao",
      registro_id: atual?.id || "",
      detalhe: `${data.tipo} · ${alterados} campo(s) alterado(s)`,
      autor_email: context.user.email,
    });

    return { ok: true, alterados };
  });

export const testIntegrationFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ tipo: z.enum(["google_places", "groq", "claude", "openai", "whatsapp"]) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44();
    const creds = await resolveCredentials(base44, data.tipo);
    const resultado = await testIntegration(data.tipo, creds.values);
    const agora = new Date().toISOString();

    const page = await base44.entities.Integracao.filter({ tipo: data.tipo }, { limit: 1 });
    const registros = Array.isArray(page) ? page : page?.items || [];
    const patch = {
      tipo: data.tipo,
      status: resultado.status,
      ultimo_teste: agora,
      mensagem: resultado.mensagem,
      ativo: resultado.status === "conectado",
    };

    if (registros[0]) await base44.entities.Integracao.update(registros[0].id, patch);
    else
      await base44.entities.Integracao.create({
        ...patch,
        nome:
          data.tipo === "google_places"
            ? "Google Maps / Places"
            : data.tipo === "groq"
              ? "API Roq"
              : data.tipo === "claude"
                ? "Claude AI"
                : data.tipo === "openai"
                  ? "ChatGPT (OpenAI)"
                  : "WhatsApp Business",
      });

    await base44.entities.AtividadeLog.create({
      acao: `Teste de integração: ${data.tipo}`,
      entidade: "Integracao",
      detalhe: `${resultado.status} · ${resultado.mensagem}`,
      autor_email: context.user.email,
    });

    return { ...resultado, ultimo_teste: agora };
  });

export const chatgptAdminFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      mensagem: z.string().trim().min(1).max(3000),
      historico: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(3000),
      })).max(12).optional().default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44();
    const credenciais = await resolveCredentials(base44, "openai");
    const key = credenciais.values.openai_api_key;
    if (!key) {
      setResponseStatus(503);
      throw Object.assign(new Error("ChatGPT ainda não está configurado. Cadastre a chave OpenAI em Painel > Integrações e APIs."), { status: 503 });
    }

    const historico = data.historico.slice(-10).map((item) => ({
      role: item.role,
      content: item.content,
    }));
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `Você é o assistente administrativo interno do sistema Google NFC Connect. Ajude o administrador a entender e operar o CRM, representantes, funil, sites de demonstração, integrações e configurações. Responda em português do Brasil, com instruções claras e simples. Não afirme que executou alterações, publicou sites, enviou mensagens ou acessou serviços externos: você apenas orienta e analisa informações fornecidas nesta conversa. Não peça nem revele chaves, senhas, tokens ou dados pessoais desnecessários. Quando uma tarefa exigir alteração técnica, explique o que deve ser verificado no GitHub/Vercel e deixe claro que este chat interno não executa deploys nem altera código por conta própria.`,
          },
          ...historico,
          { role: "user", content: data.mensagem },
        ],
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResponseStatus(response.status === 401 ? 502 : response.status);
      throw Object.assign(new Error(payload?.error?.message || `A API OpenAI respondeu ${response.status}.`), { status: response.status === 401 ? 502 : response.status });
    }
    const resposta = payload.choices?.[0]?.message?.content?.trim();
    if (!resposta) {
      setResponseStatus(502);
      throw Object.assign(new Error("O ChatGPT não retornou uma resposta de texto."), { status: 502 });
    }
    return { resposta, modelo: "gpt-4.1-mini" };
  });

/* ------------------------------ Administração ---------------------------- */

export const setUserFuncaoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      email: z.string().trim().email(),
      funcao: z.enum(["administrador", "operador", "atendente", "cliente"]),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const page = await base44.entities.User.filter({ email: data.email }, { limit: 1 });
    const usuarios = Array.isArray(page) ? page : page?.items || [];
    if (!usuarios[0]) {
      setResponseStatus(404);
      throw Object.assign(new Error("Usuário não encontrado."), { status: 404 });
    }
    await base44.entities.User.update(usuarios[0].id, { funcao: data.funcao });
    await base44.entities.AtividadeLog.create({
      acao: "Função de usuário atualizada",
      entidade: "User",
      registro_id: usuarios[0].id,
      detalhe: `${data.email} → ${data.funcao}`,
      autor_email: context.user.email,
    });
    return { ok: true };
  });

export const deleteClientDataFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ clienteId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const cliente = await base44.entities.Cliente.get(data.clienteId);
    const email = cliente.email || cliente.user_email;

    const contadores = {};
    if (email) {
      contadores.atualizacoes = await base44.entities.ServicoAtualizacao.deleteMany({
        cliente_email: email,
      });
      contadores.relatorios = await base44.entities.Relatorio.deleteMany({ cliente_email: email });
      contadores.servicos = await base44.entities.ServicoCliente.deleteMany({ cliente_email: email });
      contadores.pedidos = await base44.entities.Pedido.deleteMany({ cliente_email: email });
      contadores.placas = await base44.entities.PlacaNFC.deleteMany({ cliente_email: email });
    }
    await base44.entities.Cliente.delete(data.clienteId);

    await base44.entities.AtividadeLog.create({
      acao: "Exclusão de dados do cliente (LGPD)",
      entidade: "Cliente",
      registro_id: data.clienteId,
      detalhe: `Dados pessoais de ${cliente.nome} (${email || "sem e-mail"}) excluídos a pedido.`,
      autor_email: context.user.email,
    });

    return { ok: true };
  });

export const secretsOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  return {
    google_places: !!readSecret("GOOGLE_MAPS_API_KEY"),
    groq: !!readSecret("GROQ_API_KEY"),
    claude: !!readSecret("ANTHROPIC_API_KEY"),
    openai: !!readSecret("OPENAI_API_KEY"),
    whatsapp: !!readSecret("WHATSAPP_ACCESS_TOKEN") && !!readSecret("WHATSAPP_PHONE_NUMBER_ID"),
  };
});