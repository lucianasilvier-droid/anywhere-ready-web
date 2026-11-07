import { createFileRoute } from "@tanstack/react-router";
import { gerarRobots, gerarSitemap, originDaRequisicao } from "@/lib/seo.server";

/**
 * robots.txt e sitemap.xml servidos na raiz do domínio.
 * Só esses dois arquivos são respondidos aqui; qualquer outro caminho de
 * primeiro nível cai no 404 normal do site.
 */
export const Route = createFileRoute("/$arquivo")({
  server: {
    handlers: {
      GET: async ({ request, params, context }) => {
        const nome = String(params?.arquivo || "").toLowerCase();
        const origin = originDaRequisicao(request);

        if (nome === "robots.txt") {
          return new Response(gerarRobots(origin), {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          });
        }

        if (nome === "sitemap.xml") {
          const base44 = context.getBase44();
          const xml = await gerarSitemap(base44, origin);
          return new Response(xml, {
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=1800",
            },
          });
        }

        return new Response("Não encontrado", { status: 404 });
      },
    },
  },
});