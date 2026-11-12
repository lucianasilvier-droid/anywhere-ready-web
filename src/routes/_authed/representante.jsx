import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ReceiptText, Wallet, LogOut, Home, Globe, Target, LayoutGrid } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/representante")({
  head: () => ({ meta: [{ title: "Painel do representante — Google NFC Connect" }] }),
  component: RepresentanteLayout,
});

const TABS = [
  { to: "/representante", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/representante/crm", label: "CRM · Meus clientes", icon: Target },
  { to: "/representante/funil", label: "Funil de vendas", icon: LayoutGrid },
  { to: "/representante/vendas", label: "Histórico de vendas", icon: ReceiptText },
  { to: "/representante/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/representante/pagina", label: "Minha página", icon: Globe },
];

function RepresentanteLayout() {
  const { user } = useAuth();

  async function sair() {
    try {
      await base44.auth.logout(`${window.location.origin}/login`);
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/[0.07] bg-[#070d1c]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#ffd97a] to-[#e0a12c] font-heading text-[13px] font-extrabold text-[#0a1128]">
              N
            </span>
            <div className="leading-tight">
              <p className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-white">
                NFC CONNECT
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                Representante
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-2.5 py-1.5 text-[10.5px] font-semibold whitespace-nowrap text-white/70 hover:border-primary/40 hover:text-white sm:px-3 sm:text-[11.5px]"
            >
              <Home className="h-3.5 w-3.5" /> Ver site
            </Link>
            <p className="hidden max-w-[180px] truncate text-[11.5px] text-white/35 md:block">{user?.email}</p>
            <button
              onClick={sair}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/60 hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: tab.exact }}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2.5 text-center text-[11.5px] font-semibold leading-tight text-white/55 lg:rounded-full lg:py-1.5"
              activeProps={{ className: "border-primary/40 bg-primary/10 text-primary" }}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}