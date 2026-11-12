import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/lib/db.server";
import { readSecret } from "@/lib/integrations.server";

// Proxy das fotos do Google Places: mantém a chave no servidor e valida o recurso solicitado.
export const Route = createFileRoute("/api/google-place-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name") || "";
        if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_=-]+$/.test(name)) {
          return new Response("Foto inválida", { status: 400 });
        }

        let apiKey = readSecret("GOOGLE_MAPS_API_KEY");
        if (!apiKey) {
          try {
            const rows = await query(
              "SELECT data->'config'->>'google_maps_api_key' AS api_key FROM records WHERE entity = $1 AND data->>'tipo' = $2 ORDER BY updated_date DESC LIMIT 1",
              ["Integracao", "google_places"],
            );
            apiKey = rows[0]?.api_key || "";
          } catch {
            apiKey = "";
          }
        }
        if (!apiKey) return new Response("Google Places não configurado", { status: 503 });

        try {
          const upstream = await fetch(
            `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1400`,
            { headers: { "X-Goog-Api-Key": apiKey } },
          );
          if (!upstream.ok) return new Response("Foto indisponível", { status: upstream.status === 404 ? 404 : 502 });
          const contentType = upstream.headers.get("content-type") || "image/jpeg";
          if (!contentType.startsWith("image/")) return new Response("Resposta de imagem inválida", { status: 502 });
          return new Response(await upstream.arrayBuffer(), {
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
              "x-content-type-options": "nosniff",
            },
          });
        } catch {
          return new Response("Não foi possível carregar a foto", { status: 502 });
        }
      },
    },
  },
});
