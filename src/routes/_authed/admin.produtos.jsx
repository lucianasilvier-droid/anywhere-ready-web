import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Loader2, Package, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import EmptyState from "@/components/admin/EmptyState";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Painel" }] }),
  component: ProdutosPage,
});

const VAZIO = {
  nome: "", slug: "", descricao_curta: "", descricao: "", preco: 55, preco_antigo: 0,
  modelo: "acrilico", imagens: "", itens_inclusos: "", estoque: 0, prazo_producao: "",
  ativo: true, destaque: false,
};

function ProdutosPage() {
  const { items, loading, reload } = useEntityList("Produto", {}, { limit: 100 });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setModal(true);
  }

  function abrirEdicao(p) {
    setEditando(p);
    setForm({
      ...VAZIO,
      ...p,
      imagens: (p.imagens || []).join("\n"),
      itens_inclusos: (p.itens_inclusos || []).join("\n"),
    });
    setModal(true);
  }

  function slugify(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do produto.");
    setSalvando(true);
    try {
      const dados = {
        ...form,
        slug: form.slug ? slugify(form.slug) : slugify(form.nome),
        preco: Number(form.preco) || 0,
        preco_antigo: Number(form.preco_antigo) || 0,
        estoque: Number(form.estoque) || 0,
        imagens: form.imagens.split("\n").map((s) => s.trim()).filter(Boolean),
        itens_inclusos: form.itens_inclusos.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      delete dados.id;
      delete dados.created_date;
      delete dados.updated_date;
      delete dados.created_by_id;
      if (editando) await base44.entities.Produto.update(editando.id, dados);
      else await base44.entities.Produto.create(dados);
      toast.success("Produto salvo.");
      setModal(false);
      await reload();
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(p, campo) {
    try {
      const novo = !p[campo];
      await base44.entities.Produto.update(p.id, { [campo]: novo });
      toast.success(
        campo === "ativo"
          ? novo ? "Produto ativado na loja." : "Produto retirado da loja."
          : novo ? "Produto marcado como destaque." : "Destaque removido.",
      );
      await reload();
    } catch (e) {
      toast.error(e?.message || "Não foi possível atualizar.");
    }
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir o produto "${p.nome}"? Pedidos antigos mantêm o histórico.`)) return;
    try {
      await base44.entities.Produto.delete(p.id);
      toast.success("Produto excluído.");
      await reload();
    } catch (e) {
      toast.error(e?.message || "Não foi possível excluir.");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Loja</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Produtos e placas</h1>
          <p className="mt-1 text-[13px] text-white/45">Preços, imagens, estoque, descrições e disponibilidade da loja.</p>
        </div>
        <button onClick={abrirNovo} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-bold text-[#0a1128]">
          <Plus className="h-3.5 w-3.5" /> Novo produto
        </button>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Cadastre os modelos de placa que você vende." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5">Produto</th>
                <th className="px-4 py-2.5">Preço</th>
                <th className="px-4 py-2.5">Estoque</th>
                <th className="px-4 py-2.5">Ativo</th>
                <th className="px-4 py-2.5">Destaque</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {items.map((p) => (
                <tr key={p.id} className="text-[12.5px] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-white">{p.nome}</p>
                    <p className="text-[10.5px] text-white/30">/loja/{p.slug || p.id}</p>
                  </td>
                  <td className="px-4 py-2.5 text-white/70">{brl(p.preco)}</td>
                  <td className="px-4 py-2.5 text-white/55">{p.estoque ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => alternar(p, "ativo")}
                      className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
                        p.ativo ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/45"
                      }`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => alternar(p, "destaque")}
                      className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
                        p.destaque ? "border-primary/40 bg-primary/10 text-primary" : "border-white/15 bg-white/5 text-white/45"
                      }`}
                    >
                      {p.destaque ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => abrirEdicao(p)} className="rounded p-1.5 text-white/40 hover:text-primary" aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => excluir(p)} className="rounded p-1.5 text-white/40 hover:text-red-400" aria-label="Excluir">
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

      <Modal open={modal} onOpenChange={setModal} title={editando ? "Editar produto" : "Novo produto"} wide>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Nome *" value={form.nome} onChange={set("nome")} />
          <AdminField label="Slug (URL)" value={form.slug} onChange={set("slug")} hint="Deixe vazio para gerar a partir do nome." />
          <AdminField label="Descrição curta" value={form.descricao_curta} onChange={set("descricao_curta")} className="sm:col-span-2" />
          <AdminField label="Descrição completa" textarea={5} value={form.descricao} onChange={set("descricao")} className="sm:col-span-2" />
          <AdminField label="Preço (R$) *" type="number" step="0.01" value={form.preco} onChange={set("preco")} />
          <AdminField label="Preço antigo (R$)" type="number" step="0.01" value={form.preco_antigo} onChange={set("preco_antigo")} />
          <AdminField label="Modelo" value={form.modelo} onChange={set("modelo")} options={[{ value: "acrilico", label: "Acrílico" }, { value: "pvc", label: "PVC" }, { value: "metal", label: "Metal" }, { value: "outro", label: "Outro" }]} />
          <AdminField label="Estoque" type="number" value={form.estoque} onChange={set("estoque")} />
          <AdminField label="Prazo de produção" value={form.prazo_producao} onChange={set("prazo_producao")} placeholder="Ex.: até 5 dias úteis" />
          <AdminField label="Imagens (uma URL por linha)" textarea={3} value={form.imagens} onChange={set("imagens")} hint="Opcional: envie as imagens na área de arquivos e cole as URLs." />
          <AdminField label="Itens inclusos (um por linha)" textarea={4} value={form.itens_inclusos} onChange={set("itens_inclusos")} />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[12px] text-white/65">
              <input type="checkbox" checked={!!form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo na loja
            </label>
            <label className="flex items-center gap-2 text-[12px] text-white/65">
              <input type="checkbox" checked={!!form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} /> Destaque
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">Cancelar</button>
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60">
              {salvando && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}