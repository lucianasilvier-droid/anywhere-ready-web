// Catálogo canônico dos produtos físicos vendidos pela loja.
// Os valores e checkouts abaixo foram conferidos diretamente na loja InfinitePay em 12/11/2026.
// As definições canônicas corrigem cadastros antigos do banco que estejam sem preço ou com imagem/checkout incorretos.

export const CATALOGO_INICIAL = [
  {
    id: "kit-google-instagram",
    slug: "kit-google-instagram",
    nome: "Kit Google + Instagram",
    descricao_curta: "Duas placas NFC em acrílico: uma para receber avaliações no Google e outra para levar clientes ao Instagram.",
    descricao: "O conjunto acompanha as duas placas físicas em acrílico: Placa Google NFC para facilitar avaliações do estabelecimento e Placa NFC Instagram para direcionar clientes ao perfil da empresa. Após a compra, coletamos os dados do estabelecimento para configurar as placas antes da entrega.",
    preco: 95,
    modelo: "kit",
    imagens: ["/images/divulgacao/arte-2026-10-31-b.jpeg"],
    imagem_fit: "cover",
    itens_inclusos: ["1 Placa Google NFC", "1 Placa NFC Instagram", "Configuração dos links após a compra"],
    ativo: true,
    destaque: true,
    checkout_url: "https://loja.infinitepay.io/bikercourierexpress/vhh6927-kit-google-e-instagram",
    checkout_label: "Comprar kit por R$ 95,00",
  },
  {
    id: "placa-google",
    slug: "placa-google",
    nome: "Placa Google NFC",
    descricao_curta: "Placa NFC em acrílico para facilitar as avaliações do seu estabelecimento no Google.",
    descricao: "O cliente aproxima o celular da placa e acessa o link de avaliação do estabelecimento no Google. Após a compra, coletamos os dados da empresa para configurar o produto antes da entrega.",
    preco: 55,
    modelo: "acrilico",
    imagens: ["/images/site/placa-nfc-avaliacao-google.webp"],
    imagem_fit: "contain",
    itens_inclusos: ["1 Placa Google NFC", "Configuração do link de avaliação"],
    ativo: true,
    checkout_url: "https://loja.infinitepay.io/bikercourierexpress/hhy2911-placa-google-nfc",
    checkout_label: "Comprar por R$ 55,00",
  },
  {
    id: "placa-instagram",
    slug: "placa-instagram",
    nome: "Placa NFC Instagram",
    descricao_curta: "Placa NFC em acrílico para direcionar clientes ao Instagram do seu negócio.",
    descricao: "O cliente aproxima o celular da placa e acessa diretamente o perfil do Instagram do estabelecimento. Após a compra, coletamos o perfil da empresa para configurar o produto antes da entrega.",
    preco: 55,
    modelo: "acrilico",
    imagens: ["/images/site/display-instagram-acrilico-neon.webp"],
    imagem_fit: "contain",
    itens_inclusos: ["1 Placa NFC Instagram", "Configuração do link do Instagram"],
    ativo: true,
    checkout_url: "https://loja.infinitepay.io/bikercourierexpress/xpg6030-placas-nfc-instagram",
    checkout_label: "Comprar por R$ 55,00",
  },
];

function textoNormalizado(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function produtoCanonico(produtoOuSlug) {
  const value = typeof produtoOuSlug === "string"
    ? produtoOuSlug
    : [produtoOuSlug?.slug, produtoOuSlug?.id, produtoOuSlug?.nome].filter(Boolean).join(" ");
  const texto = textoNormalizado(value).replace(/[^a-z0-9]+/g, " ");
  if (/kit/.test(texto) && /google/.test(texto) && /instagram/.test(texto) || /google.*instagram|instagram.*google/.test(texto)) {
    return CATALOGO_INICIAL[0];
  }
  if (/instagram/.test(texto)) return CATALOGO_INICIAL[2];
  if (/google/.test(texto)) return CATALOGO_INICIAL[1];
  return null;
}

// Sempre exibe os produtos oficiais do catálogo, mesmo se o banco estiver incompleto.
// Para os produtos conhecidos, preço, foto e checkout oficiais prevalecem sobre cadastros antigos.
export function mesclarCatalogoOficial(produtosBanco = []) {
  const usados = new Set();
  const extras = [];
  for (const item of Array.isArray(produtosBanco) ? produtosBanco : []) {
    const canonico = produtoCanonico(item);
    if (!canonico) {
      if (item?.ativo !== false) extras.push(item);
      continue;
    }
    if (usados.has(canonico.slug)) continue;
    usados.add(canonico.slug);
    extras.push({
      ...item,
      ...canonico,
      id: item.id || canonico.id,
      slug: canonico.slug,
      ativo: item.ativo !== false,
    });
  }
  const faltantes = CATALOGO_INICIAL.filter((item) => !usados.has(item.slug));
  return [...faltantes, ...extras].filter((item) => item.ativo !== false);
}

export function resolverProdutoOficial(produto, slug) {
  const canonico = produtoCanonico(produto || slug) || produtoCanonico(slug);
  if (!canonico) return produto;
  return {
    ...(produto || {}),
    ...canonico,
    id: produto?.id || canonico.id,
    slug: canonico.slug,
    ativo: produto?.ativo !== false,
  };
}
