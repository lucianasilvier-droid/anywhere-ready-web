import { useState } from "react";
import { Check, Loader2, X, Banknote } from "lucide-react";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import { brl, dataCurta } from "@/lib/format";
import { STATUS_SOLICITACAO } from "@/lib/representante-ui";

export default function SolicitacoesAdmin({ solicitacoes, onAcao, processando }) {
  const [pagando, setPagando] = useState(null);
  const [comprovante, setComprovante] = useState("");
  const [observacoes, setObservacoes] = useState("");

  if (!solicitacoes?.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center text-[12.5px] text-white/45">
        Nenhuma solicitação de pagamento recebida.
      </div>
    );
  }

  async function confirmarPagamento(e) {
    e.preventDefault();
    const alvo = pagando;
    setPagando(null);
    await onAcao(alvo.id, "pagar", { comprovante, observacoes });
    setComprovante("");
    setObservacoes("");
  }

  return (
    <>
      <div className="space-y-2.5">
        {solicitacoes.map((s) => {
          const info = STATUS_SOLICITACAO[s.status] || { label: s.status, cls: "" };
          const ocupado = processando === s.id;
          return (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-[13.5px] font-bold text-white">
                    {s.representante_nome}
                  </p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.cls}`}>
                    {info.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {s.numero} · solicitada em {dataCurta(s.solicitado_em)} ·{" "}
                  {s.quantidade_comissoes || (s.vendas || []).length} comissão(ões)
                  {s.comprovante ? ` · comprovante ${s.comprovante}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-1 font-heading text-lg font-extrabold text-primary">{brl(s.valor)}</p>

                {s.status === "pendente" && (
                  <>
                    <button
                      onClick={() => onAcao(s.id, "aprovar")}
                      disabled={ocupado}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 disabled:opacity-50"
                    >
                      {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Aprovar
                    </button>
                    <button
                      onClick={() => onAcao(s.id, "rejeitar")}
                      disabled={ocupado}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-300 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Rejeitar
                    </button>
                  </>
                )}

                {["pendente", "aprovada"].includes(s.status) && (
                  <button
                    onClick={() => setPagando(s)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-[#0a1128]"
                  >
                    <Banknote className="h-3 w-3" /> Registrar pagamento
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!pagando} onOpenChange={(o) => !o && setPagando(null)} title="Registrar pagamento da comissão">
        <form onSubmit={confirmarPagamento} className="space-y-3">
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] text-white/60">
            {pagando?.representante_nome} · <strong className="text-primary">{brl(pagando?.valor || 0)}</strong>
          </p>
          <AdminField
            label="Comprovante ou referência"
            value={comprovante}
            onChange={(e) => setComprovante(e.target.value)}
            placeholder="PIX, comprovante, ID da transferência"
            hint="Fica registrado no histórico dos dois painéis."
          />
          <AdminField label="Observações" textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPagando(null)}
              className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
            >
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">
              Confirmar pagamento
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}