import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Loader2, Target, GripVertical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { FUNIL_STAGES } from "@/lib/site-content";
import RepresentanteDoLead from "@/components/crm/RepresentanteDoLead";

/** Funil de vendas (kanban). No painel do representante mostra só os clientes dele. */
export default function CrmFunil({ base = "/admin" }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    let buscando = false;

    async function carregar(silencioso = false) {
      if (buscando) return;
      buscando = true;
      if (!silencioso) setLoading(true);

      try {
        // Busca todos os leads ativos em páginas. O limite anterior de 300
        // escondia registros mais antigos do funil, mesmo que continuassem no banco.
        // A ordenação por created_date mantém a paginação estável durante atualizações.
        const pageSize = 500;
        const todos = [];
        let offset = 0;
        while (true) {
          const page = await base44.entities.Lead.filter(
            { arquivado: { $ne: true } },
            { sort: "created_date", limit: pageSize, skip: offset },
          );
          const registros = Array.isArray(page) ? page : page?.items || [];
          todos.push(...registros);
          if (registros.length < pageSize) break;
          offset += registros.length;
        }
        if (!ativo) return;
        todos.sort((a, b) => {
          const dataA = new Date(a.updated_date || a.created_date || 0).getTime();
          const dataB = new Date(b.updated_date || b.created_date || 0).getTime();
          return dataB - dataA;
        });
        setLeads(todos);
        setErro("");
      } catch (e) {
        if (ativo) setErro(e?.message || "Não foi possível atualizar o funil.");
      } finally {
        buscando = false;
        if (ativo && !silencioso) setLoading(false);
      }
    }

    carregar();
    // O painel administrativo acompanha as mudanças feitas pelo representante
    // sem exigir que o administrador recarregue a página.
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") carregar(true);
    }, 5000);
    const aoVoltar = () => carregar(true);
    window.addEventListener("focus", aoVoltar);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", aoVoltar);
    };
  }, []);

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const novo = destination.droppableId;
    const anterior = source.droppableId;
    const lead = leads.find((l) => l.id === draggableId);
    const autor = base === "/representante"
      ? lead?.representante_nome || lead?.responsavel || "Representante"
      : "Administrador";
    setLeads((atual) => atual.map((l) => (l.id === draggableId ? { ...l, etapa: novo } : l)));
    try {
      await base44.entities.Lead.update(draggableId, { etapa: novo });
      // A etapa é o dado principal. Uma falha ao gravar o histórico não pode
      // desfazer visualmente uma alteração que já foi salva no banco.
      try {
        await base44.entities.LeadInteraction.create({
          lead_id: draggableId,
          empresa: lead?.empresa || "",
          tipo: "sistema",
          mensagem: `Etapa alterada no funil: ${novo}`,
          autor,
          detalhe: `De "${anterior}" para "${novo}"`,
        });
        toast.success("Etapa atualizada e registrada.");
      } catch (historyError) {
        toast.warning("Etapa salva. Não foi possível registrar o histórico: " + (historyError?.message || "tente novamente."));
      }
    } catch (e) {
      setLeads((atual) => atual.map((l) => (l.id === draggableId ? { ...l, etapa: anterior } : l)));
      toast.error(e?.message || "Não foi possível salvar a etapa.");
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-20 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Carregando funil...</div>;
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Comercial</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Funil de vendas</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Arraste os cartões para mudar a etapa. Cada mudança é registrada no histórico do lead.
        </p>
      </header>

      {erro && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex min-w-0 flex-col gap-4 pb-4">
          {FUNIL_STAGES.map((stage) => {
            const cards = leads.filter((l) => (l.etapa || "novo_lead") === stage.key);
            return (
              <section key={stage.key} className="w-full min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-white/70">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </p>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/45">
                    {cards.length}
                  </span>
                </div>
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[72px] space-y-2 rounded-xl border p-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? "border-primary/40 bg-primary/[0.06]"
                          : "border-white/[0.07] bg-white/[0.02]"
                      }`}
                    >
                      {cards.map((lead, index) => (
                        <Draggable draggableId={lead.id} index={index} key={lead.id}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`rounded-lg border p-2.5 ${
                                snap.isDragging
                                  ? "border-primary/50 bg-[#12213a] shadow-xl"
                                  : "border-white/[0.08] bg-[#0c1526]"
                              }`}
                            >
                              <div className="flex items-start gap-1.5">
                                <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-white/20" />
                                <div className="min-w-0">
                                  <Link
                                    to={`${base}/lead/$leadId`}
                                    params={{ leadId: lead.id }}
                                    className="block truncate text-[12px] font-semibold text-white hover:text-primary"
                                  >
                                    {lead.empresa}
                                  </Link>
                                  <p className="truncate text-[10.5px] text-white/35">
                                    {lead.cidade || "—"}
                                  </p>
                                  {base !== "/representante" && (
                                    <div className="mt-1 max-w-full">
                                      <RepresentanteDoLead lead={lead} />
                                    </div>
                                  )}
                                  {lead.consentimento === "autorizado" && (
                                    <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                                      autorizado
                                    </span>
                                  )}
                                  {["recusado", "revogado"].includes(lead.consentimento) && (
                                    <span className="mt-1 inline-block rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300">
                                      bloqueado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {cards.length === 0 && (
                        <p className="px-1 py-4 text-center text-[10.5px] text-white/20">Sem leads</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>

      {leads.length === 0 && !erro && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <Target className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/60">Nenhum lead no funil ainda.</p>
          <Link to={`${base}/${base === "/representante" ? "crm" : "leads"}`} className="mt-3 inline-block text-[12px] font-semibold text-primary">
            Pesquisar empresas →
          </Link>
        </div>
      )}
    </div>
  );
}