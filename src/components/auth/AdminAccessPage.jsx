import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAccessLinkFn } from "@/lib/entities-fns";

// The /acesso-admin page: an administrator who can't sign in (never registered,
// never confirmed the e-mail, or forgot the password) gets a link to set a password.
export function AdminAccessPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminAccessLinkFn({ data: { email } });
      setSent(true);
    } catch (err) {
      setError(err?.message || "Não foi possível enviar o link. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout icon={ShieldCheck} title="Acesso do administrador" subtitle="Receba um link para criar ou redefinir sua senha">
      {sent ? (
        <div className="space-y-3 text-center text-sm text-foreground">
          <p>Se este e-mail tiver acesso de administrador, você receberá em instantes um link para definir sua senha.</p>
          <p className="text-muted-foreground">Abra o link no mesmo navegador, crie a senha e você será levado ao painel. Não chegou? Veja a caixa de spam.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Use esta opção no primeiro acesso, se você não recebeu o e-mail de confirmação ou se esqueceu a senha.
          </p>
          <AuthError>{error}</AuthError>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail do administrador</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="admin-email" type="email" autoComplete="email" autoFocus placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required />
              </div>
            </div>
            <SubmitButton busy={busy} busyLabel="Enviando...">
              Enviar link de acesso
            </SubmitButton>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <AuthLink to="/login" returnTo="/admin">
          <ArrowLeft className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Voltar para o login
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
