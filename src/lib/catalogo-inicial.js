// Catálogo público de contingência. As placas são vendidas individualmente;
// não cadastrar nem exibir kits, combos ou conjuntos.
export const CATALOGO_INICIAL = [
  { id: "placa-instagram", slug: "placa-instagram", nome: "Placa NFC Instagram", preco: 55, descricao_curta: "Aproxime o celular e leve o cliente diretamente ao seu Instagram.", modelo: "acrilico", imagens: ["/images/site/display-instagram-acrilico-neon.webp"], ativo: true, checkout_url: "https://loja.infinitepay.io/bikercourierexpress/xpg6030-placas-nfc-instagram", checkout_label: "Comprar pela InfinitePay" },
  { id: "placa-google", slug: "placa-google", nome: "Placa Google NFC", preco: 55, descricao_curta: "Facilite o acesso dos clientes à avaliação do seu estabelecimento no Google.", modelo: "acrilico", imagens: ["/images/site/placa-nfc-avaliacao-google.webp"], ativo: true, checkout_url: "https://loja.infinitepay.io/bikercourierexpress/hhy2911-placa-google-nfc", checkout_label: "Comprar pela InfinitePay" },
  { id: "perfil-google-maps", slug: "perfil-google-maps", nome: "Empresa no Google Maps", descricao_curta: "Serviço de criação e configuração do Perfil da Empresa no Google.", modelo: "servico", imagens: ["/images/site/servico-google-maps.webp"], ativo: true, checkout_url: "https://wa.me/5511913290911?text=Quero%20informacoes%20sobre%20o%20servico%20de%20Perfil%20da%20Empresa%20no%20Google", checkout_label: "Consultar pelo WhatsApp" },
];

/** Completa cadastros incompletos com dados unitários previamente conferidos. */
export function completarProdutoComCatalogo(produto) {
  if (!produto) return null;
  const chaves = [produto.slug, produto.id].filter(Boolean).map((valor) => String(valor).trim());
  const fallback = CATALOGO_INICIAL.find((item) =>
    [item.slug, item.id].filter(Boolean).some((valor) => chaves.includes(String(valor)))
  );
  if (!fallback) return produto;
  const precoBanco = Number(produto.preco);
  return {
    ...fallback,
    ...produto,
    preco: Number.isFinite(precoBanco) && precoBanco > 0 ? precoBanco : fallback.preco,
    checkout_url: produto.checkout_url || produto.link_pagamento || fallback.checkout_url,
    checkout_label: produto.checkout_label || fallback.checkout_label,
    imagens: Array.isArray(produto.imagens) && produto.imagens.length ? produto.imagens : fallback.imagens,
  };
}

export function completarCatalogoComProdutos(produtos) {
  const lista = (Array.isArray(produtos) ? produtos : [])
    .filter((produto) => !/kit|combo|conjunto/i.test(String(produto?.nome || "")))
    .map(completarProdutoComCatalogo);
  const chaves = new Set(lista.flatMap((p) => [p.id, p.slug].filter(Boolean).map(String)));
  for (const fallback of CATALOGO_INICIAL) {
    if (!chaves.has(String(fallback.id)) && !chaves.has(String(fallback.slug))) lista.push(fallback);
  }
  return lista;
}
