import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { BRAND_NAME } from "@/lib/site-content";
import { CATALOGO_INICIAL } from "@/lib/catalogo-inicial";
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
  const cliente = base44.asServiceRole || base44;
  // CRM: somente ROQ. Claude permanece como integração separada do painel,
  // mas não recebe análises, mensagens ou dados dos leads.
  const roq = await resolveCredentials(cliente, "groq");
  return roq.values;
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
1) Criação e configuração do Perfil da Empresa no Google Maps, somente quando o cadastro indicar que o perfil ainda não existe;
2) Administração e gestão mensal desse perfil, somente quando houver uma oportunidade concreta de melhoria identificável nos dados;
3) Placas NFC vendidas individualmente, que levam clientes ao link de avaliação do Google ou ao Instagram; nunca ofereça kits ou combos;
4) Criação de site com mapa do Google Maps e agendamento pelo WhatsApp, somente quando o campo Site estiver vazio ou não informado.
REGRA OBRIGATÓRIA SOBRE SITE: se o campo Site contiver qualquer endereço ou URL, considere que a empresa JÁ TEM SITE. Nesse caso, não sugira criar, fazer, montar ou oferecer um novo site, nem diga que a empresa está sem site. Só mencione o site existente se isso for relevante e com base nos dados fornecidos.
REGRA SOBRE GOOGLE MAPS: não diga que a empresa não tem Perfil da Empresa quando o lead foi localizado por um perfil/registro do Google Places. Não confunda necessidade de gestão com ausência de perfil.
Não trate nota alta nem grande quantidade de avaliações como problema: são sinais positivos, não motivos isolados para prioridade alta.
Não invente falhas, necessidades, dados ou oportunidades. Se os dados não comprovarem uma necessidade, diga que não há evidência suficiente.
Nunca prometa primeira posição no Google, quantidade garantida de avaliações ou resultados não comprováveis.
Respeite a LGPD e as regras do WhatsApp: nenhuma mensagem promocional sem autorização prévia do estabelecimento.
Escreva em português do Brasil, com tom profissional, cordial e direto.`;

function leadBrief(lead) {
  const site = String(lead.site || "").trim();
  return [
    `Empresa: ${lead.empresa || "não informada"}`,
    `Categoria: ${lead.categoria || "não informada"}`,
    `Cidade: ${lead.cidade || "não informada"}${lead.bairro ? `, bairro ${lead.bairro}` : ""}`,
    `Telefone: ${lead.telefone || "não informado"}`,
    `Site cadastrado: ${site || "NÃO INFORMADO"}`,
    `Status do site: ${site ? "JÁ POSSUI SITE — PROIBIDO sugerir criação de site" : "SEM SITE INFORMADO — avaliar se criação de site faz sentido"}`,
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
  let perfilUrl = "";
  try {
    const rep = await base44.representante();
    remetente = String(rep?.nome || "").trim();
    const slug = String(rep?.pagina_slug || "").trim();
    if (slug) {
      const appUrl = String(
        process.env.APP_URL || process.env.VITE_APP_URL || "https://google-nfc-connect.vercel.app",
      ).replace(/\/$/, "");
      perfilUrl = `${appUrl}/r/${encodeURIComponent(slug)}`;
    }
  } catch {
    remetente = "";
    perfilUrl = "";
  }
  if (!remetente) remetente = String(context.user?.full_name || "").trim();
  return {
    empresa: empresa || BRAND_NAME,
    remetente: remetente.split(/\s+/)[0] || "",
    perfilUrl,
  };
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



// Reserva local sem custo: mantém análise e rascunhos disponíveis quando os provedores
// externos de IA estiverem indisponíveis. Usa somente os dados já cadastrados no lead.
function analiseLocal(lead) {
  const site = String(lead.site || "").trim();
  const semSite = !site;
  const avaliacoes = Number(lead.total_avaliacoes || 0);
  const oportunidades = [];
  if (semSite) oportunidades.push("Criação de site: não há endereço de site informado no cadastro; confirmar essa informação com o estabelecimento antes de apresentar a solução.");
  else oportunidades.push("Site existente: o cadastro já informa um endereço de site; não há motivo para oferecer criação de outro site.");
  oportunidades.push("Placa NFC individual: pode facilitar o acesso dos clientes ao link de avaliação do Google; confirmar se o estabelecimento já utiliza esse recurso.");
  if (lead.place_id) oportunidades.push("Perfil no Google Maps localizado: avaliar a gestão somente se forem identificados pontos concretos de melhoria; não oferecer criação de perfil como se não existisse.");
  const prioridade = semSite ? "alta" : (lead.servico_interesse || lead.observacoes ? "media" : "baixa");
  return {
    resumo: semSite
      ? "O cadastro não informa um site para este estabelecimento. Vale confirmar essa informação e, se realmente não houver site, avaliar uma solução simples para apresentar serviços, localização e contato."
      : "O cadastro já contém um endereço de site. Portanto, criação de site não é uma oportunidade indicada; a conversa pode considerar a placa NFC individual e outras necessidades que sejam confirmadas pelo estabelecimento.",
    oportunidades: oportunidades.join(" "),
    abordagem: "Iniciar com uma observação verdadeira sobre o segmento ou a localização do estabelecimento. Perguntar se pode apresentar uma solução simples, sem pressão e sem enviar material antes da autorização.",
    proposta: semSite
      ? "Confirmar primeiro se a empresa realmente não possui site. Se não possuir, apresentar a opção de criação de site; em paralelo, explicar a placa NFC individual e confirmar interesse antes de enviar materiais."
      : "Não oferecer criação de site, pois já existe um endereço cadastrado. Apresentar a placa NFC individual apenas como possibilidade, confirmando se o estabelecimento já usa uma e se deseja conhecer a solução.",
    prioridade,
  };
}

function mensagemLocal(tipo, lead, remetente, previewSiteUrl) {
  const nome = lead.empresa || "seu estabelecimento";
  const detalhe = [lead.categoria, lead.bairro, lead.cidade].filter(Boolean).join(", ");
  if (tipo === "proposta") {
    return `Olá! Conforme nossa conversa e sua autorização, separei uma apresentação para ${nome}. A placa NFC facilita o acesso dos clientes às avaliações no Google, tornando esse processo mais simples no atendimento. Também podemos conversar sobre uma presença digital mais completa, caso faça sentido para o estabelecimento. Vou deixar os materiais e opções abaixo para você conhecer.\n\n${remetente.empresa}`;
  }
  if (tipo === "followup") {
    return `Olá! Tudo bem? Estou retomando nosso contato sobre a solução de placa NFC para ${nome}${detalhe ? ` (${detalhe})` : ""}. Se ainda tiver interesse, posso esclarecer dúvidas e ajudar a escolher a opção mais adequada, sem compromisso.\n\n${remetente.remetente || remetente.empresa}`;
  }
  if (tipo === "resposta_avaliacao") {
    return `Agradecemos muito por compartilhar sua avaliação, ${nome}! Ficamos felizes com seu retorno e esperamos receber você novamente. Conte sempre conosco!`;
  }
  return "";
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

    let result = await iaJSON(
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
    if (!result.ok) result = { ok: true, data: analiseLocal(lead) };

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
    // Prioriza os produtos cadastrados. Se o banco estiver vazio ou incompleto,
    // completa com os produtos unitários e links de pagamento já conferidos.
    // Nunca usa preço zero, kit ou combo como oferta.
    let catalogo = [];
    try {
      const svc = base44.asServiceRole || base44;
      const page = await svc.entities.Produto.filter({ ativo: true }, { limit: 30 });
      const cadastrados = Array.isArray(page) ? page : page?.items || [];
      const porSlug = new Map(cadastrados.map((p) => [String(p.slug || p.id || "").trim(), p]));
      const combinados = [...cadastrados];
      for (const fallback of CATALOGO_INICIAL) {
        const chave = String(fallback.slug || fallback.id || "").trim();
        if (chave && !porSlug.has(chave)) combinados.push(fallback);
      }
      const appUrl = String(process.env.APP_URL || process.env.VITE_APP_URL || "https://google-nfc-connect.vercel.app").replace(/\/$/, "");
      catalogo = combinados
        .filter((p) => !/kit|combo|conjunto/i.test(String(p.nome || "")))
        .filter((p) => /nfc|placa|google|instagram/i.test(String(p.nome || "")))
        .map((p) => ({ produto: p, preco: Number(p.preco) }))
        .filter(({ preco }) => Number.isFinite(preco) && preco > 0)
        .slice(0, 6)
        .map(({ produto: p, preco }) => ({
          nome: p.nome,
          preco: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preco),
          url: p.checkout_url || p.link_pagamento || (p.slug ? appUrl + "/loja/" + p.slug : appUrl + "/loja"),
          descricao: p.descricao_curta || p.descricao || "Placa NFC personalizada.",
        }));
    } catch {
      // Mesmo sem leitura do banco, os links e preços fixos confirmados permanecem disponíveis.
      catalogo = CATALOGO_INICIAL
        .filter((p) => !/kit|combo|conjunto/i.test(String(p.nome || "")))
        .filter((p) => /nfc|placa|google|instagram/i.test(String(p.nome || "")))
        .filter((p) => Number.isFinite(Number(p.preco)) && Number(p.preco) > 0)
        .map((p) => ({
          nome: p.nome,
          preco: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.preco)),
          url: p.checkout_url,
          descricao: p.descricao_curta || p.descricao || "Placa NFC personalizada.",
        }));
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
- Na primeira mensagem, nunca inclua catálogo, preços, vídeo ou links comerciais; apenas peça autorização.
- Nunca diga que criou um site quando não houver URL de prévia disponível.
- Se quem envia for representante comercial, assine com o primeiro nome dele; caso contrário, identifique apenas a empresa.
- Não inclua link na mensagem gerada: o sistema acrescentará automaticamente o link do perfil público do representante logo abaixo da assinatura.

Contexto de materiais disponíveis:
- Prévia real do site: ${previewSiteUrl || "não disponível"}
- Vídeo demonstrativo: ${videoDemoUrl || "ainda não configurado no servidor"}
- Catálogo de produtos e preços confirmados: ${catalogo.length ? JSON.stringify(catalogo) : "indisponível no cadastro; não informe preços, kits ou links de produtos"}

Dados do estabelecimento que vai receber a mensagem:
${leadBrief(lead)}

${lead.ai_abordagem ? `Sugestão de abordagem já registrada: ${lead.ai_abordagem}` : ""}

Devolva {"mensagem": string}.`,
      '{"mensagem": string}',
      await iaValues(base44),
    );

    // A primeira mensagem de autorização precisa continuar disponível mesmo
    // quando a IA externa estiver indisponível. Este texto é montado com dados
    // já cadastrados no lead e não depende de Groq, Claude ou outra API.
    let mensagemFinal;
    if (result.ok) {
      mensagemFinal = preencherPlaceholders(result.data?.mensagem, remetente, lead);
    } else if (data.tipo === "autorizacao") {
      const detalhes = [
        lead.categoria ? `do segmento de ${lead.categoria}` : "",
        lead.bairro ? `no bairro ${lead.bairro}` : "",
        lead.cidade ? `em ${lead.cidade}` : "",
        typeof lead.nota_google === "number"
          ? `com nota ${lead.nota_google.toLocaleString("pt-BR")} no Google e ${Number(lead.total_avaliacoes || 0).toLocaleString("pt-BR")} avaliações`
          : "",
      ].filter(Boolean).join(", ");
      mensagemFinal = [
        `Olá! Tudo bem? Aqui é da ${remetente.empresa}.`,
        `Encontrei o perfil da ${lead.empresa || "empresa"} no Google${detalhes ? ` (${detalhes})` : ""} e gostaria de apresentar uma ideia para facilitar o acesso dos clientes às avaliações por meio de uma placa NFC.`,
        "Posso enviar uma breve apresentação, sem compromisso? Se preferirem não receber esse tipo de mensagem, é só me avisar.",
        remetente.remetente ? ` ${remetente.remetente}` : "",
      ].join("\n\n").trim();
    } else {
      mensagemFinal = mensagemLocal(data.tipo, lead, remetente, previewSiteUrl);
      if (!mensagemFinal) {
        setResponseStatus(400);
        throw Object.assign(new Error(result.error), { status: 400 });
      }
    }
    if (data.tipo === "proposta") {
      const materiais = [
        "🌐 Conheça o Google NFC CONNECT:",
        "https://google-nfc-connect.vercel.app",
      ];
      if (previewSiteUrl && !lead.site) materiais.push("🌐 Prévia do site preparado para " + lead.empresa + ":\n" + previewSiteUrl);
      if (videoDemoUrl) materiais.push("🎥 Assista ao vídeo demonstrativo das placas NFC:\n" + videoDemoUrl);
      if (catalogo.length) {
        materiais.push("🛍️ CATÁLOGO NFC");
        for (const item of catalogo) materiais.push("\n" + item.nome + " — " + item.preco + "\n" + item.descricao + "\n" + item.url);
      }
      mensagemFinal = (mensagemFinal + "\n\n" + materiais.join("\n")).slice(0, 1450);
    }
    if (data.tipo === "autorizacao" && remetente.perfilUrl) {
      mensagemFinal = `${String(mensagemFinal || "").trim()}\n${remetente.perfilUrl}`.trim();
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
      patch.etapa = "autorizacao_recebida";
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

    const historico = data.historico.slice(-10).map((item) =>
      `${item.role === "assistant" ? "Assistente" : "Administrador"}: ${item.content}`,
    );
    const contexto = [
      ...historico,
      `Administrador: ${data.mensagem}`,
    ].join("\n\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.5",
        reasoning: { effort: "none" },
        max_output_tokens: 1200,
        instructions: `Você é o assistente administrativo interno do sistema Google NFC Connect. Ajude o administrador a entender e operar o CRM, representantes, funil, sites de demonstração, integrações e configurações. Responda em português do Brasil, com instruções claras e simples. Não afirme que executou alterações, publicou sites, enviou mensagens ou acessou serviços externos: você apenas orienta e analisa informações fornecidas nesta conversa. Não peça nem revele chaves, senhas, tokens ou dados pessoais desnecessários. Quando uma tarefa exigir alteração técnica, explique o que deve ser verificado no GitHub/Vercel e deixe claro que este chat interno não executa deploys nem altera código por conta própria.`,
        input: contexto,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResponseStatus(response.status === 401 ? 502 : response.status);
      throw Object.assign(new Error(payload?.error?.message || `A API OpenAI respondeu ${response.status}.`), { status: response.status === 401 ? 502 : response.status });
    }
    const resposta = (payload.output || [])
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === "output_text")
      .map((part) => part.text || "")
      .join("")
      .trim();
    if (!resposta) {
      setResponseStatus(502);
      throw Object.assign(new Error("O ChatGPT não retornou uma resposta de texto."), { status: 502 });
    }
    return { resposta, modelo: "gpt-5.5" };
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