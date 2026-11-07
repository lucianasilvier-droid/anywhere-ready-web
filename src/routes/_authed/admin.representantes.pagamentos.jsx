import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Banknote } from "lucide-react";
import { adminRepresentantesFn, decidirSolicitacaoFn } from "@/lib/representantes-fns";
import SolicitacoesAdmin from "@/components/admin/representantes/SolicitacoesAdmin";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/representantes/pagamentos")({
  component: PagamentosRepresentantesPage,
});

function PagamentosRepresentantesPage() {
  const carregarDados = useServerFn(adminRepresentantesFn);
  const decidir = useServerFn(decidirSolicitacaoFn);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState("");

  const carregar = useCallback(async () => {
    try {
      setDados(await carregarDados());
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as solicitações.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function acao(id, tipo, extra = {}) {
    setProcessando(id);
    try {
      await decidir({ data: { id, acao: tipo, ...extra } });
      toast.success(
        tipo === "aprovar"
          ? "Solicitação aprovada."
          : tipo === "rejeitar"
            ? "Solicitação rejeitada e comissões devolvidas ao saldo."
            : "Pagamento registrado no histórico dos dois painéis.",
      );
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível concluir a ação.");
    } finally {
      setProcessando("");
    }
  }

  const pendentes = (dados?.solicitacoes || []).filter((s) => s.status === "pendente");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
            <Banknote className="h-3.5 w-3.5" /> Aguardando aprovação
          </p>
          <p className="mt-1.5 font-heading text-xl font-extrabold text-white">
            {brl(dados?.totais?.solicitacoes_valor || 0)}
          </p>
          <p className="mt-0.5 text-[10.5px] text-white/35">{pendentes.length} solicitação(ões)</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Comissões pagas
          </p>
          <p className="mt-1.5 font-heading text-xl font-extrabold text-white">
            {brl(dados?.totais?.comissao_paga || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Saldo liberado dos representantes
          </p>
          <p className="mt-1.5 font-heading text-xl font-extrabold text-white">
            {brl(dados?.totais?.comissao_disponivel || 0)}
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando solicitações...
        </div>
      ) : (
        <SolicitacoesAdmin solicitacoes={dados?.solicitacoes || []} onAcao={acao} processando={processando} />
      )}
    </div>
  );
}