import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import { salvarRepresentanteFn } from "@/lib/representantes-fns";

const VAZIO = {
  nome: "",
  email: "",
  user_email: "",
  telefone: "",
  status: "ativo",
  comissao_perfil: 100,
  comissao_mensalidade: 50,
  comissao_placa: 20,
  observacoes: "",
  convidar: true,
};

export default function RepForm({ open, onOpenChange, representante, onSalvo }) {
  const salvar = useServerFn(salvarRepresentanteFn);
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      representante
        ? {
            ...VAZIO,
            ...representante,
            comissao_perfil: Number(representante.comissao_perfil) || 100,
            comissao_mensalidade: 50,
            comissao_placa: Number(representante.comissao_placa) || 20,
            convidar: false,
          }
        : VAZIO,
    );
  }, [open, representante]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.nome.trim().length < 2) return toast.error("Informe o nome do representante.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("Informe um e-mail válido.");
    if (!/^\S+@\S+\.\S+$/.test(form.user_email)) {
      return toast.error("Informe o e-mail de login do representante.");
    }

    setEnviando(true);
    try {
      const resultado = await salvar({
        data: {
          id: representante?.id,
          nome: form.nome,
          email: form.email,
          user_email: form.user_email,
          telefone: form.telefone,
          status: form.status,
          comissao_perfil: Number(form.comissao_perfil) || 0,
          comissao_mensalidade: Number(form.comissao_mensalidade) || 0,
          comissao_placa: Number(form.comissao_placa) || 0,
          observacoes: form.observacoes,
          convidar: !!form.convidar,
        },
      });
      toast.success(resultado?.convite || "Representante salvo.");
      onOpenChange(false);
      await onSalvo?.();
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar o representante.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={representante ? "Editar representante" : "Novo representante comercial"}
      wide
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Nome" value={form.nome} onChange={set("nome")} placeholder="Nome completo" />
          <AdminField label="Telefone" value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-9999" />
          <AdminField
            label="E-mail de contato"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="representante@empresa.com"
          />
          <AdminField
            label="E-mail de login (acesso ao painel)"
            type="email"
            value={form.user_email}
            onChange={set("user_email")}
            placeholder="representante@empresa.com"
            hint="O representante entra com esse e-mail e vê apenas os próprios dados."
          />
          <AdminField
            label="Situação"
            value={form.status}
            onChange={set("status")}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
              { value: "bloqueado", label: "Bloqueado" },
            ]}
          />
          <AdminField
            label="Comissão por perfil no Google (R$)"
            type="number"
            step="0.01"
            value={form.comissao_perfil}
            onChange={set("comissao_perfil")}
            hint="Padrão da empresa: R$ 100,00 por venda de R$ 150,00."
          />
          <AdminField
            label="Comissão por mensalidade (R$)"
            type="number"
            step="0.01"
            value={form.comissao_mensalidade}
            onChange={set("comissao_mensalidade")}
            hint="R$ 50,00 por mês pago. O sistema executa a administração do perfil e fica com R$ 100,00."
          />
          <AdminField
            label="Comissão por placa NFC (R$)"
            type="number"
            step="0.01"
            value={form.comissao_placa}
            onChange={set("comissao_placa")}
            hint="Valor por unidade vendida e paga."
          />
        </div>

        <AdminField label="Observações" textarea value={form.observacoes} onChange={set("observacoes")} />

        {!representante && (
          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <input
              type="checkbox"
              checked={!!form.convidar}
              onChange={(e) => setForm((f) => ({ ...f, convidar: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-[#ffc24a]"
            />
            <span className="text-[11.5px] leading-relaxed text-white/55">
              Enviar convite de acesso por e-mail para o representante criar a senha e entrar no
              painel individual.
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar representante
          </button>
        </div>
      </form>
    </Modal>
  );
}