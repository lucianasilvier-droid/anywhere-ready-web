import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, Target, ShoppingBag, Wallet, CreditCard, Briefcase, AlertTriangle, Hourglass, ArrowUpRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/admin/StatCard";
import StatusPill from "@/components/admin/StatusPill";
import { useAuth } from "@/lib/AuthContext";
import { brl, dataCurta, diasAte, STATUS_SERVICO } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/")({
  head: () => ({ meta: [{ title: "Painel administrativo — Google NFC Connect" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [alertas, setAlertas] = useState({ leads: [], pedidos: [], servicos: [] });
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [
          clientes, leads, aguardando, convertidos, pedidos, pendentes, placas,
          emAndamento, servicosPage, pedidosPagos, leadsAguardandoPage, pedidosPendentesPage,
        ] = await Promise.all([
          base44.entities.Cliente.count(),
          base44.entities.Lead.count(),
          base44.entities.Lead.count({ etapa: "aguardando_autorizacao" }),
          base44.entities.Lead.count({ etapa: "cliente_convertido" }),
          base44.entities.Pedido.count(),
          base44.entities.Pedido.count({ status_producao: { $in: ["aguardando", "em_producao"] } }),
          base44.entities.PlacaNFC.count(),
          base44.entities.ServicoCliente.count({ status: "em_andamento" }),
          base44.entities.ServicoCliente.list({ sort: "-created_date", limit: 200 }),
          base44.entities.Pedido.filter({ status_pagamento: "pago" }, { limit: 500 }),
          base44.entities.Lead.filter({ etapa: "aguardando_autorizacao" }, { sort: "-updated_date", limit: 5 }),
          base44.entities.Pedido.filter({ status_producao: { $in: ["aguardando", "em_producao"] } }, { sort: "created_date", limit: 5 }),
        ]);

        const servicos = Array.isArray(servicosPage) ? servicosPage : servicosPage?.items || [];
        const pagos = Array.isArray(pedidosPagos) ? pedidosPagos : pedidosPagos?.items || [];
        const faturamento = pagos.reduce((s, p) => s + (Number(p.total) || 0), 0);
        const mrr = servicos
          .filter((s) => s.status !== "cancelado")
          .reduce((s, x) => s + (Number(x.valor_mensal) || 0), 0);
        const vencidos = servicos.filter((s) => {
          const d = diasAte(s.vencimento);
          return d !== null && d < 0 && s.status !== "cancelado" && s.status !== "concluido";
        });
        const ativos = servicos.filter((s) => s.status === "em_andamento" || s.status === "aguardando_cliente");

        if (!ativo) return;
        setStats({
          clientes, leads, aguardando, convertidos, pedidos, pendentes, placas,
          emAndamento, faturamento, mrr, ativos: ativos.length, vencidos: vencidos.length,
        });
        setAlertas({
          leads: Array.isArray(leadsAguardandoPage) ? leadsAguardandoPage : leadsAguardandoPage?.items || [],
          pedidos: Array.isArray(pedidosPendentesPage) ? pedidosPendentesPage : pedidosPendentesPage?.items || [],
          servicos: vencidos.slice(0, 4),
        });
      } catch (e) {
        if (ativo) setErro(e?.message || "Não foi possível carregar os indicadores.");
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Visão geral</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">
          Olá, {user?.full_name?.split(" ")[0] || "administrador"}.
        </h1>
        <p className="mt-1 text-[13px] text-white/45">
          Números reais do banco de dados da plataforma.
        </p>
      </header>

      {erro && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      )}

      {!stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Clientes" value={stats.clientes} accent="#4285F4" />
            <StatCard icon={Target} label="Leads no CRM" value={stats.leads} accent="#FBBC05" />
            <StatCard icon={Hourglass} label="Aguardando autorização" value={stats.aguardando} accent="#f97316" />
            <StatCard icon={Target} label="Leads convertidos" value={stats.convertidos} accent="#34A853" />
            <StatCard icon={ShoppingBag} label="Pedidos" value={stats.pedidos} accent="#a855f7" />
            <StatCard icon={Wallet} label="Faturamento confirmado" value={brl(stats.faturamento)} hint="Somente pagamentos marcados como pagos" accent="#22c55e" />
            <StatCard icon={CreditCard} label="Placas vendidas" value={stats.placas} accent="#06b6d4" />
            <StatCard icon={Briefcase} label="Serviços em andamento" value={stats.emAndamento} accent="#eab308" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Pedidos pendentes de produção
              </p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-white">{stats.pendentes}</p>
              <Link to="/admin/pedidos" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary">
                Gerenciar <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Planos ativos
              </p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-white">{stats.ativos}</p>
              <p className="mt-1 text-[11.5px] text-white/40">Receita recorrente: {brl(stats.mrr)}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
                Mensalidades vencidas
              </p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-white">{stats.vencidos}</p>
              <Link to="/admin/servicos" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-300">
                Revisar planos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel titulo="Aguardando autorização" vazio="Nenhum lead aguardando autorização." link="/admin/leads">
              {alertas.leads.map((l) => (
                <Link
                  key={l.id}
                  to="/admin/lead/$leadId"
                  params={{ leadId: l.id }}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-white">{l.empresa}</span>
                    <span className="block truncate text-[11px] text-white/35">{l.cidade || "—"}</span>
                  </span>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                </Link>
              ))}
            </Panel>

            <Panel titulo="Pedidos em aberto" vazio="Nenhum pedido pendente." link="/admin/pedidos">
              {alertas.pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-white">{p.numero}</span>
                    <span className="block truncate text-[11px] text-white/35">{p.cliente_nome} · {brl(p.total)}</span>
                  </span>
                  <StatusPill
                    map={{ aguardando: { label: "Aguardando", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" }, em_producao: { label: "Produção", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" } }}
                    value={p.status_producao}
                  />
                </div>
              ))}
            </Panel>

            <Panel titulo="Mensalidades vencidas" vazio="Nenhuma mensalidade vencida." link="/admin/servicos">
              {alertas.servicos.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-white">{s.cliente_nome}</span>
                    <span className="block truncate text-[11px] text-white/35">Venceu em {dataCurta(s.vencimento)}</span>
                  </span>
                  <StatusPill map={STATUS_SERVICO} value={s.status} />
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Panel({ titulo, children, vazio, link }) {
  const vazioReal = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">{titulo}</p>
        <Link to={link} className="text-[11px] font-semibold text-primary">
          Ver tudo
        </Link>
      </div>
      <div className="mt-1 space-y-0.5">
        {vazioReal ? <p className="px-2 py-3 text-[12px] text-white/30">{vazio}</p> : children}
      </div>
    </section>
  );
}