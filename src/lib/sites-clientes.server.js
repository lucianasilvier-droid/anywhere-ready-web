// Sites de demonstração para empresas prospectadas no CRM. O conteúdo é preparado
// no Claude gratuito pelo navegador, validado no servidor e guardado em SiteCliente.
import { listar } from "@/lib/representantes.server";
import { slugify } from "@/lib/landing-representante.server";

export const TEMAS = ["esmeralda", "oceano", "terracota", "vinho", "grafite", "solar", "lavanda", "floresta"];
export const ICONES = [
  "estrela", "coracao", "tesoura", "dente", "carro", "comida", "cafe", "casa", "ferramenta",
  "saude", "beleza", "pet", "escudo", "relogio", "folha", "presente", "livro", "musica", "raio", "check",
];

export function erro(mensagem, status = 400) {
  return Object.assign(new Error(mensagem), { status });
}

const digitos = (v) => String(v || "").replace(/\D/g, "");

/** Número no formato do wa.me (com DDI 55). */
export function whatsappDe(telefone) {
  let n = digitos(telefone);
  if (!n) return "";
  if (n.length <= 11) n = `55${n}`;
  return n;
}

/** Monta as instruções para usar o Claude gratuito, sem chave ou chamada de API. */
export function promptParaClaudeGratuito(lead, orientacoes = "") {
  return `Crie o conteúdo completo de um site de demonstração profissional para esta empresa. Não use API, não tente executar ferramentas e não publique nada. Responda somente com um objeto JSON válido, sem Markdown e sem blocos de código.

DADOS DA EMPRESA:
${briefing(lead, orientacoes)}

REGRAS:
- Escreva em português do Brasil, com linguagem clara, acolhedora e comercial, adequada ao ramo.
- Não invente preços, prêmios, anos de experiência, clientes, certificações, depoimentos ou horários.
- Use somente dados reais da empresa. Não invente telefone, endereço ou redes sociais.
- Crie de 3 a 6 serviços, 3 a 4 diferenciais e 3 a 5 perguntas frequentes.
- O campo tema deve ser exatamente um destes: esmeralda, oceano, terracota, vinho, grafite, solar, lavanda, floresta.
- Cada ícone de serviço deve ser exatamente um destes: estrela, coracao, tesoura, dente, carro, comida, cafe, casa, ferramenta, saude, beleza, pet, escudo, relogio, folha, presente, livro, musica, raio, check.
- Respeite os limites: slogan 90 caracteres; titulo 120; subtitulo 260; sobre 1400; nome de serviço 60; descrição de serviço 220; chamada_agendamento 180; seo_descricao 160.
- O JSON deve conter exatamente esta estrutura:
{
  "slogan": "frase curta",
  "titulo": "título principal",
  "subtitulo": "frase de apoio",
  "sobre": "apresentação da empresa em dois parágrafos",
  "servicos": [{"nome":"Serviço","descricao":"Descrição objetiva","icone":"check"}],
  "diferenciais": [{"titulo":"Diferencial","texto":"Explicação breve"}],
  "perguntas": [{"pergunta":"Pergunta frequente?","resposta":"Resposta objetiva"}],
  "chamada_agendamento": "Convite para contato pelo WhatsApp",
  "tema": "oceano",
  "seo_descricao": "Descrição para mecanismos de busca"
}
Entregue apenas o JSON, sem comentários antes ou depois.`;
}

