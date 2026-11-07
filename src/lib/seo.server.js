/**
 * SEO técnico: robots.txt e sitemap.xml gerados em tempo de requisição.
 * As páginas privadas ficam fora do sitemap e bloqueadas no robots.
 */

export const ROTAS_PUBLICAS = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/loja", changefreq: "weekly", priority: "0.9" },
  { path: "/servicos/perfil-google", changefreq: "monthly", priority: "0.8" },
  { path: "/servicos/gestao-perfil", changefreq: "monthly", priority: "0.8" },
  { path: "/servicos/placa-nfc", changefreq: "monthly", priority: "0.8" },
];

export const ROTAS_PRIVADAS = [
  "/admin",
  "/conta",
  "/representante",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/carrinho",
  "/pagamento/",
  "/placa/",
  "/api/",
  "/oauth",
];

const dataIso = (valor) => {
  const d = valor ? new Date(valor) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};

export function originDaRequisicao(request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] || url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

export function gerarRobots(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Áreas administrativas, privadas e de dados internos",
    ...ROTAS_PRIVADAS.map((rota) => `Disallow: ${rota}`),
    "",
    "# Arquivos internos",
    "Disallow: /*.json$",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

/** Sitemap com as páginas públicas, incluindo os produtos ativos da loja. */
export async function gerarSitemap(base44, origin) {
  const urls = ROTAS_PUBLICAS.map((rota) => ({
    loc: `${origin}${rota.path}`,
    lastmod: dataIso(),
    changefreq: rota.changefreq,
    priority: rota.priority,
  }));

  const produtos = await base44.entities.Produto
    .filter({ ativo: true }, { limit: 200 })
    .then((pagina) => (Array.isArray(pagina) ? pagina : pagina?.items || []))
    .catch((error) => {
      console.error("[sitemap] produtos", error);
      return [];
    });

  const vistos = new Set(urls.map((u) => u.loc));
  for (const produto of produtos) {
    const slug = produto.slug || produto.id;
    if (!slug) continue;
    const loc = `${origin}/loja/${encodeURIComponent(slug)}`;
    if (vistos.has(loc)) continue;
    vistos.add(loc);
    urls.push({
      loc,
      lastmod: dataIso(produto.updated_date || produto.created_date),
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  const corpo = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`;
}