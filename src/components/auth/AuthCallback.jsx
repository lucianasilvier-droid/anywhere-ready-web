import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES = {
  confirmado: { type: "success", text: "E-mail confirmado. Bem-vindo!" },
  link_invalido: { type: "error", text: "Este link expirou ou já foi usado." },
  google_erro: { type: "error", text: "Não foi possível entrar com o Google. Tente de novo." },
};

/**
 * Shows the outcome of the e-mail confirmation and Google sign-in redirects
 * (/api/auth/confirm and /api/auth/google-callback land here with ?auth=…),
 * then removes the parameter from the address bar.
 */
export function AuthCallback() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const key = url.searchParams.get("auth");
    if (!key) return;
    const m = MESSAGES[key];
    if (m) toast[m.type](m.text);
    url.searchParams.delete("auth");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
