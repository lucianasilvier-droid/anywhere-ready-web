import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, ShoppingBag, Truck, ExternalLink, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEntityList } from "@/hooks/useEntityList";
import StatusPill from "@/components/admin/StatusPill";
import { brl, dataHora, STATUS_PAGAMENTO, STATUS_PRODUCAO } from "@/lib/format";

export const Route = createFileRoute("/_authed/conta/pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — Google NFC Connect" }] }),
  component: PedidosCliente,
});

function PedidosCliente() {
  const { user } = useAuth();
  const { items, loading } = useEntityList("Pedido", { cliente_email: user?.email }, { limit: 100 });
  const { items: placas } = useEntityList("PlacaNFC", { cliente_email: user?.email }, { limit: 100 });
  const [aberto, setAberto] = useState(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-white">Meus pedidos</h1>
        <p className="mt-1 text-[12.5px] text-white/45">
          Pagamento, produção e entrega de cada placa, com o endereço exclusivo configurado.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pedidos...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">Nenhum pedido encontrado.</p>
          <Link to="/loja" className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">
            Ver placas NFC
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const placasDoPedido = placas.filter((pl) => pl.pedido_id === p.id);
            const expandido = aberto === p.id;
            return (
              <article key={p.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <button onClick={() => setAberto(expandido ? null : p.id)} className="flex w-full items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] font-semibold text-white">{p.numero}</p>
                    <p className="text-[10.5px] text-white/35">{dataHora(p.created_date)} · {brl(p.total)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusPill map={STATUS_PAGAMENTO} value={p.status_pagamento} />
                    <StatusPill map={STATUS_PRODUCAO} value={p.status_producao} />
                    <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${expandido ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expandido && (
                  <div className="mt-3 space-y-3 border-t border-white/[0.07] pt-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Itens</p>
                        <ul className="mt-1 space-y-0.5 text-[12px] text-white/60">
                          {(p.itens || []).map((i, idx) => (
                            <li key={idx}>{i.quantidade}× {i.nome} — {brl(i.preco * i.quantidade)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Entrega</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                          {p.endereco} — {p.cidade}/{p.estado} {p.cep}
                        </p>
                        {p.codigo_rastreio && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-primary">
                            <Truck className="h-3.5 w-3.5" /> Rastreio: {p.codigo_rastreio}
                          </p>
                        )}
                      </div>
                    </div>

                    {p.personalizacao && (
                      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[11.5px] text-white/55">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Personalização</p>
                        <p className="mt-1">Nome na placa: {p.personalizacao.nome_exibicao || "—"}</p>
                        {p.personalizacao.google_link && (
                          <a href={p.personalizacao.google_link} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-primary hover:underline">
                            <ExternalLink className="h-3 w-3 shrink-0" /> Link do Google
                          </a>
                        )}
                        {p.personalizacao.instagram_link && (
                          <a href={p.personalizacao.instagram_link} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-primary hover:underline">
                            <ExternalLink className="h-3 w-3 shrink-0" /> Instagram
                          </a>
                        )}
                      </div>
                    )}

                    {placasDoPedido.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Placas deste pedido</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {placasDoPedido.map((pl) => (
                            <Link
                              key={pl.id}
                              to="/placa/$code"
                              params={{ code: pl.codigo }}
                              className="rounded-full border border-white/12 px-2.5 py-1 font-mono text-[10.5px] text-primary hover:border-primary/40"
                            >
                              {pl.codigo}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10.5px] leading-relaxed text-white/30">
                      O pagamento é combinado com a equipe. O status “pago” só é registrado após a
                      confirmação real do pagamento.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}