import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Search, Package, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import StatusPill from "@/components/admin/StatusPill";
import EmptyState from "@/components/admin/EmptyState";
import AdminField from "@/components/admin/AdminField";
import { brl, dataHora, STATUS_PAGAMENTO, STATUS_PRODUCAO } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel" }] }),
  component: PedidosPage,
});

function PedidosPage() {
  const { items, loading, reload } = useEntityList("Pedido", {}, { limit: 300 });
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [placas, setPlacas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const filtrados = items.filter((p) =>
    `${p.numero} ${p.cliente_nome} ${p.cliente_email} ${p.cliente_telefone}`.toLowerCase().includes(busca.toLowerCase()),
  );

  useEffect(() => {
    if (!selecionado) return;
    base44.entities.PlacaNFC.filter({ pedido_id: selecionado.id }, { limit: 20 })
      .then((page) => setPlacas(Array.isArray(page) ? page : page?.items || []))
      .catch(() => setPlacas([]));
  }, [selecionado]);

  async function atualizar(campo, valor) {
    const anterior = selecionado;
    setSelecionado({ ...selecionado, [campo]: valor });
    setSalvando(true);
    try {
      await base44.entities.Pedido.update(anterior.id, { [campo]: valor });
      await base44.entities.AtividadeLog.create({
        acao: "Pedido atualizado",
        entidade: "Pedido",
        registro_id: anterior.id,
        detalhe: `${anterior.numero}: ${campo} → ${valor}`,
      });
      toast.success("Pedido atualizado.");
      await reload();
    } catch (e) {
      setSelecionado(anterior);
      toast.error(e?.message || "Não foi possível atualizar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Loja</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Pedidos</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Acompanhe pagamento, produção, envio e as placas NFC de cada pedido.
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou e-mail"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pedidos...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhum pedido ainda" description="Os pedidos feitos na loja aparecem aqui automaticamente, com os dados de personalização da placa." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5">Pedido</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Pagamento</th>
                <th className="px-4 py-2.5">Produção</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtrados.map((p) => (
                <tr key={p.id} className="text-[12.5px] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-[11.5px] font-semibold text-white">{p.numero}</p>
                    <p className="text-[10.5px] text-white/30">{dataHora(p.created_date)}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-white">{p.cliente_nome}</p>
                    <p className="text-[10.5px] text-white/35">{p.cliente_email}</p>
                    {p.representante_nome && (
                      <p className="text-[10.5px] text-primary/80">Indicado por {p.representante_nome}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-primary">{brl(p.total)}</td>
                  <td className="px-4 py-2.5"><StatusPill map={STATUS_PAGAMENTO} value={p.status_pagamento} /></td>
                  <td className="px-4 py-2.5"><StatusPill map={STATUS_PRODUCAO} value={p.status_producao} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setSelecionado(p)} className="text-[11.5px] font-semibold text-primary hover:underline">
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selecionado && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSelecionado(null)}>
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0b1424] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-heading text-lg font-bold text-white">{selecionado.numero}</p>
                <p className="text-[11.5px] text-white/40">{dataHora(selecionado.created_date)}</p>
              </div>
              <button onClick={() => setSelecionado(null)} className="rounded-full border border-white/12 px-3 py-1 text-[11px] text-white/60">
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12px] text-white/60">
              <p className="font-semibold text-white">{selecionado.cliente_nome}</p>
              <p>{selecionado.cliente_email}</p>
              <p>{selecionado.cliente_telefone}</p>
              <p>{selecionado.endereco} — {selecionado.cidade}/{selecionado.estado} {selecionado.cep}</p>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
                <Package className="h-3.5 w-3.5" /> Itens
              </p>
              <ul className="mt-1.5 space-y-1 text-[12px] text-white/60">
                {(selecionado.itens || []).map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{i.quantidade}× {i.nome}</span>
                    <span>{brl(i.preco * i.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[11.5px] text-white/45">
                <p className="flex justify-between"><span>Subtotal</span><span>{brl(selecionado.subtotal)}</span></p>
                <p className="flex justify-between"><span>Frete</span><span>{brl(selecionado.frete)}</span></p>
                <p className="flex justify-between font-semibold text-white"><span>Total</span><span>{brl(selecionado.total)}</span></p>
              </div>
            </div>

            {selecionado.personalizacao && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12px] text-white/60">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Personalização</p>
                <p className="mt-1">Empresa: {selecionado.personalizacao.empresa || "—"}</p>
                <p>Nome na placa: {selecionado.personalizacao.nome_exibicao || "—"}</p>
                <p className="break-all">Google: {selecionado.personalizacao.google_link || "—"}</p>
                <p className="break-all">Instagram: {selecionado.personalizacao.instagram_link || "—"}</p>
                {selecionado.personalizacao.observacoes && <p className="mt-1">Obs.: {selecionado.personalizacao.observacoes}</p>}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <AdminField
                label="Status do pagamento"
                value={selecionado.status_pagamento}
                onChange={(e) => atualizar("status_pagamento", e.target.value)}
                options={Object.entries(STATUS_PAGAMENTO).map(([v, c]) => ({ value: v, label: c.label }))}
                hint="Marque como pago somente após confirmar o pagamento real."
              />
              <AdminField
                label="Status de produção"
                value={selecionado.status_producao}
                onChange={(e) => atualizar("status_producao", e.target.value)}
                options={Object.entries(STATUS_PRODUCAO).map(([v, c]) => ({ value: v, label: c.label }))}
              />
              <AdminField label="Método de pagamento" value={selecionado.metodo_pagamento || ""} onChange={(e) => setSelecionado({ ...selecionado, metodo_pagamento: e.target.value })} placeholder="Pix, cartão, dinheiro..." />
              <AdminField label="Código de rastreio" value={selecionado.codigo_rastreio || ""} onChange={(e) => setSelecionado({ ...selecionado, codigo_rastreio: e.target.value })} />
              <div className="flex gap-2">
                <button
                  onClick={() => atualizar("metodo_pagamento", selecionado.metodo_pagamento || "")}
                  disabled={salvando}
                  className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
                >
                  Salvar método
                </button>
                <button
                  onClick={() => atualizar("codigo_rastreio", selecionado.codigo_rastreio || "")}
                  disabled={salvando}
                  className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/70 disabled:opacity-60"
                >
                  Salvar rastreio
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Placas do pedido</p>
              {placas.length === 0 ? (
                <p className="mt-1 text-[11.5px] text-white/30">Nenhuma placa vinculada.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {placas.map((pl) => (
                    <li key={pl.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <a href={`/placa/${pl.codigo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-primary hover:underline">
                        {pl.codigo} <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-white/35">{pl.status?.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}