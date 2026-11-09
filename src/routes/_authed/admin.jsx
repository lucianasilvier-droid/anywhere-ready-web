import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useRef } from "react";
import {
  LayoutDashboard, Users, Target, LayoutGrid, Briefcase, ShoppingBag, CreditCard, Package,
  Plug, Settings, LogOut, ShieldAlert, Home, Wallet, HardDriveDownload, KeyRound,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { iniciais } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/leads", label: "CRM · Leads", icon: Target },
  { to: "/admin/funil", label: "Funil de vendas", icon: LayoutGrid },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/servicos", label: "Serviços e assinaturas", icon: Briefcase },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/admin/placas", label: "Placas NFC", icon: CreditCard },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/representantes", label: "Representantes comerciais", icon: Users },
  { to: "/admin/backup", label: "Backup do sistema", icon: HardDriveDownload },
  { to: "/admin/integracoes", label: "Integrações e APIs", icon: Plug },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { user, isLoadingAuth } = useAuth();
  const menuMobileRef = useRef(null);

  // Logout real: invalida a sessão e leva para a tela de login. As páginas do
  // painel ficam atrás do AuthGate, então o botão "voltar" não reabre o painel.
  async function sair() {
    try {
      await base44.auth.logout(`${window.location.origin}/login`);
      window.location.replace("/login");
    } catch {
      window.location.replace("/login");
    }
  }

  if (isLoadingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-white/50">
        Carregando painel...
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="glass-card max-w-md rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-heading text-xl font-bold text-white">Acesso administrativo restrito</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/55">
            Sua conta ({user?.email}) não tem permissão de administrador. Fale com o responsável
            pela plataforma para liberar o acesso ao painel.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              to="/conta"
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-[#0a1128]"
            >
              Ir para a área do cliente
            </Link>
            <Link to="/" className="rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white/70">
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.07] bg-[#070d1c] px-3 py-5 lg:flex">
          <Link to="/admin" className="mb-6 flex items-center gap-2.5 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#ffd97a] to-[#e0a12c] font-heading text-[13px] font-extrabold text-[#0a1128]">
              N
            </span>
            <span className="leading-none">
              <span className="block font-heading text-[11px] font-extrabold tracking-[0.14em] text-white">
                NFC CONNECT
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                Painel
              </span>
            </span>
          </Link>

          <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/[0.07] pt-3">
            <div className="flex items-center gap-2 px-2 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {iniciais(user.full_name || user.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white">
                  {user.full_name || "Administrador"}
                </p>
                <p className="truncate text-[10.5px] text-white/35">{user.email}</p>
              </div>
            </div>
            <div className="mt-1 space-y-1">
              <Link
                to="/"
                className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/45 hover:bg-white/5 hover:text-white"
              >
                <Home className="h-3 w-3" /> Ver o site
              </Link>
              <Link
                to="/admin/configuracoes"
                className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/45 hover:bg-white/5 hover:text-white"
              >
                <KeyRound className="h-3 w-3" /> Alterar senha
              </Link>
              <button
                onClick={sair}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/12 px-2 py-2 text-[11.5px] font-bold uppercase tracking-wider text-white/60 hover:border-red-400/40 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair da conta
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/[0.07] bg-[#070d1c]/95 px-3 py-2 backdrop-blur lg:hidden">
            <div ref={menuMobileRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact }}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-medium text-white/55"
                  activeProps={{ className: "bg-primary/15 text-primary" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              onClick={sair}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-bold text-white/60 hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3 w-3" /> <span className="hidden sm:inline">Sair da conta</span>
              <span className="sm:hidden">Sair</span>
            </button>
          </div>
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}