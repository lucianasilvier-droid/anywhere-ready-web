import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { authErrorMessage } from "@/components/auth/errors";
import { useAuth } from "@/lib/AuthContext";
import { passwordChangedFn } from "@/lib/entities-fns";

const campo =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none";

// "Alterar senha" for the signed-in administrator: checks the current password,
// sets the new one and retires the starting password.
export function AlterarSenha() {
  const { user } = useAuth();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (nova.length < 8) return toast.error("A nova senha precisa ter pelo menos 8 caracteres.");
    if (nova !== confirmacao) return toast.error("A confirmação não confere com a nova senha.");
    if (nova === atual) return toast.error("A nova senha deve ser diferente da atual.");
    setBusy(true);
    try {
      await base44.auth.changePassword(atual, nova);
      await passwordChangedFn();
      setAtual("");
      setNova("");
      setConfirmacao("");
      toast.success("Senha alterada. Use a nova senha no próximo login.");
    } catch (err) {
      toast.error(authErrorMessage(err, "Não foi possível alterar a senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
        <KeyRound className="h-4 w-4 text-primary" /> Alterar minha senha
      </p>
      <p className="mt-1 text-[11.5px] text-white/35">Conta: {user?.email}</p>
      <form onSubmit={salvar} className="mt-3 space-y-2.5">
        <input type="password" autoComplete="current-password" placeholder="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} className={campo} required />
        <input type="password" autoComplete="new-password" placeholder="Nova senha (mínimo 8 caracteres)" value={nova} onChange={(e) => setNova(e.target.value)} className={campo} required />
        <input type="password" autoComplete="new-password" placeholder="Confirme a nova senha" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campo} required />
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Salvar nova senha
        </button>
      </form>
    </section>
  );
}
