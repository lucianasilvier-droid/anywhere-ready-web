import { Link } from "@tanstack/react-router";
import { AlertTriangle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authErrorMessage } from "@/components/auth/errors";
import { AuthError, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordFn } from "@/lib/auth-fns";

// The /reset-password page. Reached from the e-mail links the server sends
// (/reset-password?token=… for recovery, …&invite=1 for invitations). Without a
// token, a signed-in visitor can simply choose a new password.
export function ResetPasswordPage() {
  const [{ token, invite }] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { token: params.get("token"), invite: params.get("invite") === "1" };
  });
  const [signedIn, setSignedIn] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Keep the one-time token out of the address bar / history once it is read.
    if (token) window.history.replaceState(window.history.state, "", "/reset-password" + (invite ? "?invite=1" : ""));
    if (token) return;
    base44.auth
      .me()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, [token, invite]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      if (token) await resetPasswordFn({ data: { token, password } });
      else await base44.auth.changePassword(undefined, password);
      window.location.href = await base44.auth.homeAfterLogin("/");
    } catch (err) {
      setError(authErrorMessage(err, "Não foi possível salvar a nova senha."));
      setBusy(false);
    }
  }

  if (!token && signedIn === null) return null;

  if (!token && !signedIn) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link inválido"
        subtitle="Este link de redefinição expirou ou está incompleto"
        footer={
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Solicitar um novo link
          </Link>
        }
      >
        <p className="text-center text-sm text-foreground">Peça um novo e-mail de redefinição de senha e abra o link mais recente.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title={invite ? "Ative sua conta" : "Nova senha"} subtitle={invite ? "Escolha uma senha para acessar" : "Digite sua nova senha"}>
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="reset-password" type="password" autoComplete="new-password" minLength={6} autoFocus placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="reset-confirm" type="password" autoComplete="new-password" minLength={6} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Salvando...">
          Salvar senha
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
