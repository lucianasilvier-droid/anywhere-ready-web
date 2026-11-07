import { createFileRoute } from "@tanstack/react-router";
import { googleAuthStart } from "@/lib/auth.server";

// "Continuar com Google": sends the visitor to Google's consent screen.
// Needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and the authorized redirect URI
// <APP_URL>/api/auth/google-callback in the Google Cloud console.
export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const returnTo = new URL(request.url).searchParams.get("returnTo") || "/";
          const { url, cookie } = googleAuthStart(returnTo);
          return new Response(null, { status: 302, headers: { location: url, "set-cookie": cookie, "cache-control": "no-store" } });
        } catch {
          return new Response(null, { status: 302, headers: { location: "/login?auth=google_erro" } });
        }
      },
    },
  },
});
