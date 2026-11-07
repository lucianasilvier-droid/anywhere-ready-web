import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Briefcase, CreditCard, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEntityList } from "@/hooks/useEntityList";
import StatusPill from "@/components/admin/StatusPill";
import { brl, STATUS_PAGAMENTO, STATUS_SERVICO } from "@/lib/format";

export const Route = createFileRoute("/_authed/conta/")({
  head: () => ({ meta: [{ title: "Minha conta — Google NFC Connect" }] }),
  component: ContaHome,
});

function ContaHome() {
  const { user } = useAuth();
  const email = user?.email;
  const { items: pedidos, loading } = useEntityList("Pedido", { cliente_email: email }, { limit: 50 });
  const { items: servicos } = useEntityList("ServicoCliente", { cliente_email: email }, { limit: 50 });
  const { items: placas } = useEntityList("PlacaNFC", { cliente_email: email }, { limit: 50 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-white">
          Olá, {user?.full_name?.split(" ")[0] || "cliente"}.
        </h1>
        <p className="mt-1 text-[13px] text-white/45">
          Acompanhe seus serviços, pedidos e as placas NFC vinculadas à sua conta.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Briefcase, label: "Serviços", value: servicos.length, to: "/conta/servicos" },
          { icon: ShoppingBag, label: "Pedidos", value: pedidos.length, to: "/conta/pedidos" },
          { icon: CreditCard, label: "Placas NFC", value: placas.length, to: "/conta/placas" },
        ].map((c) => (
          <Link key={c.label} to={c.to} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 hover:border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{c.label}</p>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1.5 font-heading text-2xl font-extrabold text-white">{c.value}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              Abrir <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Últimos pedidos</p>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[12.5px] text-white/40">Você ainda não fez pedidos.</p>
            <Link to="/loja" className="mt-2 inline-block rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">
              Ver placas NFC
            </Link>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {pedidos.slice(0, 4).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                <div>
                  <p className="font-mono text-[11.5px] font-semibold text-white">{p.numero}</p>
                  <p className="text-[10.5px] text-white/35">{p.itens?.length || 0} item(ns) · {brl(p.total)}</p>
                </div>
                <StatusPill map={STATUS_PAGAMENTO} value={p.status_pagamento} />
              </div>
            ))}
            <Link to="/conta/pedidos" className="inline-block text-[11.5px] font-semibold text-primary">Ver todos os pedidos →</Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Meus serviços</p>
        {servicos.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-white/40">
            Nenhum serviço contratado ainda. Fale com a equipe para criar ou gerenciar seu perfil no Google.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {servicos.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                <div>
                  <p className="text-[12px] font-semibold text-white">
                    {s.tipo === "gestao_perfil" ? "Gestão de perfil" : "Criação de perfil"}
                  </p>
                  <p className="text-[10.5px] text-white/35">Progresso: {s.progresso || 0}%</p>
                </div>
                <StatusPill map={STATUS_SERVICO} value={s.status} />
              </div>
            ))}
            <Link to="/conta/servicos" className="inline-block text-[11.5px] font-semibold text-primary">Acompanhar serviços →</Link>
          </div>
        )}
      </section>
    </div>
  );
}