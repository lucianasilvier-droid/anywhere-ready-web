import { createFileRoute } from "@tanstack/react-router";
import { importarBackupEnviado } from "@/lib/backup.server";

export const Route = createFileRoute("/api/backups/upload")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const user = await context.getBase44().auth.me().catch(() => null);
        if (user?.role !== "admin") return Response.json({ error: "Acesso restrito a administradores." }, { status: 403 });
        const form = await request.formData().catch(() => null);
        const arquivo = form?.get("arquivo");
        if (!arquivo || typeof arquivo === "string") return Response.json({ error: "Envie o campo 'arquivo'." }, { status: 400 });
        try {
          const bytes = new Uint8Array(await arquivo.arrayBuffer());
          const r = await importarBackupEnviado(context.getBase44().asServiceRole, { bytes, user });
          return Response.json({ ok: true, id: r.backup.id, nome: r.backup.nome, registros: r.registros, gerado_em: r.gerado_em });
        } catch (error) {
          return Response.json({ error: error?.message || "Falha ao importar." }, { status: Number(error?.status) || 500 });
        }
      },
    },
  },
});
