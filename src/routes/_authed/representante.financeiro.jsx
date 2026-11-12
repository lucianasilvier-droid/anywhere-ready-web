import { createFileRoute } from "@tanstack/react-router";
import { Wallet, CheckCircle2, Clock, FileText } from "lucide-react";
import usePainelRepresentante from "@/hooks/usePainelRepresentante";
import CobrarSaldo from "@/components/representante/CobrarSaldo";
import SemVinculo, { PainelCarregando } from "@/components/representante/SemVinculo";
import TabelaVendas from "@/components/representante/TabelaVendas";
import { brl, dataCurta, dataHora } from "@/lib/format";
import { STATUS_SOLICITACAO } from "@/lib/representante-ui";

export const Route = createFileRoute("/_authed/representante/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Representante" }] }),
  component: FinanceiroRepresentante,
});

function FinanceiroRepresentante() {
  const { painel, carregando, erro, recarregar } = usePainelRepresentante();
  if (carregando) return <PainelCarregando />;
  if (!painel?.vinculado) return <SemVinculo erro={erro} />;

  const { metricas, solicitacoes, vendas } = painel;
  const pagas = vendas.filter((v) => v.status_comissao === "paga");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-extrabold text-white">Financeiro</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Saldo, comissões e histórico de pagamentos. A comissão é liberada após a confirmação do
          pagamento do cliente.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
            <Wallet className="h-4 w-4" /> Saldo disponível para saque
          </p>
          <p className="mt-2 font-heading text-3xl font-extrabold text-white">
            {brl(metricas.comissao_disponivel)}
          </p>
          <CobrarSaldo className="mt-4" metricas={metricas} solicitacoes={solicitacoes} onEnviado={recarregar} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <CheckCircle2 className="h-3.5 w-3.5" /> Comissões recebidas
            </p>
            <p className="mt-1.5 font-heading text-xl font-extrabold text-white">{brl(metricas.comissao_paga)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <Clock className="h-3.5 w-3.5" /> Comissões pendentes
            </p>
            <p className="mt-1.5 font-heading text-xl font-extrabold text-white">
              {brl(metricas.comissao_aguardando + metricas.comissao_solicitada)}
            </p>
            <p className="mt-0.5 text-[10.5px] text-white/35">
              {brl(metricas.comissao_solicitada)} em solicitação
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-bold text-white">
          <FileText className="h-4 w-4 text-primary" /> Histórico de pagamentos
        </h2>
        {solicitacoes.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-[12.5px] text-white/45">
            Nenhuma solicitação de pagamento registrada.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-3 py-2.5">Solicitação</th>
                  <th className="px-3 py-2.5">Solicitada em</th>
                  <th className="px-3 py-2.5">Valor</th>
                  <th className="px-3 py-2.5">Comissões</th>
                  <th className="px-3 py-2.5">Situação</th>
                  <th className="px-3 py-2.5">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {solicitacoes.map((s) => {
                  const info = STATUS_SOLICITACAO[s.status] || { label: s.status, cls: "" };
                  return (
                    <tr key={s.id} className="text-[12px]">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-white/70">{s.numero}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{dataCurta(s.solicitado_em)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-white">{brl(s.valor)}</td>
                      <td className="px-3 py-2.5 text-white/50">{s.quantidade_comissoes || (s.vendas || []).length}</td>
                      <td className="px-3 py-2.5">
                        <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.cls}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[11px] text-white/40">
                        {s.comprovante || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm font-bold text-white">Comissões pagas</h2>
        <TabelaVendas vendas={pagas} />
        {pagas.length > 0 && (
          <p className="mt-2 text-[11px] text-white/30">
            Último pagamento registrado em {dataHora(pagas[0].paga_em)}.
          </p>
        )}
      </section>
    </div>
  );
}