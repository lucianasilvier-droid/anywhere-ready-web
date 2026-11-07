import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEntityList } from "@/hooks/useEntityList";
import { FUNIL_STAGES } from "@/lib/site-content";
import { dataCurta } from "@/lib/format";

/** No painel do administrador: os clientes que o representante adicionou ao CRM. */
export default function ClientesDoRepresentante({ repId }) {
  const { items: leads, loading } = useEntityList("Lead", { representante_id: repId }, { limit: 300 });
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const deHoje = leads.filter(
    (l) => l.created_date && new Date(l.created_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === hoje,
  ).length;

  return (
    <section>
      <h2 className="mb-2 font-heading text-sm font-bold text-white">
        Clientes no CRM <span className="text-white/30">({leads.length} · {deHoje} hoje)</span>
      </h2>
      {loading ? (
        <p className="flex items-center gap-2 py-4 text-[12px] text-white/40"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando clientes...</p>
      ) : leads.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-5 text-[12.5px] text-white/40">
          Este representante ainda não adicionou clientes ao CRM.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5">Cidade</th>
                <th className="px-4 py-2.5">Etapa</th>
                <th className="px-4 py-2.5">Site demo</th>
                <th className="px-4 py-2.5">Adicionado em</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {leads.map((lead) => {
                const etapa = FUNIL_STAGES.find((s) => s.key === lead.etapa);
                return (
                  <tr key={lead.id} className="text-[12.5px] hover:bg-white/[0.02]">
                    <td className="max-w-[220px] truncate px-4 py-2.5 font-semibold text-white">{lead.empresa}</td>
                    <td className="px-4 py-2.5 text-white/55">{lead.cidade || "—"}</td>
                    <td className="px-4 py-2.5" style={{ color: etapa?.color || "#94a3b8" }}>{etapa?.label || lead.etapa}</td>
                    <td className="px-4 py-2.5 text-white/55">
                      {lead.site_demo_slug ? (
                        <a href={`/site/${lead.site_demo_slug}`} target="_blank" rel="noreferrer" className="text-[#8ab4f8] hover:underline">/site/{lead.site_demo_slug}</a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-white/55">{dataCurta(lead.created_date)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to="/admin/lead/$leadId" params={{ leadId: lead.id }} className="text-[11.5px] font-semibold text-primary hover:underline">Abrir</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
