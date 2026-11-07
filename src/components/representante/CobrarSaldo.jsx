import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { solicitarPagamentoFn } from "@/lib/representantes-fns";
import { brl } from "@/lib/format";

/** Botão "Cobrar meu saldo": abre a solicitação de pagamento das comissões disponíveis. */
export default function CobrarSaldo({ metricas, solicitacoes, onEnviado, className = "" }) {
  const solicitar = useServerFn(solicitarPagamentoFn);
  const [enviando, setEnviando] = useState(false);
  const pendenteAprovacao = solicitacoes.some((s) => s.status === "pendente");
  const pode = metricas.comissao_disponivel > 0 && !pendenteAprovacao;

  async function cobrar() {
    setEnviando(true);
    try {
      const r = await solicitar();
      toast.success(`Cobrança ${r?.solicitacao?.numero || ""} enviada no valor de ${brl(r?.solicitacao?.valor || 0)}.`);
      await onEnviado?.();
    } catch (e) {
      toast.error(e?.message || "Não foi possível cobrar o saldo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={cobrar}
        disabled={!pode || enviando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-3 text-[12.5px] font-bold uppercase tracking-wider text-[#0a1128] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Cobrar meu saldo {metricas.comissao_disponivel > 0 ? `(${brl(metricas.comissao_disponivel)})` : ""}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-white/40">
        {pendenteAprovacao
          ? "Você já tem uma cobrança aguardando aprovação do administrador."
          : metricas.comissao_disponivel > 0
            ? "A cobrança inclui todas as comissões disponíveis e vai para o painel administrativo."
            : "Nenhuma comissão liberada no momento. A liberação acontece após o pagamento do cliente."}
      </p>
    </div>
  );
}
