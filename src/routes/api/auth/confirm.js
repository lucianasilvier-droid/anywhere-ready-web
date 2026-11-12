import { createFileRoute } from "@tanstack/react-router";
import { confirmEmailToken, startSessionHeader } from "@/lib/auth.server";

// Link from the sign-up confirmation e-mail: confirms the address, signs the
// visitor in and sends them to their area.
export const Route = createFileRoute("/api/auth/confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") || "";
        const userId = await confirmEmailToken(token).catch(() => null);
        if (!userId) return new Response(null, { status: 302, headers: { location: "/login?auth=link_invalido" } });
        const headers = new Headers({ location: "/conta?auth=confirmado", "cache-control": "no-store" });
        headers.append("set-cookie", await startSessionHeader(userId));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
