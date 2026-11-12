import { Check, Loader2, X } from "lucide-react";
import { brl, dataCurta } from "@/lib/format";
import { TIPO_INFO, STATUS_VENDA, STATUS_COMISSAO } from "@/lib/representante-ui";

export default function TabelaVendasAdmin({ vendas, onAcao, processando }) {
  if (!vendas?.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center text-[12.5px] text-white/45">
        Nenhuma venda registrada. Use "Registrar venda" para lançar a primeira.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
          <tr>
            <th className="px-3 py-2.5">Venda</th>
            <th className="px-3 py-2.5">Representante</th>
            <th className="px-3 py-2.5">Serviço</th>
            <th className="px-3 py-2.5">Data</th>
            <th className="px-3 py-2.5">Valor</th>
            <th className="px-3 py-2.5">Comissão</th>
            <th className="px-3 py-2.5">Empresa</th>
            <th className="px-3 py-2.5">Situação</th>
            <th className="px-3 py-2.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {vendas.map((venda) => {
            const tipo = TIPO_INFO[venda.tipo] || { label: venda.tipo, cls: "" };
            const status = STATUS_VENDA[venda.status] || { label: venda.status, cls: "" };
            const comissao = STATUS_COMISSAO[venda.status_comissao] || { label: venda.status_comissao, cls: "" };
            const ocupado = processando === venda.id;
            const podeConfirmar = venda.status === "pendente";
            const podeCancelar = !["paga", "cancelada"].includes(venda.status_comissao);
            return (
              <tr key={venda.id} className="text-[12px] hover:bg-white/[0.02]">
                <td className="max-w-[190px] px-3 py-2.5">
                  <p className="truncate font-semibold text-white">{venda.cliente_nome || "—"}</p>
                  <p className="truncate font-mono text-[10px] text-white/30">
                    {venda.numero}
                    {venda.competencia ? ` · ${venda.competencia}` : ""}
                  </p>
                </td>
                <td className="max-w-[150px] truncate px-3 py-2.5 text-white/60">{venda.representante_nome}</td>
                <td className="px-3 py-2.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tipo.cls}`}>
                    {tipo.label}
                  </span>
                  {venda.tipo === "placa" && Number(venda.quantidade) > 1 && (
                    <span className="ml-1 text-[10px] text-white/40">×{venda.quantidade}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{dataCurta(venda.data_venda)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{brl(venda.valor_venda)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-primary">{brl(venda.comissao_valor)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{brl(venda.valor_empresa)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                    <span className={`w-fit whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${comissao.cls}`}>
                      {comissao.label}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {podeConfirmar && (
                      <button
                        onClick={() => onAcao(venda.id, "confirmar_pagamento")}
                        disabled={ocupado}
                        title="Confirmar pagamento do cliente e liberar a comissão"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10.5px] font-bold text-emerald-300 disabled:opacity-50"
                      >
                        {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Pago
                      </button>
                    )}
                    {podeCancelar && (
                      <button
                        onClick={() => onAcao(venda.id, "cancelar")}
                        disabled={ocupado}
                        title="Cancelar venda e comissão"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10.5px] font-bold text-red-300 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}