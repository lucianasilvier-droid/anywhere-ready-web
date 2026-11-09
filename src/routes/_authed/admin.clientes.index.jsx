import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Search, Loader2, Users, Trash2, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import { deleteClientDataFn } from "@/lib/admin-fns";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import EmptyState from "@/components/admin/EmptyState";

export const Route = createFileRoute("/_authed/admin/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Painel" }] }),
  component: ClientesPage,
});

const VAZIO = {
  nome: "", empresa: "", email: "", user_email: "", telefone: "", whatsapp: "",
  documento: "", endereco: "", cidade: "", estado: "", cep: "", instagram: "", site: "",
  origem: "manual", status: "ativo", observacoes: "",
};

function ClientesPage() {
  const { items, loading, reload } = useEntityList("Cliente", {}, { limit: 300 });
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const excluir = useServerFn(deleteClientDataFn);

  const mExcluir = useMutation({
    mutationFn: (id) => excluir({ data: { clienteId: id } }),
    onSuccess: async () => {
      toast.success("Dados do cliente excluídos.");
      setExcluindo(null);
      await reload();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível excluir."),
  });

  const filtrados = items.filter((c) =>
    `${c.nome} ${c.empresa} ${c.email} ${c.cidade} ${c.telefone}`.toLowerCase().includes(busca.toLowerCase()),
  );

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setModal(true);
  }

  function abrirEdicao(cliente) {
    setEditando(cliente);
    setForm({ ...VAZIO, ...cliente });
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (form.nome.trim().length < 2) return toast.error("Informe o nome do cliente.");
    setSalvando(true);
    try {
      const dados = { ...form };
      delete dados.id;
      delete dados.created_date;
      delete dados.updated_date;
      delete dados.created_by_id;
      if (editando) await base44.entities.Cliente.update(editando.id, dados);
      else await base44.entities.Cliente.create(dados);
      toast.success(editando ? "Cliente atualizado." : "Cliente cadastrado.");
      setModal(false);
      await reload();
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Base de clientes</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Clientes</h1>
          <p className="mt-1 text-[13px] text-white/45">
            Cadastre, edite e acompanhe cada cliente, seus serviços e pedidos.
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-bold text-[#0a1128]"
        >
          <Plus className="h-3.5 w-3.5" /> Novo cliente
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, empresa, e-mail..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente cadastrado" description="Cadastre o primeiro cliente ou receba um automaticamente quando um pedido for finalizado na loja." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Contato</th>
                <th className="px-4 py-2.5">Cidade</th>
                <th className="px-4 py-2.5">Origem</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtrados.map((c) => (
                <tr key={c.id} className="text-[12.5px] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <Link to="/admin/clientes/$clientId" params={{ clientId: c.id }} className="font-semibold text-white hover:text-primary">
                      {c.nome}
                    </Link>
                    <p className="text-[11px] text-white/35">{c.empresa || "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-white/55">
                    <p>{c.email || "—"}</p>
                    <p className="text-[11px] text-white/30">{c.telefone || c.whatsapp || "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-white/55">{c.cidade || "—"}</td>
                  <td className="px-4 py-2.5 text-white/45">{c.origem || "—"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={async () => {
                        await base44.entities.Cliente.update(c.id, { status: c.status === "ativo" ? "inativo" : "ativo" });
                        reload();
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
                        c.status === "ativo"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-white/15 bg-white/5 text-white/45"
                      }`}
                    >
                      {c.status === "ativo" ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEdicao(c)} className="rounded p-1.5 text-white/40 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setExcluindo(c)} className="rounded p-1.5 text-white/40 hover:text-red-400" aria-label="Excluir dados (LGPD)">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onOpenChange={setModal} title={editando ? "Editar cliente" : "Novo cliente"} wide>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Nome *" value={form.nome} onChange={set("nome")} />
          <AdminField label="Empresa" value={form.empresa} onChange={set("empresa")} />
          <AdminField label="E-mail" type="email" value={form.email} onChange={set("email")} />
          <AdminField label="E-mail de login (área do cliente)" type="email" value={form.user_email} onChange={set("user_email")} hint="Usado para o cliente ver os próprios dados e serviços." />
          <AdminField label="Telefone" value={form.telefone} onChange={set("telefone")} />
          <AdminField label="WhatsApp" value={form.whatsapp} onChange={set("whatsapp")} />
          <AdminField label="CPF/CNPJ" value={form.documento} onChange={set("documento")} />
          <AdminField label="CEP" value={form.cep} onChange={set("cep")} />
          <AdminField label="Endereço" value={form.endereco} onChange={set("endereco")} className="sm:col-span-2" />
          <AdminField label="Cidade" value={form.cidade} onChange={set("cidade")} />
          <AdminField label="Estado" value={form.estado} onChange={set("estado")} />
          <AdminField label="Instagram" value={form.instagram} onChange={set("instagram")} />
          <AdminField label="Site" value={form.site} onChange={set("site")} />
          <AdminField label="Status" value={form.status} onChange={set("status")} options={[{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }]} />
          <AdminField label="Origem" value={form.origem} onChange={set("origem")} options={[{ value: "manual", label: "Manual" }, { value: "loja", label: "Loja" }, { value: "site", label: "Site" }, { value: "indicacao", label: "Indicação" }]} />
          <AdminField label="Observações" value={form.observacoes} onChange={set("observacoes")} textarea className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60">
              {salvando && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!excluindo} onOpenChange={() => setExcluindo(null)} title="Excluir dados do cliente">
        <p className="text-[13px] leading-relaxed text-white/60">
          Esta ação remove permanentemente <strong className="text-white">{excluindo?.nome}</strong> e
          os registros vinculados (serviços, pedidos, placas e relatórios), conforme a solicitação
          de exclusão prevista na LGPD. Não é possível desfazer.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setExcluindo(null)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">
            Cancelar
          </button>
          <button
            onClick={() => mExcluir.mutate(excluindo.id)}
            disabled={mExcluir.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
          >
            {mExcluir.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Excluir definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}