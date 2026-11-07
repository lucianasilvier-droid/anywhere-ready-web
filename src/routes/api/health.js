import { createFileRoute } from "@tanstack/react-router";
import { query } from "@/lib/db.server";

// Health check for load balancers, Docker HEALTHCHECK and uptime monitors.
// 200 when the app and the database answer, 503 otherwise.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await query("SELECT 1");
          return Response.json({ ok: true, database: "ok" }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          console.error("[health]", error);
          return Response.json({ ok: false, database: "indisponível" }, { status: 503, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
