import { Link } from "@tanstack/react-router";
import { UserRound, Building2 } from "lucide-react";

/**
 * Mostra ao administrador de quem é o cliente: do representante que o adicionou ao CRM
 * ou da equipe. "destaque" é usado na ficha do cliente; "compacto" nas listas e no funil.
 */
export default function RepresentanteDoLead({ lead, variante = "compacto" }) {
  const temRep = !!lead.representante_id;
  const nome = lead.representante_nome || "Representante";

  if (variante === "compacto") {
    return temRep ? (
      <span
        title={`Cliente do representante ${nome}`}
        className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky-200"
      >
        <UserRound className="h-3 w-3 shrink-0" /> <span className="truncate">{nome}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-semibold text-white/45">
        <Building2 className="h-3 w-3 shrink-0" /> Equipe
      </span>
    );
  }

  return temRep ? (
    <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-[12px] text-sky-100">
      <UserRound className="h-3.5 w-3.5 text-sky-300" />
      <span>
        Cliente do representante <strong className="text-white">{nome}</strong>
        {lead.representante_email ? <span className="text-sky-200/70"> · {lead.representante_email}</span> : null}
      </span>
      <Link
        to="/admin/representantes/$repId"
        params={{ repId: lead.representante_id }}
        className="text-[11.5px] font-semibold text-sky-300 hover:underline"
      >
        Ver representante
      </Link>
    </div>
  ) : (
    <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/55">
      <Building2 className="h-3.5 w-3.5" /> Cliente da equipe (sem representante)
    </div>
  );
}
