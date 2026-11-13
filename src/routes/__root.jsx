import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthCallback } from "@/components/auth/AuthCallback";
import appCss from "@/index.css?url";
import fontsCss from "@/fonts.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Google NFC Connect | Perfil da Empresa no Google, Placas NFC e Sites" },
      {
        name: "description",
        content:
          "Melhore a presença digital do seu negócio com configuração e gestão do Perfil da Empresa no Google, placas NFC para avaliações e sites profissionais. Atendimento em todo o Brasil.",
      },
      { name: "google-site-verification", content: "lOe-akk9BgudktTFlKS-Z2oEZX4L7SPv5AdhlqszxJo" },
      { name: "theme-color", content: "#070d1c" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Google NFC Connect" },
      { property: "og:title", content: "Google NFC Connect | Perfil no Google, Placas NFC e Sites" },
      {
        property: "og:description",
        content:
          "Soluções para fortalecer a presença digital de empresas: Perfil da Empresa no Google, placas NFC e sites profissionais.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // Fonts are self-hosted (src/fonts.css) — no Google Fonts request.
      { rel: "stylesheet", href: fontsCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <AuthCallback />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}

function RootDocument({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body data-react-root="true">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
