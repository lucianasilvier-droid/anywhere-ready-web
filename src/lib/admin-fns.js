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
      autor: "IA (Groq)",
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
    }),
  )
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context);
    const base44 = context.getBase44();
    const lead = await base44.entities.Lead.get(data.leadId);

    const instrucoes = {
      autorizacao: `Escreva uma PRIMEIRA mensagem de WhatsApp pedindo AUTORIZAÇÃO para enviar informações comerciais.
Deve ser curta (máx. 60 palavras), educada, dizer quem somos, por que estamos entrando em contato e pedir um "sim" para seguir.
Não inclua oferta, preço nem material promocional: apenas o pedido de autorização.`,
      proposta: `Escreva uma proposta comercial curta para WhatsApp (máx. 120 palavras), apenas se houver autorização.
Foque em um dos quatro serviços, com benefícios concretos e um próximo passo claro. Não invente preços.`,
      followup: `Escreva uma mensagem de acompanhamento (máx. 60 palavras) para um contato que já autorizou o recebimento de informações,
retomando a conversa sem pressão e oferecendo ajuda.`,
      resposta_avaliacao: `Escreva uma sugestão de resposta pública a uma avaliação de cliente no Google (máx. 80 palavras),
agradecendo, sendo cordial e convidando o cliente a continuar o contato. Não prometa nada em nome da empresa.`,
    }[data.tipo];

    const remetente = await senderIdentity(context);

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
    return { ok: true, mensagem: preencherPlaceholders(result.data?.mensagem, remetente, lead) };
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
      autor: "IA (Groq)",
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
      { tipo: "groq", nome: "Groq (IA)", campos: ["GROQ_API_KEY"] },
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
      tipo: z.enum(["google_places", "groq", "whatsapp"]),
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
            ? "Groq (IA)"
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
  .validator(z.object({ tipo: z.enum(["google_places", "groq", "whatsapp"]) }))
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
              ? "Groq (IA)"
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
    whatsapp: !!readSecret("WHATSAPP_ACCESS_TOKEN") && !!readSecret("WHATSAPP_PHONE_NUMBER_ID"),
  };
});