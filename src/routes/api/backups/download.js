import { createFileRoute } from "@tanstack/react-router";
import { lerArquivo } from "@/lib/backup.server";

// Downloads a backup file. Administrators only.
export const Route = createFileRoute("/api/backups/download")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const user = await context
          .getBase44()
          .auth.me()
          .catch(() => null);
        if (user?.role !== "admin") return Response.json({ error: "Acesso restrito a administradores." }, { status: 403 });
        const params = new URL(request.url).searchParams;
        const chave = params.get("arquivo") || "";
        if (!/^[A-Za-z0-9_-]+\.(zip|json)$/.test(chave)) return Response.json({ error: "Arquivo inválido" }, { status: 400 });
        const conteudo = await lerArquivo(chave);
        if (!conteudo) return Response.json({ error: "Arquivo do backup não encontrado" }, { status: 404 });
        const zip = chave.endsWith(".zip");
        const nome = (params.get("nome") || "").replace(/[^A-Za-z0-9._-]/g, "") || `backup-${chave}`;
        return new Response(conteudo, {
          headers: {
            "content-type": zip ? "application/zip" : "application/json; charset=utf-8",
            "content-length": String(conteudo.byteLength),
            "content-disposition": `attachment; filename="${nome}"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
