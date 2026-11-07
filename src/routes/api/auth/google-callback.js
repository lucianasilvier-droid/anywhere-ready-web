import { createFileRoute } from "@tanstack/react-router";
import { googleAuthFinish } from "@/lib/auth.server";

// Google redirects here after the consent screen.
export const Route = createFileRoute("/api/auth/google-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { returnTo, cookies } = await googleAuthFinish(request);
          const headers = new Headers({ location: returnTo === "/" ? "/conta" : returnTo, "cache-control": "no-store" });
          for (const c of cookies) headers.append("set-cookie", c);
          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error("[auth] google", error);
          return new Response(null, { status: 302, headers: { location: "/login?auth=google_erro" } });
        }
      },
    },
  },
});
