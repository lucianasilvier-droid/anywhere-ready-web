// Sites criados pelo agente Claude para empresas prospectadas no CRM que ainda não
// têm site. O conteúdo é gerado pela Anthropic (ANTHROPIC_API_KEY) e guardado na
// entidade SiteCliente; a página pública fica em /site/<endereço>.
import { listar } from "@/lib/representantes.server";
import { slugify } from "@/lib/landing-representante.server";

export const MODELO_CLAUDE = "claude-web-gratuito";

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

const FERRAMENTA = {
  name: "publicar_site",
  description: "Entrega o conteúdo completo do site da empresa, pronto para ser exibido.",
  input_schema: {
    type: "object",
    properties: {
      slogan: { type: "string", description: "Frase curta de destaque (até 8 palavras)." },
      titulo: { type: "string", description: "Título principal do topo do site (até 10 palavras)." },
      subtitulo: { type: "string", description: "Frase de apoio do topo (até 30 palavras)." },
      sobre: { type: "string", description: "Texto 'Sobre nós' com 2 parágrafos curtos separados por \\n\\n." },
      servicos: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            descricao: { type: "string", description: "Até 25 palavras." },
            icone: { type: "string", enum: ICONES },
          },
          required: ["nome", "descricao", "icone"],
        },
      },
      diferenciais: {
        type: "array",
        minItems: 3,
        maxItems: 4,
        items: {
          type: "object",
          properties: { titulo: { type: "string" }, texto: { type: "string", description: "Até 18 palavras." } },
          required: ["titulo", "texto"],
        },
      },
      perguntas: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: { pergunta: { type: "string" }, resposta: { type: "string", description: "Até 35 palavras." } },
          required: ["pergunta", "resposta"],
        },
      },
      chamada_agendamento: { type: "string", description: "Convite curto para agendar pelo WhatsApp (até 20 palavras)." },
      tema: { type: "string", enum: TEMAS, description: "Paleta de cores que combina com o ramo." },
      seo_descricao: { type: "string", description: "Descrição para o Google, até 155 caracteres." },
    },
    required: [
      "slogan", "titulo", "subtitulo", "sobre", "servicos", "diferenciais", "perguntas",
      "chamada_agendamento", "tema", "seo_descricao",
    ],
  },
};

export function promptParaClaudeGratuito(lead, orientacoes = "") {
  return `Crie o conteúdo completo de um site de demonstração profissional para esta empresa. Não use API, não tente executar ferramentas e não publique nada. Responda somente com um objeto JSON válido, sem Markdown e sem blocos de código.

DADOS DA EMPRESA:
${briefing(lead, orientacoes)}

REGRAS:
- Escreva em português do Brasil, com linguagem clara, acolhedora e comercial, adequada ao ramo.
- Não invente preços, prêmios, anos de experiência, clientes, certificações, depoimentos ou horários.
- Use os dados reais da empresa. Não invente telefone, endereço ou redes sociais.
- Crie de 3 a 6 serviços, 3 a 4 diferenciais e 3 a 5 perguntas frequentes.
- O campo tema deve ser exatamente um destes: esmeralda, oceano, terracota, vinho, grafite, solar, lavanda, floresta.
- Cada ícone de serviço deve ser exatamente um destes: estrela, coracao, tesoura, dente, carro, comida, cafe, casa, ferramenta, saude, beleza, pet, escudo, relogio, folha, presente, livro, musica, raio, check.
- Respeite os limites de tamanho: slogan 90 caracteres; titulo 120; subtitulo 260; sobre 1400; nome de serviço 60; descrição de serviço 220; chamada_agendamento 180; seo_descricao 160.
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
