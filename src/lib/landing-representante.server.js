// Página pública de cada representante comercial e fotos de perfil (armazenamento de arquivos).
import { getStore } from "@/lib/storage.server";
import { listar } from "@/lib/representantes.server";

const FOTOS = "representantes-fotos";
const fotos = () => getStore({ name: FOTOS, consistency: "strong" });

export const norm = (v) => String(v || "").trim().toLowerCase();

export function erro(mensagem, status = 400) {
  return Object.assign(new Error(mensagem), { status });
}

/** "João da Silva" → "joao-da-silva" */
export function slugify(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const RESERVADOS = new Set(["admin", "api", "login", "representante", "loja", "conta"]);

/** Garante um endereço único para a página do representante. */
export async function slugDisponivel(base44, desejado, repId) {
  const base = slugify(desejado);
  if (base.length < 3) throw erro("O endereço da página precisa ter pelo menos 3 letras ou números.");
  if (RESERVADOS.has(base)) throw erro("Este endereço é reservado. Escolha outro.");
  const usados = await listar(base44, "Representante", { pagina_slug: base }, 3);
  if (usados.some((r) => r.id !== repId)) throw erro("Este endereço já está em uso por outro representante.", 409);
  return base;
}

/** Encontra o representante ativo pelo endereço da página ou pelo código (REP-XXXX). */
export async function representantePorSlug(base44, slug) {
  const s = norm(slug);
  if (!s) return null;
  let [rep] = await listar(base44, "Representante", { pagina_slug: s }, 1);
  if (!rep) {
    const todos = await listar(base44, "Representante", { codigo: s.toUpperCase() }, 1);
    rep = todos[0];
  }
  if (!rep || rep.status !== "ativo" || rep.pagina_ativa === false) return null;
  return rep;
}

const digitos = (v) => String(v || "").replace(/\D/g, "");

export function whatsappDoRep(rep) {
  let n = digitos(rep.pagina_whatsapp || rep.telefone);
  if (!n) return "";
  if (n.length <= 11) n = `55${n}`;
  return n;
}

/** Somente o que pode aparecer publicamente na página. */
export function perfilPublico(rep) {
  return {
    codigo: rep.codigo || "",
    slug: rep.pagina_slug || rep.codigo || "",
    nome: rep.nome,
    titulo: rep.pagina_titulo || "Representante comercial",
    bio: rep.pagina_bio || "",
    cidade: rep.pagina_cidade || "",
    instagram: rep.pagina_instagram || "",
    whatsapp: whatsappDoRep(rep),
    foto: rep.pagina_foto ? `/api/representantes/foto?k=${encodeURIComponent(rep.pagina_foto)}` : "",
  };
}

/** Campos da página que o próprio representante edita. */
export function dadosDaPagina(rep) {
  return {
    ...perfilPublico(rep),
    pagina_slug: rep.pagina_slug || "",
    pagina_titulo: rep.pagina_titulo || "",
    pagina_bio: rep.pagina_bio || "",
    pagina_cidade: rep.pagina_cidade || "",
    pagina_instagram: rep.pagina_instagram || "",
    pagina_whatsapp: rep.pagina_whatsapp || rep.telefone || "",
    pagina_ativa: rep.pagina_ativa !== false,
    status: rep.status,
  };
}

const TIPOS_FOTO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Recebe a foto como data URL (já reduzida no navegador) e guarda no armazenamento. */
export async function salvarFoto(repId, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw erro("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 1_500_000) throw erro("A foto é muito grande. Envie uma imagem de até 1,5 MB.");
  const chave = `${repId}-${Date.now()}.${TIPOS_FOTO[m[1]]}`;
  await fotos().set(chave, bytes, { metadata: { contentType: m[1] } });
  return chave;
}

export async function removerFoto(chave) {
  if (chave) await fotos().delete(chave).catch(() => {});
}

export async function lerFoto(chave) {
  if (!/^[A-Za-z0-9]+-\d+\.(jpg|png|webp)$/.test(chave || "")) return null;
  return fotos().getWithMetadata(chave, { type: "arrayBuffer" });
}
