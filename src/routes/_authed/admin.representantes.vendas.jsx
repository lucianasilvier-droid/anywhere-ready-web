import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, ReceiptText } from "lucide-react";
import { adminRepresentantesFn, vendaAcaoFn } from "@/lib/representantes-fns";
import TabelaVendasAdmin from "@/components/admin/representantes/TabelaVendasAdmin";
import NovaVendaForm from "@/components/admin/representantes/NovaVendaForm";

export const Route = createFileRoute("/_authed/admin/representantes/vendas")({
  component: VendasPage,
});

function VendasPage() {
  const carregarDados = useServerFn(adminRepresentantesFn);
  const executarAcao = useServerFn(vendaAcaoFn);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [filtroRep, setFiltroRep] = useState("todos");

  const carregar = useCallback(async () => {
    try {
      setDados(await carregarDados());
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as vendas.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const vendas = useMemo(() => {
    const lista = dados?.vendas || [];
    return filtroRep === "todos" ? lista : lista.filter((v) => v.representante_id === filtroRep);
  }, [dados, filtroRep]);

  async function acao(id, tipo) {
    setProcessando(id);
    try {
      await executarAcao({ data: { id, acao: tipo } });
      toast.success(
        tipo === "confirmar_pagamento"
          ? "Pagamento confirmado e comissão liberada."
          : "Venda e comissão canceladas.",
      );
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível concluir a ação.");
    } finally {
      setProcessando("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <select
            value={filtroRep}
            onChange={(e) => setFiltroRep(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1729] px-3 py-2 text-[12.5px] text-white focus:border-primary/40 focus:outline-none"
          >
            <option value="todos">Todos os representantes</option>
            {(dados?.representantes || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
          <span className="text-[11.5px] text-white/35">{vendas.length} venda(s)</span>
        </div>
        <button
          onClick={() => setFormAberto(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-2 text-[12px] font-bold text-[#0a1128]"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar venda
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-[11px] leading-relaxed text-white/45">
        <ReceiptText className="mr-1 inline h-3.5 w-3.5 text-primary/70" />
        Regras aplicadas no servidor: perfil no Google R$ 150,00 → R$ 100,00 de comissão; mensalidade
        R$ 150,00 → R$ 100,00 por competência paga; placa NFC R$ 20,00 por unidade. A comissão é
        liberada para saque somente após confirmar o pagamento do cliente.
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando vendas...
        </div>
      ) : (
        <TabelaVendasAdmin vendas={vendas} onAcao={acao} processando={processando} />
      )}

      <NovaVendaForm
        open={formAberto}
        onOpenChange={setFormAberto}
        representantes={dados?.representantes || []}
        onSalvo={carregar}
      />
    </div>
  );
}