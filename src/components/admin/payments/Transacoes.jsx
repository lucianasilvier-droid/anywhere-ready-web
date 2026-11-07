import { useState } from "react";
import { Bell, CreditCard, Search } from "lucide-react";
import { brl, dataHora } from "@/lib/format";
import StatusPill from "@/components/admin/StatusPill";
import EmptyState from "@/components/admin/EmptyState";

const STATUS = {
  pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  recusado: { label: "Recusado", cls: "bg-red-500/10 text-red-300 border-red-500/30" },
  expirado: { label: "Expirado", cls: "bg-white/5 text-white/55 border-white/15" },
  cancelado: { label: "Cancelado", cls: "bg-white/5 text-white/55 border-white/15" },
  reembolso_solicitado: { label: "Reembolso solicitado", cls: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
  reembolsado: { label: "Reembolsado", cls: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
};

const PROVEDOR = { mercadopago: "Mercado Pago", infinitepay: "InfinitePay" };

export default function Transacoes({
  pagamentos = [],
  notificacoes = [],
  onReembolso,
  reembolsando = "",
}) {
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("transacoes");

  const filtrados = pagamentos.filter((p) =>
    `${p.pedido_numero} ${p.codigo} ${p.provedor_payment_id} ${p.status} ${p.provedor}`
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Histórico e monitoramento
          </p>
          <p className="mt-1 text-[12px] text-white/45">
            {pagamentos.length} transação(ões) · {notificacoes.length} notificação(ões) registradas
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1">
          {[
            { id: "transacoes", label: "Transações", icon: CreditCard },
            { id: "notificacoes", label: "Notificações", icon: Bell },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                aba === item.id ? "bg-primary text-primary-foreground" : "text-white/55"
              }`}
            >
              <item.icon className="h-3 w-3" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      {aba === "transacoes" && (
        <>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pedido, código ou identificador do provedor"
              className="w-full bg-transparent text-[12px] text-white placeholder:text-white/25 focus:outline-none"
            />
          </label>

          {filtrados.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={CreditCard}
                title="Nenhuma transação registrada"
                description="Assim que um cliente iniciar um pagamento no checkout, ela aparece aqui com o status real do provedor."
              />
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[11.5px]">
                <thead className="text-[10px] uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="py-2 pr-3">Pedido</th>
                    <th className="py-2 pr-3">Provedor</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Criada em</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">ID no provedor</th>
                    <th className="py-2 pr-3">Observações</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-white/70">
                  {filtrados.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold text-white">{p.pedido_numero || "—"}</span>
                        <span className="block font-mono text-[10px] text-white/30">{p.codigo}</span>
                      </td>
                      <td className="py-2.5 pr-3">{PROVEDOR[p.provedor] || p.provedor}</td>
                      <td className="py-2.5 pr-3 text-white">{brl(p.valor)}</td>
                      <td className="py-2.5 pr-3 text-white/50">{dataHora(p.criado_em)}</td>
                      <td className="py-2.5 pr-3">
                        <StatusPill map={STATUS} value={p.status} />
                      </td>
                      <td className="max-w-[150px] break-all py-2.5 pr-3 font-mono text-[10px] text-white/45">
                        {p.provedor_payment_id || "—"}
                      </td>
                      <td className="max-w-[200px] py-2.5 pr-3">
                        {p.erro ? (
                          <span className="text-[10.5px] leading-relaxed text-amber-300/90">{p.erro}</span>
                        ) : (
                          <span className="text-[10.5px] text-white/35">
                            {p.confirmado_em ? `Confirmada em ${dataHora(p.confirmado_em)}` : "Sem erros"}
                            {p.notificacoes ? ` · ${p.notificacoes} notificação(ões)` : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {p.status === "aprovado" && (
                          <button
                            type="button"
                            onClick={() => onReembolso?.(p, "solicitar")}
                            disabled={reembolsando === p.codigo}
                            className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-bold text-white/60 hover:border-primary/40 disabled:opacity-50"
                          >
                            Solicitar reembolso
                          </button>
                        )}
                        {p.status === "reembolso_solicitado" && (
                          <button
                            type="button"
                            onClick={() => onReembolso?.(p, "concluir")}
                            disabled={reembolsando === p.codigo}
                            className="rounded-full border border-sky-400/40 px-2.5 py-1 text-[10px] font-bold text-sky-300 hover:brightness-110 disabled:opacity-50"
                          >
                            {p.provedor === "mercadopago" ? "Reembolsar no Mercado Pago" : "Marcar como reembolsado"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {aba === "notificacoes" && (
        <div className="mt-3 space-y-2">
          {notificacoes.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação recebida"
              description="Os webhooks recebidos dos provedores são registrados aqui, com o resultado do processamento."
            />
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-[11px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-semibold text-white">
                    {PROVEDOR[n.provedor] || n.provedor} · {n.evento || "evento"}
                  </span>
                  <span className="text-white/35">{dataHora(n.criado_em)}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-white/40">
                  pedido {n.referencia || "—"} · transação {n.transacao || "—"}
                </p>
                <p className="mt-0.5 text-[10.5px] text-white/50">
                  {n.processado ? `Processada${n.status_aplicado ? ` · status ${n.status_aplicado}` : ""}` : "Não processada"}
                  {n.assinatura_valida ? "" : " · assinatura não validada"}
                </p>
                {n.erro && <p className="mt-1 text-[10.5px] text-amber-300/90">{n.erro}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}