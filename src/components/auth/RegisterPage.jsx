import { Lock, Mail, MailCheck, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authErrorMessage } from "@/components/auth/errors";
import { AuthError, AuthLink, GoogleButton, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

/**
 * The /register page. With e-mail confirmation on (default when SMTP is configured)
 * the visitor gets a confirmation link; opening it signs them in. Otherwise the
 * account is ready right away.
 */
export function RegisterPage() {
  const returnTo = safeReturnTo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const user = await base44.auth.register({ email, password, full_name: name.trim() });
      if (user?.emailVerified) {
        window.location.href = await base44.auth.homeAfterLogin(returnTo);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err, "Não foi possível criar a conta."));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout icon={MailCheck} title="Confirme seu e-mail" subtitle="Falta só um passo">
        <p className="text-center text-sm text-foreground">
          Enviamos um link de confirmação para <span className="font-medium">{email}</span>. Abra o link para ativar sua conta e entrar.
        </p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <AuthLink to="/login" returnTo={returnTo}>
            Voltar para o login
          </AuthLink>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title="Criar conta" subtitle="Cadastre-se para acompanhar pedidos e serviços">
      <GoogleButton returnTo={returnTo} />
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-name">Nome</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-name" autoComplete="name" autoFocus placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="h-12 pl-10" disabled={busy} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-password" type="password" autoComplete="new-password" minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="register-confirm" type="password" autoComplete="new-password" minLength={6} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Criando conta...">
          Criar conta
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <AuthLink to="/login" returnTo={returnTo}>
          Entrar
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
