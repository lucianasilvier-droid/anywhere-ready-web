import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Users2, ReceiptText, Banknote, ShieldCheck, UserPlus, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/representantes")({
  head: () => ({ meta: [{ title: "Representantes comerciais — Painel" }] }),
  component: RepresentantesLayout,
});

const TABS = [
  { to: "/admin/representantes", label: "Representantes", icon: Users2, exact: true },
  { to: "/admin/representantes/vendas", label: "Vendas e comissões", icon: ReceiptText },
  { to: "/admin/representantes/pagamentos", label: "Pagamentos", icon: Banknote },
  { to: "/admin/representantes/inscricoes", label: "Inscrições", icon: UserPlus },
];

function RepresentantesLayout() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Comercial</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">
            Representantes comerciais
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
            Cadastro, vendas, comissões e pagamentos dos representantes. Cada representante acessa
            apenas o próprio painel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <a
          href="/seja-representante"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/55 hover:border-primary/40 hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Página de recrutamento
        </a>
        <Link
          to="/admin/equipe"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/55 hover:border-primary/40 hover:text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Equipe e acessos
        </Link>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.exact }}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white/55"
            activeProps={{ className: "border-primary/40 bg-primary/10 text-primary" }}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  );
}