import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Users2, Coins, Wallet, Search } from "lucide-react";
import { adminRepresentantesFn } from "@/lib/representantes-fns";
import RepCard from "@/components/admin/representantes/RepCard";
import RepForm from "@/components/admin/representantes/RepForm";
import StatCard from "@/components/admin/StatCard";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/representantes/")({
  component: RepresentantesPage,
});

function RepresentantesPage() {
  const carregarDados = useServerFn(adminRepresentantesFn);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await carregarDados());
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar os representantes.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const representantes = dados?.representantes || [];
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? representantes.filter((r) =>
        `${r.nome} ${r.email} ${r.user_email || ""} ${r.codigo || ""}`.toLowerCase().includes(termo),
      )
    : representantes;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users2}
          label="Representantes"
          value={dados?.totais?.representantes ?? "—"}
          hint={`${dados?.totais?.ativos ?? 0} ativos`}
        />
        <StatCard
          icon={Coins}
          label="Comissões geradas"
          value={brl(dados?.totais?.comissao_total || 0)}
          hint={`${dados?.totais?.vendas ?? 0} venda(s)`}
          accent="#a855f7"
        />
        <StatCard
          icon={Wallet}
          label="Disponível para saque"
          value={brl(dados?.totais?.comissao_disponivel || 0)}
          accent="#34A853"
        />
        <StatCard
          icon={Coins}
          label="Solicitações pendentes"
          value={dados?.totais?.solicitacoes_pendentes ?? 0}
          hint={brl(dados?.totais?.solicitacoes_valor || 0)}
          accent="#FBBC05"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar representante</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou código"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
          />
        </label>
        <button
          onClick={() => {
            setEditando(null);
            setFormAberto(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-2 text-[12px] font-bold text-[#0a1128]"
        >
          <Plus className="h-3.5 w-3.5" /> Novo representante
        </button>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando representantes...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <Users2 className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">
            {representantes.length ? "Nenhum representante encontrado." : "Nenhum representante cadastrado ainda."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-white/35">
            Cadastre o representante, vincule o e-mail de login e defina as comissões. As vendas e os
            pagamentos ficam disponíveis na sequência.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtrados.map((rep) => (
            <RepCard
              key={rep.id}
              rep={rep}
              onAtualizado={carregar}
              onEditar={(selecionado) => {
                setEditando(selecionado);
                setFormAberto(true);
              }}
            />
          ))}
        </div>
      )}

      <RepForm open={formAberto} onOpenChange={setFormAberto} representante={editando} onSalvo={carregar} />
    </div>
  );
}