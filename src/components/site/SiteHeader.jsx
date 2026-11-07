import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Nfc, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { WHATSAPP_DISPLAY } from "@/lib/site-content";

const NAV = [
  { label: "Perfil no Google", to: "/servicos/perfil-google" },
  { label: "Gestão de Perfil", to: "/servicos/gestao-perfil" },
  { label: "Placas NFC", to: "/servicos/placa-nfc" },
  { label: "Sites", to: "/servicos/criacao-site" },
  { label: "Loja", to: "/loja" },
  { label: "Seja representante", to: "/seja-representante" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const isStaff = user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070d1c]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px]">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ffd97a] via-[#ffc24a] to-[#e0a12c] shadow-[0_10px_26px_-12px_rgba(255,194,74,0.9)]">
            <Nfc className="h-4.5 w-4.5 text-[#0a1128]" strokeWidth={2.4} />
          </span>
          <span className="leading-none">
            <span className="block font-heading text-[13px] font-extrabold tracking-[0.16em] text-white">
              GOOGLE NFC
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.32em] text-primary/80">
              Connect
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
              activeProps={{ className: "text-white bg-white/5" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <Link
              to={isStaff ? "/admin" : "/conta"}
              className="rounded-full border border-white/12 px-4 py-2 text-[13px] font-semibold text-white/80 transition-colors hover:border-primary/40 hover:text-white"
            >
              {isStaff ? "Painel" : "Minha conta"}
            </Link>
          ) : (
            <button
              onClick={() => navigateToLogin()}
              className="rounded-full border border-white/12 px-4 py-2 text-[13px] font-semibold text-white/80 transition-colors hover:border-primary/40 hover:text-white"
            >
              Entrar
            </button>
          )}
          <Link
            to="/loja"
            className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f5b93a] px-4 py-2 text-[13px] font-bold text-[#0a1128] shadow-[0_14px_30px_-14px_rgba(255,194,74,0.9)] transition-transform hover:-translate-y-0.5"
          >
            Pedir minha placa
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#070d1c] px-4 pb-5 pt-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={isAuthenticated ? (isStaff ? "/admin" : "/conta") : "/login"}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white"
            >
              {isAuthenticated ? (isStaff ? "Painel administrativo" : "Minha conta") : "Entrar"}
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/loja"
              onClick={() => setOpen(false)}
              className="rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f5b93a] px-4 py-2.5 text-center text-sm font-bold text-[#0a1128]"
            >
              Pedir minha placa
            </Link>
            <a
              href={`https://wa.me/5511913290911`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/12 px-4 py-2.5 text-center text-sm font-semibold text-white/80"
            >
              WhatsApp {WHATSAPP_DISPLAY}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}