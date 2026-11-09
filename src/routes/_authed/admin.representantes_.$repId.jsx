import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Pencil, Plus, Ban, PlayCircle, Trash2, Coins, ShoppingBag, Wallet,
} from "lucide-react";
import {
  decidirSolicitacaoFn,
  excluirRepresentanteFn,
  representanteDetalheFn,
  statusRepresentanteFn,
  vendaAcaoFn,
} from "@/lib/representantes-fns";
import RepForm from "@/components/admin/representantes/RepForm";
import NovaVendaForm from "@/components/admin/representantes/NovaVendaForm";
import TabelaVendasAdmin from "@/components/admin/representantes/TabelaVendasAdmin";
import SolicitacoesAdmin from "@/components/admin/representantes/SolicitacoesAdmin";
import Modal from "@/components/admin/Modal";
import ClientesDoRepresentante from "@/components/crm/ClientesDoRepresentante";
import StatCard from "@/components/admin/StatCard";
import { brl, dataCurta } from "@/lib/format";
import { STATUS_REPRESENTANTE } from "@/lib/representante-ui";

export const Route = createFileRoute("/_authed/admin/representantes_/$repId")({
  component: RepresentanteDetalhe,
});

function RepresentanteDetalhe() {
  const { repId } = Route.useParams();
  const carregarRep = useServerFn(representanteDetalheFn);
  const alternarStatus = useServerFn(statusRepresentanteFn);
  const excluir = useServerFn(excluirRepresentanteFn);
  const acaoVenda = useServerFn(vendaAcaoFn);
  const decidir = useServerFn(decidirSolicitacaoFn);

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [vendaAberta, setVendaAberta] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await carregarRep({ data: { id: repId } }));
      setErro("");
    } catch (e) {
      setErro(e?.message || "Não foi possível carregar o representante.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarStatus(status) {
    setProcessando(status);
    try {
      await alternarStatus({ data: { id: repId, status } });
      toast.success(`Situação alterada para ${STATUS_REPRESENTANTE[status].label.toLowerCase()}.`);
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível alterar a situação.");
    } finally {
      setProcessando("");
    }
  }

  async function executarVenda(id, tipo) {
    setProcessando(id);
    try {
      await acaoVenda({ data: { id, acao: tipo } });
      toast.success(tipo === "confirmar_pagamento" ? "Pagamento confirmado e comissão liberada." : "Venda cancelada.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível concluir a ação.");
    } finally {
      setProcessando("");
    }
  }

  async function decidirSolicitacao(id, tipo, extra = {}) {
    setProcessando(id);
    try {
      await decidir({ data: { id, acao: tipo, ...extra } });
      toast.success("Solicitação atualizada.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível concluir a ação.");
    } finally {
      setProcessando("");
    }
  }

  async function excluirRep() {
    setProcessando("excluir");
    try {
      await excluir({ data: { id: repId } });
      toast.success("Representante excluído.");
      window.location.replace("/admin/representantes");
    } catch (e) {
      toast.error(e?.message || "Não foi possível excluir o representante.");
      setProcessando("");
      setConfirmarExclusao(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando representante...
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
        <p className="text-sm text-white/60">{erro || "Representante não encontrado."}</p>
        <Link to="/admin/representantes" className="mt-3 inline-block text-[12.5px] font-semibold text-primary">
          Voltar para representantes
        </Link>
      </div>
    );
  }

  const { representante, metricas, vendas, solicitacoes } = dados;
  const status = STATUS_REPRESENTANTE[representante.status] || STATUS_REPRESENTANTE.ativo;

  return (
    <div className="space-y-4">
      <Link
        to="/admin/representantes"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white/45 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Representantes comerciais
      </Link>

      <header className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-extrabold text-white">{representante.nome}</h1>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-white/45">
            {representante.codigo ? `${representante.codigo} · ` : ""}
            {representante.email}
            {representante.telefone ? ` · ${representante.telefone}` : ""}
          </p>
          <p className="text-[12px] text-white/35">
            Login do painel: <strong className="text-white/60">{representante.user_email || "não vinculado"}</strong>
            {" · "}criado em {dataCurta(dados.criado_em)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Comissões: perfil {brl(representante.comissao_perfil)} · administração mensal do perfil{" "}
            {brl(50)} · placa {brl(representante.comissao_placa)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setVendaAberta(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-3 py-2 text-[11.5px] font-bold text-[#0a1128]"
          >
            <Plus className="h-3.5 w-3.5" /> Venda
          </button>
          <button
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/65 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          {representante.status === "ativo" ? (
            <button
              onClick={() => mudarStatus("inativo")}
              disabled={!!processando}
              className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/65 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> Desativar
            </button>
          ) : (
            <button
              onClick={() => mudarStatus("ativo")}
              disabled={!!processando}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11.5px] font-semibold text-emerald-300 disabled:opacity-50"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Ativar
            </button>
          )}
          <button
            onClick={() => mudarStatus("bloqueado")}
            disabled={!!processando || representante.status === "bloqueado"}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-semibold text-red-300 disabled:opacity-40"
          >
            <Ban className="h-3.5 w-3.5" /> Bloquear
          </button>
          <button
            onClick={() => setConfirmarExclusao(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-2 text-[11.5px] text-white/45 hover:text-red-300"
            title="Excluir (somente sem histórico financeiro)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Vendas" value={metricas.total_vendas} hint={`${brl(metricas.valor_total_vendido)} vendidos`} />
        <StatCard icon={Coins} label="Comissão acumulada" value={brl(metricas.comissao_acumulada)} accent="#a855f7" />
        <StatCard icon={Wallet} label="Disponível" value={brl(metricas.comissao_disponivel)} accent="#34A853" />
        <StatCard icon={Wallet} label="Já pago" value={brl(metricas.comissao_paga)} accent="#4285F4" />
      </div>

      <ClientesDoRepresentante repId={representante.id} />

      <section>
        <h2 className="mb-2 font-heading text-sm font-bold text-white">Vendas e comissões</h2>
        <TabelaVendasAdmin vendas={vendas} onAcao={executarVenda} processando={processando} />
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm font-bold text-white">Solicitações de pagamento</h2>
        <SolicitacoesAdmin solicitacoes={solicitacoes} onAcao={decidirSolicitacao} processando={processando} />
      </section>

      <RepForm
        open={formAberto}
        onOpenChange={setFormAberto}
        representante={representante}
        onSalvo={carregar}
      />
      <NovaVendaForm
        open={vendaAberta}
        onOpenChange={setVendaAberta}
        representantes={[representante]}
        representanteFixo={representante}
        onSalvo={carregar}
      />

      <Modal
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        title="Excluir representante"
      >
        <p className="text-[12.5px] leading-relaxed text-white/60">
          A exclusão só é permitida quando não existe histórico de vendas ou pagamentos. Para manter
          o histórico financeiro, use a opção <strong>Bloquear</strong>.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setConfirmarExclusao(false)}
            className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
          >
            Cancelar
          </button>
          <button
            onClick={excluirRep}
            disabled={processando === "excluir"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
          >
            {processando === "excluir" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Excluir definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}