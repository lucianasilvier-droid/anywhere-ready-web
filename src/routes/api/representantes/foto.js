import { createFileRoute } from "@tanstack/react-router";
import { lerFoto } from "@/lib/landing-representante.server";

// Foto pública da página do representante (guardada no armazenamento de arquivos — src/lib/storage.server.js).
export const Route = createFileRoute("/api/representantes/foto")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const chave = new URL(request.url).searchParams.get("k") || "";
        const foto = await lerFoto(chave);
        if (!foto?.data) return new Response("Not found", { status: 404 });
        return new Response(foto.data, {
          headers: {
            "content-type": foto.metadata?.contentType || "image/jpeg",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
