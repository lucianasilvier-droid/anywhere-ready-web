const KEY = "nfc_connect_cart_v1";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("nfc-cart-change"));
}

export const cart = {
  get: read,
  count: () => read().reduce((sum, i) => sum + (i.quantidade || 0), 0),
  subtotal: () => read().reduce((sum, i) => sum + (Number(i.preco) || 0) * (i.quantidade || 0), 0),
  add(produto, quantidade = 1) {
    const preco = Number(produto?.preco);
    if (!Number.isFinite(preco) || preco <= 0) {
      throw new Error("Este produto ainda não tem preço confirmado e não pode ser adicionado ao carrinho.");
    }
    const items = read();
    const existente = items.find((i) => i.produto_id === produto.id);
    if (existente) {
      existente.quantidade = Math.min(existente.quantidade + quantidade, 50);
    } else {
      items.push({
        produto_id: produto.id,
        nome: produto.nome,
        preco,
        imagem: produto.imagens?.[0] || "",
        quantidade,
      });
    }
    write(items);
    return items;
  },
  updateQty(produtoId, quantidade) {
    const items = read().map((i) =>
      i.produto_id === produtoId ? { ...i, quantidade: Math.max(1, Math.min(quantidade, 50)) } : i,
    );
    write(items);
    return items;
  },
  remove(produtoId) {
    const items = read().filter((i) => i.produto_id !== produtoId);
    write(items);
    return items;
  },
  clear() {
    write([]);
  },
  subscribe(callback) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("nfc-cart-change", callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener("nfc-cart-change", callback);
      window.removeEventListener("storage", callback);
    };
  },
};