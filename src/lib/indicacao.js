// Guarda no navegador qual representante indicou o visitante (link /r/...),
// para que pedidos feitos na loja nos próximos 30 dias fiquem vinculados a ele.
const KEY = "nfc_connect_indicacao_v1";
const VALIDADE = 30 * 24 * 60 * 60 * 1000;

export const indicacao = {
  salvar(perfil) {
    if (typeof window === "undefined" || !perfil?.slug) return;
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ slug: perfil.slug, nome: perfil.nome, em: Date.now() }),
    );
  },
  ler() {
    if (typeof window === "undefined") return null;
    try {
      const item = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (!item?.slug || Date.now() - Number(item.em) > VALIDADE) return null;
      return item;
    } catch {
      return null;
    }
  },
};
