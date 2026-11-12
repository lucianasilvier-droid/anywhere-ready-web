import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserRound, Building2, Loader2 } from "lucide-react";
import { transferirLeadRepresentanteFn } from "@/lib/representantes-fns";

/** Indicador e controle de atribuição, exibido apenas no CRM administrativo. */
export default function RepresentanteDoLead({ lead, representantes = [], onAtualizado }) {
  const [salvando, setSalvando] = useState(false);
  const transferir = useServerFn(transferirLeadRepresentanteFn);
  const atual = lead.representante_id || "";

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

  const nomeAtual = lead.representante_nome || "Representante";
  return (
    <div className="flex min-w-[150px] flex-col gap-1.5">
      {atual ? (
        <Link
          to="/admin/representantes/$repId"
          params={{ repId: atual }}
          title={`Cliente do representante ${nomeAtual}`}
          className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[10.5px] font-semibold text-sky-200 hover:border-sky-300/60"
        >
          <UserRound className="h-3 w-3 shrink-0" />
          <span className="truncate">{nomeAtual}</span>
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
            <option value={atual}>{nomeAtual} (atual)</option>
          )}
          {representantes.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
