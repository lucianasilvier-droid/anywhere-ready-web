import { Link } from "@tanstack/react-router";
import { ShieldAlert, Loader2 } from "lucide-react";

export function PainelCarregando() {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-white/40">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando painel...
    </div>
  );
}

export default function SemVinculo({ erro }) {
  return (
    <div className="glass-card mx-auto max-w-lg rounded-2xl p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-heading text-xl font-bold text-white">Conta sem vínculo de representante</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-white/55">
        {erro ||
          "Esta conta ainda não está vinculada a um representante comercial. Peça ao administrador para cadastrar seu e-mail de login na área Representantes comerciais do painel."}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Link to="/" className="rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white/70">
          Voltar ao site
        </Link>
        <Link to="/conta" className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-[#0a1128]">
          Ir para a área do cliente
        </Link>
      </div>
    </div>
  );
}