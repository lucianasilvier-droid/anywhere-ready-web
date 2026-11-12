import { brl, dataCurta } from "@/lib/format";
import { TIPO_INFO, STATUS_VENDA, STATUS_COMISSAO } from "@/lib/representante-ui";

export default function TabelaVendas({ vendas, compacta }) {
  if (!vendas?.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-[12.5px] text-white/45">
        Nenhuma venda registrada até o momento.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
          <tr>
            <th className="px-3 py-2.5">Cliente</th>
            <th className="px-3 py-2.5">Serviço</th>
            {!compacta && <th className="px-3 py-2.5">Data</th>}
            <th className="px-3 py-2.5">Valor</th>
            <th className="px-3 py-2.5">Comissão</th>
            <th className="px-3 py-2.5">Venda</th>
            <th className="px-3 py-2.5">Comissão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {vendas.map((venda) => {
            const tipo = TIPO_INFO[venda.tipo] || { label: venda.tipo, cls: "bg-white/8 text-white/60" };
            const status = STATUS_VENDA[venda.status] || { label: venda.status, cls: "" };
            const comissao = STATUS_COMISSAO[venda.status_comissao] || { label: venda.status_comissao, cls: "" };
            return (
              <tr key={venda.id} className="text-[12px] hover:bg-white/[0.02]">
                <td className="max-w-[190px] px-3 py-2.5">
                  <p className="truncate font-semibold text-white">{venda.cliente_nome || "—"}</p>
                  <p className="truncate text-[10.5px] text-white/35">
                    {venda.cliente_email || venda.numero}
                    {venda.competencia ? ` · ${venda.competencia}` : ""}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tipo.cls}`}>
                    {tipo.label}
                  </span>
                  {venda.tipo === "placa" && Number(venda.quantidade) > 1 && (
                    <span className="ml-1 text-[10px] text-white/40">{venda.quantidade} un.</span>
                  )}
                </td>
                {!compacta && <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{dataCurta(venda.data_venda)}</td>}
                <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{brl(venda.valor_venda)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-primary">{brl(venda.comissao_valor)}</td>
                <td className="px-3 py-2.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${comissao.cls}`}>
                    {comissao.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}