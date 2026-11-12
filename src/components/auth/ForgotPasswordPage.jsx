import { ArrowLeft, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { authSettingsFn, recoverPasswordFn } from "@/lib/auth-fns";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

// The /forgot-password page. Always ends in the generic "if an account exists"
// message: the UI never reveals whether the email is registered.
export function ForgotPasswordPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailConfigurado, setEmailConfigurado] = useState(null);
  const [erroConfiguracao, setErroConfiguracao] = useState(false);
  const carregarConfiguracao = useServerFn(authSettingsFn);
  const recuperarSenha = useServerFn(recoverPasswordFn);

  useEffect(() => {
    let ativo = true;
    carregarConfiguracao()
      .then((settings) => {
        if (ativo) setEmailConfigurado(settings?.recoveryEmailConfigured === true);
      })
      .catch(() => {
        if (ativo) {
          setEmailConfigurado(false);
          setErroConfiguracao(true);
        }
      });
    return () => { ativo = false; };
  }, [carregarConfiguracao]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await recuperarSenha({ data: { email } });
    } catch {
      // Same outcome either way.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <AuthLayout icon={Mail} title="Redefinir senha" subtitle="Enviaremos um link para criar uma nova senha">
      {sent ? (
        <p className="text-center text-sm text-foreground">Se existir uma conta com esse e-mail, você receberá em instantes um link para redefinir a senha.</p>
      ) : (
        <>
        {emailConfigurado === false && (
          <p role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
            {erroConfiguracao
              ? "Não foi possível confirmar a configuração do serviço de e-mail. Tente novamente mais tarde ou fale com o administrador."
              : "A recuperação por e-mail está temporariamente indisponível porque o envio de e-mails ainda não foi configurado. Fale com o administrador."}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="forgot-email" type="email" autoComplete="email" autoFocus placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required />
            </div>
          </div>
          <SubmitButton busy={busy || emailConfigurado === null} busyLabel="Enviando...">
            Enviar link
          </SubmitButton>
        </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <AuthLink to="/login" returnTo={returnTo}>
          <ArrowLeft className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Voltar para o login
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
