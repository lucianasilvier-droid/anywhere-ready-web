import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, UserCog, ShieldCheck, Trash2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/conta/dados")({
  head: () => ({ meta: [{ title: "Meus dados — Google NFC Connect" }] }),
  component: DadosCliente,
});

const CAMPOS = [
  ["nome", "Nome completo"], ["empresa", "Empresa"], ["telefone", "Telefone"], ["whatsapp", "WhatsApp"],
  ["documento", "CPF/CNPJ"], ["cep", "CEP"], ["endereco", "Endereço"], ["cidade", "Cidade"],
  ["estado", "Estado"], ["instagram", "Instagram"], ["site", "Site"],
];

function DadosCliente() {
  const { user, logout } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [solicitando, setSolicitando] = useState(false);

  useEffect(() => {
    base44.entities.Cliente.filter({ user_email: user?.email }, { limit: 1 })
      .then((page) => {
        const lista = Array.isArray(page) ? page : page?.items || [];
        setCliente(lista[0] || null);
        setForm(lista[0] || null);
      })
      .catch(() => toast.error("Não foi possível carregar seus dados."))
      .finally(() => setCarregando(false));
  }, [user?.email]);

  async function salvar(e) {
    e.preventDefault();
    if (!cliente) return;
    setSalvando(true);
    try {
      const dados = {};
      CAMPOS.forEach(([c]) => {
        dados[c] = form[c] || "";
      });
      await base44.entities.Cliente.update(cliente.id, dados);
      setCliente({ ...cliente, ...dados });
      toast.success("Dados atualizados.");
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function solicitarExclusao() {
    if (!window.confirm("Deseja solicitar a exclusão dos seus dados pessoais? A equipe entrará em contato para confirmar.")) return;
    setSolicitando(true);
    try {
      await base44.entities.ServicoAtualizacao.create({
        servico_id: "LGPD",
        cliente_email: user?.email || "",
        tipo: "solicitacao",
        titulo: "Solicitação de exclusão de dados pessoais (LGPD)",
        descricao: `O titular ${user?.email} solicitou a exclusão dos dados pessoais em ${new Date().toLocaleString("pt-BR")}.`,
        autor: user?.full_name || user?.email || "Cliente",
        visivel_cliente: true,
        status: "aberta",
      });
      toast.success("Solicitação registrada. A equipe vai confirmar com você.");
    } catch (err) {
      toast.error(err?.message || "Não foi possível registrar a solicitação.");
    } finally {
      setSolicitando(false);
    }
  }

  if (carregando) {
    return <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando seus dados...</div>;
  }

  if (!cliente || !form) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
        <UserCog className="mx-auto h-8 w-8 text-white/20" />
        <p className="mt-2 text-sm text-white/55">Nenhum cadastro vinculado a {user?.email}.</p>
        <p className="mt-1 text-[12px] text-white/35">Fale com a equipe para vincular seu cadastro à sua conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-white">Meus dados</h1>
        <p className="mt-1 text-[12.5px] text-white/45">Mantenha suas informações de contato e endereço atualizadas.</p>
      </div>

      <form onSubmit={salvar} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {CAMPOS.map(([campo, label]) => (
            <label key={campo} className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{label}</span>
              <input
                value={form[campo] || ""}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white focus:border-primary/40 focus:outline-none"
              />
            </label>
          ))}
        </div>
        <label className="mt-2.5 block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Observações</span>
          <textarea
            rows={3}
            value={form.observacoes || ""}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white focus:border-primary/40 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={salvando}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
        >
          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar dados
        </button>
        <p className="mt-2 text-[10.5px] text-white/30">
          O e-mail de login ({user?.email}) é gerenciado pela plataforma e não pode ser alterado aqui.
        </p>
      </form>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Privacidade e LGPD
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
          Você pode corrigir seus dados acima a qualquer momento ou solicitar a exclusão completa.
          A exclusão remove seus dados pessoais, pedidos, serviços e placas vinculadas.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={solicitarExclusao}
            disabled={solicitando}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-[11.5px] font-bold text-red-300 disabled:opacity-60"
          >
            {solicitando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Solicitar exclusão dos meus dados
          </button>
          <button
            onClick={() => logout()}
            className="rounded-full border border-white/12 px-3.5 py-2 text-[11.5px] font-semibold text-white/60"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}