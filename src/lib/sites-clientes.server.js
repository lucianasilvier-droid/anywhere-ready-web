// Sites criados pelo agente Claude para empresas prospectadas no CRM que ainda não
// têm site. O conteúdo é gerado pela Anthropic (ANTHROPIC_API_KEY) e guardado na
// entidade SiteCliente; a página pública fica em /site/<endereço>.
import Anthropic from "@anthropic-ai/sdk";
import { listar } from "@/lib/representantes.server";
import { slugify } from "@/lib/landing-representante.server";

export const MODELO_CLAUDE = "claude-sonnet-5-5";

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

/** Pede ao Claude o conteúdo do site e devolve o objeto já validado. */
export async function gerarConteudoComClaude(lead, orientacoes = "", apiKey) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw erro("Claude AI ainda não está configurado. Cadastre a chave Anthropic em Painel > Integrações e APIs.", 503);
  const anthropic = new Anthropic({ apiKey: key });
  let resposta;
  try {
    resposta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 4000,
      system: `Você é o agente de criação de sites da Google NFC Connect. Cria sites de uma página para pequenos negócios locais no Brasil,
que serão apresentados ao dono da empresa como demonstração. O site tem mapa do Google e agendamento pelo WhatsApp.
Regras:
- Escreva em português do Brasil, com linguagem calorosa, clara e vendedora, adequada ao ramo.
- Não invente preços, prêmios, anos de experiência, número de clientes, nomes de pessoas, certificações ou horários.
- Não use depoimentos falsos. Fale dos serviços típicos do ramo de forma genérica e verdadeira.
- Use o nome da empresa e a cidade/bairro para soar local.
- Responda SEMPRE chamando a ferramenta publicar_site, sem texto antes ou depois.`,
      tools: [FERRAMENTA],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `Crie o site desta empresa:\n\n${briefing(lead, orientacoes)}` }],
    });
  } catch (e) {
    console.error("Falha ao gerar site com o Claude", e);
    throw erro("O agente Claude não conseguiu criar o site agora. Tente novamente em instantes.", 502);
  }

  const bloco = (resposta.content || []).find((c) => c.type === "tool_use");
  const d = bloco?.input;
  if (!d || !Array.isArray(d.servicos) || !d.titulo) {
    throw erro("O agente Claude devolveu um conteúdo incompleto. Tente gerar novamente.", 502);
  }
  const txt = (v, max) => String(v || "").trim().slice(0, max);
  return {
    slogan: txt(d.slogan, 90),
    titulo: txt(d.titulo, 120),
    subtitulo: txt(d.subtitulo, 260),
    sobre: txt(d.sobre, 1400),
    servicos: d.servicos.slice(0, 6).map((s) => ({
      nome: txt(s.nome, 60),
      descricao: txt(s.descricao, 220),
      icone: ICONES.includes(s.icone) ? s.icone : "check",
    })),
    diferenciais: (d.diferenciais || []).slice(0, 4).map((x) => ({ titulo: txt(x.titulo, 60), texto: txt(x.texto, 180) })),
    perguntas: (d.perguntas || []).slice(0, 5).map((x) => ({ pergunta: txt(x.pergunta, 140), resposta: txt(x.resposta, 320) })),
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