function briefing(lead, orientacoes) {
  return [
    `Nome da empresa: ${lead.empresa || "não informado"}`,
    `Ramo/categoria: ${lead.categoria || "não informado"}`,
    `Endereço: ${lead.endereco || "não informado"}`,
    `Cidade: ${lead.cidade || "não informada"}${lead.bairro ? `, bairro ${lead.bairro}` : ""}${lead.estado ? ` - ${lead.estado}` : ""}`,
    `Nota no Google: ${lead.nota_google ?? "sem dados"} (${lead.total_avaliacoes ?? 0} avaliações)`,
    lead.ai_resumo ? `Análise comercial já feita: ${lead.ai_resumo}` : "",
    lead.observacoes ? `Observações do CRM: ${lead.observacoes}` : "",
    orientacoes ? `Pedidos do operador para este site: ${orientacoes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const textoSeguro = (valor, limite = 220) => String(valor ?? "").trim().slice(0, limite);

/** Gera conteúdo local a partir dos dados já cadastrados. Não chama IA externa nem inventa dados comerciais. */
export function gerarConteudoSiteAutomatico(lead, orientacoes = "") {
  const nome = textoSeguro(lead.empresa || "Nossa empresa", 120);
  const categoria = textoSeguro(lead.categoria || "", 100);
  const observacaoOperador = textoSeguro(orientacoes, 600);
  const local = [lead.bairro, lead.cidade, lead.estado].filter(Boolean).join(", ");
  const ramo = `${categoria} ${nome}`.toLowerCase();
  const restaurante = /restaurante|bar\\b|boteco|choperia|cervejaria|lanchonete|pizzaria|hamburgueria|cafeteria|café|padaria|doceria|sorveteria|churrascaria|pastelaria|rotisseria|cantina|bistrô|bistro|casa de sucos/.test(ramo);
  const tema = /beleza|barbearia|sal[aã]o|est[eé]tica|pet|veterin/.test(ramo) ? "terracota" : restaurante ? "vinho" : "oceano";
  const servicos = restaurante
    ? [
        { nome: "Cardápio e opções", descricao: "Consulte as opções disponíveis e tire suas dúvidas diretamente com a equipe.", icone: "comida" },
        { nome: "Atendimento", descricao: "Entre em contato para confirmar informações sobre produtos e atendimento.", icone: "check" },
        { nome: "Reservas", descricao: "Fale com a equipe pelo WhatsApp para consultar disponibilidade e fazer sua reserva.", icone: "relogio" },
      ]
    : [
        { nome: `Atendimento em ${categoria || "nossos serviços"}`, descricao: `Entre em contato com ${nome} para conhecer as opções de atendimento disponíveis.`, icone: "check" },
        { nome: "Informações e orientações", descricao: "Consulte informações sobre os serviços e esclareça suas dúvidas diretamente com a equipe.", icone: "estrela" },
        { nome: "Contato direto", descricao: "Use os canais de contato e a localização desta página para falar com a empresa.", icone: "coracao" },
      ];
  const itensCardapio = Array.isArray(lead.cardapio) ? lead.cardapio : Array.isArray(lead.menu) ? lead.menu : [];
  const cardapio = itensCardapio.slice(0, 80).map((item) => ({
    categoria: textoSeguro(item?.categoria || "", 60),
    nome: textoSeguro(item?.nome || item?.name || item?.produto || "", 100),
    descricao: textoSeguro(item?.descricao || item?.description || "", 240),
    preco: textoSeguro(item?.preco || item?.price || "", 40),
    imagem_url: /^https:\/\//i.test(String(item?.imagem_url || item?.image || "")) ? String(item.imagem_url || item.image) : "",
  })).filter((item) => item.nome);
  return {
    slogan: restaurante ? "Uma experiência para aproveitar" : `Conheça ${nome}` ,
    titulo: nome,
    subtitulo: [categoria, local].filter(Boolean).join(" · ") || "Conheça a empresa e fale diretamente com a equipe.",
    sobre: `${nome}${categoria ? ` atua no segmento de ${categoria}` : ""}${local ? ` e está localizada em ${local}` : ""}. Esta demonstração reúne as informações disponíveis no cadastro e facilita o contato com a empresa.\n\nPara confirmar serviços, disponibilidade, valores e horários, fale diretamente com a equipe pelos canais informados nesta página.`,
    servicos,
    diferenciais: [
      { titulo: "Contato direto", texto: "Fale com a empresa para confirmar informações e tirar dúvidas." },
      { titulo: "Localização", texto: local ? `Referência de atendimento: ${local}.` : "Consulte a localização e as formas de contato disponíveis." },
      { titulo: "Informações claras", texto: "Consulte os dados cadastrados e confirme detalhes diretamente com a equipe." },
    ],
    perguntas: [
      { pergunta: "Como posso entrar em contato?", resposta: "Use o botão de WhatsApp ou os dados de contato apresentados nesta página." },
      { pergunta: "Quais serviços ou opções estão disponíveis?", resposta: "Fale diretamente com a equipe para confirmar as opções disponíveis." },
      { pergunta: "Como confirmar valores e horários?", resposta: "Valores, disponibilidade e horários devem ser confirmados diretamente com a empresa." },
    ],
    chamada_agendamento: restaurante ? "Faça sua reserva ou consulte a disponibilidade diretamente pelo WhatsApp." : "Entre em contato para saber mais e consultar a disponibilidade.",
    tema,
    seo_descricao: `${nome}${categoria ? ` em ${categoria}` : ""}${local ? ` em ${local}` : ""}. Consulte informações e entre em contato diretamente com a empresa.`.slice(0, 160),
    tipo_negocio: restaurante ? "restaurante" : "servicos",
    observacao_operador: observacaoOperador,
    cardapio,
  };
}
/** O conteúdo é produzido no Claude gratuito pelo navegador e validado antes de salvar. */
export function validarConteudoSite(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.servicos) || d.servicos.length < 3 || !String(d.titulo || "").trim()) {
    throw erro("O JSON retornado pelo Claude está incompleto. Confira o conteúdo e tente novamente.", 422);
  }
  const txt = (v, max) => String(v || "").trim().slice(0, max);
  return {
    slogan: txt(d.slogan, 90),
    titulo: txt(d.titulo, 120),
    subtitulo: txt(d.subtitulo, 260),
    sobre: txt(d.sobre, 1400),
    servicos: d.servicos.slice(0, 6).map((item) => ({
      nome: txt(item.nome, 60),
      descricao: txt(item.descricao, 220),
      icone: ICONES.includes(item.icone) ? item.icone : "check",
    })),
    diferenciais: (Array.isArray(d.diferenciais) ? d.diferenciais : []).slice(0, 4).map((item) => ({
      titulo: txt(item.titulo, 60), texto: txt(item.texto, 180),
    })),
    perguntas: (Array.isArray(d.perguntas) ? d.perguntas : []).slice(0, 5).map((item) => ({
      pergunta: txt(item.pergunta, 140), resposta: txt(item.resposta, 320),
    })),
    chamada_agendamento: txt(d.chamada_agendamento, 180),
    tema: TEMAS.includes(d.tema) ? d.tema : "oceano",
    seo_descricao: txt(d.seo_descricao, 160),
    tipo_negocio: d.tipo_negocio === "restaurante" ? "restaurante" : "servicos",
    observacao_operador: txt(d.observacao_operador, 600),
    cardapio: (Array.isArray(d.cardapio) ? d.cardapio : []).slice(0, 80).map((item) => ({
      categoria: txt(item.categoria, 60), nome: txt(item.nome, 100), descricao: txt(item.descricao, 240),
      preco: txt(item.preco, 40), imagem_url: /^https:\/\//i.test(String(item.imagem_url || "")) ? String(item.imagem_url) : "",
    })).filter((item) => item.nome),
  };
}

const RESERVADOS = new Set(["admin", "api", "login", "site", "loja", "conta"]);

/** Endereço único para o site (ex.: "barbearia-do-ze-centro"). */
export async function slugUnico(base44, desejado, siteId) {
  let base = slugify(desejado) || "site";
  if (base.length < 3 || RESERVADOS.has(base)) base = `${base}-site`;
  for (let i = 0; i < 20; i += 1) {
    const candidato = i === 0 ? base : `${base}-${i + 1}`;
    const [existente] = await listar(base44, "SiteCliente", { slug: candidato }, 1);
    if (!existente || existente.id === siteId) return candidato;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function sitePorLead(base44, leadId) {
  const [site] = await listar(base44, "SiteCliente", { lead_id: leadId }, 1);
  return site || null;
}

/** Somente o que pode aparecer na página pública. */
export function sitePublico(site) {
  return {
    slug: site.slug,
    status: site.status,
    empresa: site.empresa,
    categoria: site.categoria || "",
    endereco: site.endereco || "",
    cidade: site.cidade || "",
    bairro: site.bairro || "",
    estado: site.estado || "",
    place_id: site.place_id || "",
    nota_google: site.nota_google ?? null,
    total_avaliacoes: site.total_avaliacoes ?? null,
    whatsapp: whatsappDe(site.whatsapp),
    telefone: site.telefone || "",
    instagram: site.instagram || "",
    horario: site.horario || "",
    conteudo: site.conteudo || {},
  };
}
