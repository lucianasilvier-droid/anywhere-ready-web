import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Briefcase, FileText, Send, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEntityList } from "@/hooks/useEntityList";
import StatusPill from "@/components/admin/StatusPill";
import { brl, dataCurta, STATUS_SERVICO } from "@/lib/format";

export const Route = createFileRoute("/_authed/conta/servicos")({
  head: () => ({ meta: [{ title: "Meus serviços — Google NFC Connect" }] }),
  component: ServicosCliente,
});

function ServicosCliente() {
  const { user } = useAuth();
  const { items: servicos, loading } = useEntityList("ServicoCliente", { cliente_email: user?.email }, { limit: 50 });
  const { items: atualizacoes, reload: reloadAtualizacoes } = useEntityList(
    "ServicoAtualizacao",
    { cliente_email: user?.email },
    { limit: 100 },
  );
  const { items: relatorios } = useEntityList("Relatorio", { cliente_email: user?.email }, { limit: 50 });
  const [solicitacao, setSolicitacao] = useState("");
  const [servicoSel, setServicoSel] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function solicitar(e) {
    e.preventDefault();
    const servico = servicos.find((s) => s.id === servicoSel) || servicos[0];
    if (!servico) return toast.error("Nenhum serviço vinculado para registrar a solicitação.");
    if (solicitacao.trim().length < 5) return toast.error("Descreva a sua solicitação.");
    setEnviando(true);
    try {
      await base44.entities.ServicoAtualizacao.create({
        servico_id: servico.id,
        cliente_email: user?.email || "",
        tipo: "solicitacao",
        titulo: "Solicitação do cliente",
        descricao: solicitacao,
        autor: user?.full_name || user?.email || "Cliente",
        visivel_cliente: true,
        status: "aberta",
      });
      toast.success("Solicitação registrada. A equipe vai responder.");
      setSolicitacao("");
      await reloadAtualizacoes();
    } catch (err) {
      toast.error(err?.message || "Não foi possível registrar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-white">Meus serviços</h1>
        <p className="mt-1 text-[12.5px] text-white/45">
          Acompanhe o andamento, as atualizações e os relatórios de cada serviço contratado.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando serviços...</div>
      ) : servicos.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">Nenhum serviço vinculado à sua conta ainda.</p>
          <p className="mt-1 text-[12px] text-white/35">Fale com a equipe para contratar a criação ou a gestão do seu perfil.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servicos.map((s) => {
            const updates = atualizacoes.filter((u) => u.servico_id === s.id && u.visivel_cliente !== false);
            const rels = relatorios.filter((r) => r.servico_id === s.id);
            return (
              <article key={s.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-bold text-white">
                      {s.tipo === "gestao_perfil" ? "Gestão de perfil no Google" : "Criação de perfil no Google"}
                    </p>
                    <p className="text-[11px] text-white/40">
                      Plano {s.plano || "—"} · {brl(s.valor_mensal)} {s.tipo === "gestao_perfil" ? "/mês" : ""}
                    </p>
                  </div>
                  <StatusPill map={STATUS_SERVICO} value={s.status} />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10.5px] text-white/40">
                    <span>{s.etapa_atual || "Etapa atual não informada"}</span>
                    <span>{s.progresso || 0}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b]" style={{ width: `${Math.min(Number(s.progresso) || 0, 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-white/30">
                    Início: {dataCurta(s.inicio)} · Vencimento: {dataCurta(s.vencimento)}
                  </p>
                </div>

                {updates.length > 0 && (
                  <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Histórico</p>
                    <div className="mt-1.5 space-y-1.5">
                      {updates.map((u) => (
                        <div key={u.id} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                          <p className="text-[11.5px] font-semibold text-white/75">{u.titulo}</p>
                          {u.descricao && <p className="text-[11px] leading-relaxed text-white/45">{u.descricao}</p>}
                          <p className="mt-0.5 text-[10px] text-white/25">{dataCurta(u.created_date)} · {u.tipo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rels.length > 0 && (
                  <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
                      <TrendingUp className="h-3 w-3" /> Relatórios
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                      {rels.map((r) => (
                        <div key={r.id} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                          <p className="flex items-center justify-between text-[11.5px] font-semibold text-white/75">
                            <span>{r.periodo}</span>
                            <span className="text-[10px] font-normal text-white/30">{dataCurta(r.created_date)}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{r.resumo}</p>
                          <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[9.5px] text-white/40">
                            <div><p className="font-bold text-white/70">{r.visualizacoes || 0}</p>views</div>
                            <div><p className="font-bold text-white/70">{r.ligacoes || 0}</p>ligações</div>
                            <div><p className="font-bold text-white/70">{r.rotas || 0}</p>rotas</div>
                            <div><p className="font-bold text-white/70">{r.avaliacoes_novas || 0}</p>avaliações</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {servicos.length > 0 && (
        <form onSubmit={solicitar} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
            <FileText className="h-4 w-4 text-primary" /> Solicitar alteração
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
            Peça ajustes de informações, fotos ou postagens. A equipe registra e responde por aqui.
          </p>
          <select
            value={servicoSel || servicos[0]?.id || ""}
            onChange={(e) => setServicoSel(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#0d1729] px-3 py-2 text-[12px] text-white"
          >
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tipo === "gestao_perfil" ? "Gestão de perfil" : "Criação de perfil"}
              </option>
            ))}
          </select>
          <textarea
            rows={3}
            value={solicitacao}
            onChange={(e) => setSolicitacao(e.target.value)}
            placeholder="Descreva o que você precisa alterar"
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Enviar solicitação
          </button>
        </form>
      )}
    </div>
  );
}