import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Home, FileText, Briefcase, CreditCard, UserCog, LayoutDashboard, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/conta")({
  component: ContaLayout,
});

const TABS = [
  { to: "/conta", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/conta/pedidos", label: "Pedidos", icon: FileText },
  { to: "/conta/servicos", label: "Serviços", icon: Briefcase },
  { to: "/conta/placas", label: "Minhas placas", icon: CreditCard },
  { to: "/conta/dados", label: "Meus dados", icon: UserCog },
];

function ContaLayout() {
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
          <Link to="/" className="flex items-center gap-2 text-[12.5px] font-semibold text-white/60 hover:text-white">
            <Home className="h-4 w-4" /> Google NFC Connect
          </Link>
          <div className="flex items-center gap-2">
            <p className="hidden truncate text-[12px] text-white/40 sm:block">{user?.email}</p>
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/65 hover:border-primary/40 hover:text-white"
            >
              <Home className="h-3.5 w-3.5" /> Ver site
            </Link>
            <button
              onClick={sair}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/60 hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair da conta
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
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

        <div className="mt-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}