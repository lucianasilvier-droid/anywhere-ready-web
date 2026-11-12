import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserRound, Building2, Loader2 } from "lucide-react";
import { transferirLeadRepresentanteFn } from "@/lib/representantes-fns";

/**
 * Indicador de responsável. Quando representantes é fornecido, o administrador
 * também pode atribuir, transferir ou devolver o lead à equipe.
 */
export default function RepresentanteDoLead({ lead, variante = "compacto", representantes, onAtualizado }) {
  const editavel = Array.isArray(representantes);
  const [salvando, setSalvando] = useState(false);
  const transferir = useServerFn(transferirLeadRepresentanteFn);
  const atual = lead.representante_id || "";
  const temRep = Boolean(atual);
  const nome = lead.representante_nome || "Representante";

  async function alterar(e) {
    const representanteId = e.target.value || null;
    if (representanteId === (atual || null)) return;
    setSalvando(true);
    try {
      await transferir({ data: { leadId: lead.id, representanteId } });
      toast.success(representanteId ? "Empresa atribuída ao representante." : "Empresa devolvida à equipe.");
      await onAtualizado?.();
    } catch (error) {
      toast.error(error?.message || "Não foi possível transferir a empresa.");
      e.target.value = atual;
    } finally {
      setSalvando(false);
    }
  }

  if (editavel) {
    return (
      <div className="flex min-w-[150px] flex-col gap-1.5">
        {temRep ? (
          <Link
            to="/admin/representantes/$repId"
            params={{ repId: atual }}
            title={`Cliente do representante ${nome}`}
            className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[10.5px] font-semibold text-sky-200 hover:border-sky-300/60"
          >
            <UserRound className="h-3 w-3 shrink-0" />
            <span className="truncate">{nome}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 self-start rounded-full border border-white/12 bg-white/[0.04] px-2 py-1 text-[10.5px] font-semibold text-white/55">
            <Building2 className="h-3 w-3 shrink-0" /> Sem representante
          </span>
        )}
        <label className="flex items-center gap-1 text-[10px] text-primary/80">
          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          <span className="sr-only">Transferir empresa</span>
          <select
            aria-label={`Transferir ${lead.empresa || "empresa"} para outro representante`}
            value={atual}
            disabled={salvando}
            onChange={alterar}
            className="max-w-full rounded-md border border-white/10 bg-[#0d1729] px-2 py-1 text-[10.5px] text-white disabled:opacity-50"
          >
            <option value="">Sem representante (equipe)</option>
            {atual && !representantes.some((r) => r.id === atual) && (
              <option value={atual}>{nome} (atual)</option>
            )}
            {representantes.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </label>
      </div>
    );
  }

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
        params={{ repId: atual }}
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
