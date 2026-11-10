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
