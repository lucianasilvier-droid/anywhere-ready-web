import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, CreditCard, Pencil, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import EmptyState from "@/components/admin/EmptyState";
import { dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/placas")({
  head: () => ({ meta: [{ title: "Placas NFC — Painel" }] }),
  component: PlacassPage,
});

const STATUS = [
  { value: "aguardando_configuracao", label: "Aguardando configuração" },
  { value: "em_producao", label: "Em produção" },
  { value: "testada", label: "Testada" },
  { value: "enviada", label: "Enviada" },
  { value: "entregue", label: "Entregue" },
];

function PlacassPage() {
  const { items, loading, reload } = useEntityList("PlacaNFC", {}, { limit: 300 });
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function abrir(p) {
    setEditando(p);
    setForm({ ...p });
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await base44.entities.PlacaNFC.update(editando.id, {
        empresa: form.empresa,
        nome_exibicao: form.nome_exibicao,
        google_review_url: form.google_review_url,
        instagram_url: form.instagram_url,
        status: form.status,
        observacoes: form.observacoes,
      });
      await base44.entities.AtividadeLog.create({
        acao: "Placa NFC atualizada",
        entidade: "PlacaNFC",
        registro_id: editando.id,
        detalhe: `${editando.codigo}: links/status atualizados`,
      });
      toast.success("Placa atualizada.");
      setEditando(null);
      await reload();
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function marcarTestada(p) {
    try {
      await base44.entities.PlacaNFC.update(p.id, { status: "testada", testada_em: new Date().toISOString() });
      toast.success("Links marcados como testados.");
      await reload();
    } catch (e) {
      toast.error(e?.message || "Não foi possível atualizar.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Produção</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Placas NFC</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Cada placa tem um endereço exclusivo. Configure os links do Google e Instagram e teste
          antes de enviar.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando placas...</div>
      ) : items.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhuma placa cadastrada" description="As placas são criadas automaticamente quando um pedido é finalizado na loja." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article key={p.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold text-white">{p.empresa || p.cliente_nome}</p>
                  <p className="font-mono text-[10.5px] text-white/35">{p.codigo}</p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white/50">
                  {p.status?.replace(/_/g, " ")}
                </span>
              </div>

              <div className="mt-2.5 space-y-1 text-[11px]">
                <p className="truncate text-white/45">
                  <span className="text-white/25">Google:</span> {p.google_review_url || "não configurado"}
                </p>
                <p className="truncate text-white/45">
                  <span className="text-white/25">Instagram:</span> {p.instagram_url || "não configurado"}
                </p>
                {p.pedido_numero && <p className="text-white/30">Pedido {p.pedido_numero}</p>}
                {p.testada_em && <p className="text-emerald-300/70">Testada em {dataHora(p.testada_em)}</p>}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => abrir(p)} className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                  <Pencil className="h-3 w-3" /> Configurar
                </button>
                <a
                  href={`/placa/${p.codigo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/placa/${p.codigo}`);
                    toast.success("Link público copiado.");
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
                <button onClick={() => marcarTestada(p)} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Testada
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!editando} onOpenChange={() => setEditando(null)} title={`Configurar placa ${editando?.codigo || ""}`}>
        {form && (
          <form onSubmit={salvar} className="grid gap-3">
            <AdminField label="Empresa" value={form.empresa || ""} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            <AdminField label="Nome exibido na página" value={form.nome_exibicao || ""} onChange={(e) => setForm({ ...form, nome_exibicao: e.target.value })} />
            <AdminField
              label="Link de avaliação do Google"
              value={form.google_review_url || ""}
              onChange={(e) => setForm({ ...form, google_review_url: e.target.value })}
              placeholder="https://g.page/r/..."
              hint="Use o link oficial de avaliação gerado no Perfil da Empresa."
            />
            <AdminField
              label="Link do Instagram"
              value={form.instagram_url || ""}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="https://instagram.com/..."
            />
            <AdminField
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUS}
            />
            <AdminField label="Observações" textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            <p className="text-[11px] leading-relaxed text-white/35">
              Endereço público desta placa: <span className="font-mono text-primary">/placa/{form.codigo}</span> — é o
              endereço que deve ser gravado no chip NFC.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditando(null)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">Cancelar</button>
              <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60">
                {salvando && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}