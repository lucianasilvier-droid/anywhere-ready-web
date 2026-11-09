import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Users, Target, Coins, Wallet, Clock, CheckCircle2, Package, Globe, ExternalLink } from "lucide-react";
import { PRECO_SITE } from "@/lib/preco-site";
import usePainelRepresentante from "@/hooks/usePainelRepresentante";
import SemVinculo, { PainelCarregando } from "@/components/representante/SemVinculo";
import TabelaVendas from "@/components/representante/TabelaVendas";
import StatCard from "@/components/admin/StatCard";
import { brl, dataHora } from "@/lib/format";
import { TABELA_COMISSAO } from "@/lib/comissoes";
import { STATUS_SOLICITACAO } from "@/lib/representante-ui";
import CobrarSaldo from "@/components/representante/CobrarSaldo";

export const Route = createFileRoute("/_authed/representante/")({
  head: () => ({ meta: [{ title: "Meu dashboard — Representante" }] }),
  component: DashboardRepresentante,
});

function DashboardRepresentante() {
  const { painel, carregando, erro, recarregar } = usePainelRepresentante();

  if (carregando) return <PainelCarregando />;
  if (!painel?.vinculado) return <SemVinculo erro={erro} />;

  const { representante, metricas, vendas, solicitacoes } = painel;
  const sites = painel.sites || [];

  const atividades = [
    ...vendas.map((v) => ({
      id: `v-${v.id}`,
      quando: v.data_venda || v.created_date,
      titulo: `Venda ${v.numero} · ${v.cliente_nome || "cliente"}`,
      detalhe: `Comissão ${brl(v.comissao_valor)} · ${v.status_comissao === "paga" ? "paga" : v.status_comissao === "disponivel" ? "liberada" : v.status_comissao === "solicitada" ? "em solicitação" : "aguardando pagamento do cliente"}`,
    })),
    ...solicitacoes.map((s) => ({
      id: `s-${s.id}`,
      quando: s.decidido_em || s.solicitado_em,
      titulo: `Solicitação ${s.numero} · ${brl(s.valor)}`,
      detalhe: STATUS_SOLICITACAO[s.status]?.label || s.status,
    })),
  ]
    .filter((a) => a.quando)
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">
          Representante comercial
        </p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">{representante.nome}</h1>
        <p className="mt-1 text-[13px] text-white/45">
          {representante.codigo ? `Código ${representante.codigo} · ` : ""}
          {representante.email}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Total de vendas" value={metricas.total_vendas} hint={`${brl(metricas.valor_total_vendido)} vendidos`} />
        <StatCard icon={Users} label="Clientes conquistados" value={metricas.total_clientes} accent="#4285F4" />
        <StatCard
          icon={Package}
          label="Serviços vendidos"
          value={metricas.servicos.perfil_google + metricas.servicos.mensalidade + metricas.servicos.placa + (metricas.servicos.site || 0) + (metricas.servicos.mensalidade_site || 0)}
          hint={`${metricas.servicos.perfil_google} perfis · ${metricas.servicos.mensalidade} mensalidades · ${metricas.servicos.placa} placas · ${metricas.servicos.site || 0} sites · ${metricas.servicos.mensalidade_site || 0} mensalidades de site`}
          accent="#34A853"
        />
        <StatCard icon={Coins} label="Comissões acumuladas" value={brl(metricas.comissao_acumulada)} accent="#a855f7" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
            <Wallet className="h-3.5 w-3.5" /> Disponível para saque
          </p>
          <p className="mt-1.5 font-heading text-2xl font-extrabold text-white">{brl(metricas.comissao_disponivel)}</p>
          <CobrarSaldo className="mt-3" metricas={metricas} solicitacoes={solicitacoes} onEnviado={recarregar} />
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
            <Clock className="h-3.5 w-3.5" /> Pendente de liberação
          </p>
          <p className="mt-1.5 font-heading text-2xl font-extrabold text-white">{brl(metricas.comissao_aguardando + metricas.comissao_solicitada)}</p>
          <p className="mt-0.5 text-[10.5px] text-white/35">
            {brl(metricas.comissao_solicitada)} em solicitação de pagamento
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            <CheckCircle2 className="h-3.5 w-3.5" /> Já pagos
          </p>
          <p className="mt-1.5 font-heading text-2xl font-extrabold text-white">{brl(metricas.comissao_paga)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="font-heading text-sm font-bold text-white">Quanto você ganha</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { titulo: "Criação do perfil no Google", cliente: `Cliente paga ${brl(TABELA_COMISSAO.perfil_google.valor)}`, ganho: representante.comissao_perfil, sufixo: "por perfil" },
            { titulo: "Administração mensal do perfil", cliente: `Cliente paga ${brl(TABELA_COMISSAO.mensalidade.valor)}/mês · serviço executado pelo sistema`, ganho: TABELA_COMISSAO.mensalidade.comissao, sufixo: "por mês, por cliente" },
            { titulo: "Somente placa NFC", cliente: `A partir de ${brl(TABELA_COMISSAO.placa.valorUnidade)}`, ganho: representante.comissao_placa, sufixo: "por placa" },
            { titulo: "Criação de site", cliente: `Sites de ${brl(PRECO_SITE.minimo)} a ${brl(PRECO_SITE.maximo)}`, ganhoTexto: `${Math.round(TABELA_COMISSAO.site.percentual * 100)}%`, sufixo: "do valor do site" },
            { titulo: "Administração do site", cliente: `Cliente paga ${brl(TABELA_COMISSAO.mensalidade_site.valor)}/mês`, ganho: TABELA_COMISSAO.mensalidade_site.comissao, sufixo: "por mês, por site" },
          ].map((c) => (
            <div key={c.titulo} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-white">{c.titulo}</p>
              <p className="text-[10.5px] text-white/40">{c.cliente}</p>
              <p className="mt-1 font-heading text-lg font-extrabold text-emerald-300">{c.ganhoTexto || brl(c.ganho)} <span className="text-[10.5px] font-normal text-white/40">{c.sufixo}</span></p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-bold text-white">
          <Globe className="h-4 w-4 text-primary" /> Meus sites
        </h2>
        {sites.length === 0 ? (
          <p className="mt-2 text-[12px] text-white/45">
            Nenhum site vinculado a você ainda. Quando a equipe criar um site para um cliente seu, ele aparece aqui com o valor e a sua comissão.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {sites.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-white">{s.empresa}</p>
                  <a href={`/site/${s.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#8ab4f8] hover:underline">
                    {s.dominio || `/site/${s.slug}`} <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-[10.5px] text-white/35">
                    {s.status === "publicado" ? "Publicado" : s.status === "desativado" ? "Desativado" : "Demonstração"}
                    {s.mensalidade_contratada ? " · com administração mensal" : ""}
                  </p>
                  {s.argumento_cliente && <p className="mt-1 max-w-md text-[11px] italic text-white/45">“{s.argumento_cliente}”</p>}
                </div>
                <div className="text-right text-[11px] text-white/45">
                  <p>Valor do site {brl(s.valor)}</p>
                  <p className="font-heading text-base font-extrabold text-emerald-300">{brl(s.comissao)}</p>
                  {s.comissao_mensal > 0 && <p className="text-emerald-300/80">+ {brl(s.comissao_mensal)}/mês</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {sites.some((s) => s.comissao_mensal > 0) && (
          <p className="mt-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2 text-[11.5px] text-emerald-200">
            Carteira vitalícia de sites: {brl(sites.reduce((t, s) => t + (s.comissao_mensal || 0), 0))} por mês, enquanto os clientes mantiverem os sites.
          </p>
        )}
        <p className="mt-2 text-[10.5px] text-white/30">A comissão é liberada depois que o pagamento do cliente é confirmado.</p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold text-white">Últimas vendas</h2>
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Target className="h-3 w-3" /> {metricas.total_vendas} no total
          </span>
        </div>
        <TabelaVendas vendas={vendas.slice(0, 6)} compacta />
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm font-bold text-white">Histórico de atividades</h2>
        {atividades.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-[12.5px] text-white/45">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.08]">
            {atividades.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-white">{a.titulo}</p>
                  <p className="text-[11px] text-white/40">{a.detalhe}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] text-white/30">{dataHora(a.quando)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}