import { Link } from "@tanstack/react-router";
import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authErrorMessage } from "@/components/auth/errors";
import { AuthError, AuthLink, GoogleButton, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";
import { prepareAdminLoginFn } from "@/lib/entities-fns";

// The /login page. ?returnTo= is where the visitor goes after signing in.
export function LoginPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      try {
        await base44.auth.loginViaEmailPassword(email, password);
      } catch (err) {
        // The owner's first sign-in with the starting password: set the account up, retry once.
        let prepared = null;
        try {
          prepared = await prepareAdminLoginFn({ data: { email, password } });
        } catch (setupError) {
          // The account setup itself failed: show why instead of "senha inválida".
          console.error("prepareAdminLogin", setupError);
          throw new Error(`Não foi possível preparar o acesso do administrador: ${setupError?.message || "erro desconhecido"}`);
        }
        if (!prepared?.ok) throw err;
        await base44.auth.loginViaEmailPassword(email, password);
      }
      // A hard redirect so the server sees the new session cookie.
      window.location.href = await base44.auth.homeAfterLogin(returnTo);
    } catch (err) {
      setError(authErrorMessage(err, "E-mail ou senha inválidos."));
      setBusy(false);
    }
  }

  return (
    <AuthLayout icon={LogIn} title="Bem-vindo de volta" subtitle="Entre na sua conta">
      <GoogleButton returnTo={returnTo} />
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-email" type="email" autoComplete="email" autoFocus placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Senha</Label>
            <AuthLink to="/forgot-password" returnTo={returnTo} className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </AuthLink>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          Criar conta
        </AuthLink>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Link to="/acesso-admin" className="inline-flex items-center gap-1 hover:text-primary hover:underline">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Administrador sem acesso? Receber link de acesso
        </Link>
      </p>
    </AuthLayout>
  );
}
