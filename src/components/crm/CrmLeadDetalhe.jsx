import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Sparkles, MessageCircle, Copy, ExternalLink, ShieldCheck, ShieldX,
  Send, History, Phone, Globe, MapPin, Star, Bot,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  analyzeLeadFn, draftMessageFn, registerConsentFn, sendWhatsappFn, summarizeHistoryFn,
} from "@/lib/admin-fns";
import { useEntityList } from "@/hooks/useEntityList";
import { FUNIL_STAGES } from "@/lib/site-content";
import StatusPill from "@/components/admin/StatusPill";
import SiteDoLead from "@/components/admin/SiteDoLead";
import SiteDoLeadRepresentante from "@/components/crm/SiteDoLeadRepresentante";
import RepresentanteDoLead from "@/components/crm/RepresentanteDoLead";
import { STATUS_CONSENT, dataHora } from "@/lib/format";

/** Ficha do lead no CRM. No painel do representante, só abre clientes do próprio representante. */
export default function CrmLeadDetalhe({ leadId, base = "/admin" }) {
  const representante = base === "/representante";
  const crmPath = representante ? "/representante/crm" : "/admin/leads";
  const [lead, setLead] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const { items: interacoes, reload: reloadInteracoes } = useEntityList("LeadInteraction", { lead_id: leadId });

  const analisar = useServerFn(analyzeLeadFn);
  const rascunho = useServerFn(draftMessageFn);
  const resumir = useServerFn(summarizeHistoryFn);
  const enviar = useServerFn(sendWhatsappFn);
  const consentimento = useServerFn(registerConsentFn);

  async function carregar() {
    setCarregando(true);
    try {
      setLead(await base44.entities.Lead.get(leadId));
    } catch (e) {
      setErro(e?.message || "Lead não encontrado.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const mAnalisar = useMutation({
    mutationFn: () => analisar({ data: { leadId } }),
    onSuccess: async () => {
      toast.success("Análise da IA concluída.");
      await carregar();
      reloadInteracoes();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível analisar agora."),
  });

  const mRascunho = useMutation({
    mutationFn: (tipo) => rascunho({ data: { leadId, tipo } }),
    onSuccess: (r) => {
      setMensagem(r?.mensagem || "");
      toast.success("Mensagem gerada. Revise antes de enviar.");
    },
    onError: (e) => toast.error(e?.message || "Não foi possível gerar a mensagem."),
  });

  const mResumo = useMutation({
    mutationFn: () => resumir({ data: { leadId } }),
    onSuccess: (r) => {
      toast.success("Histórico resumido e registrado.");
      setLead((l) => (l ? { ...l, ai_resumo: r?.resumo || l.ai_resumo } : l));
      reloadInteracoes();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível resumir."),
  });

  const mEnviar = useMutation({
    mutationFn: (tipo) => enviar({ data: { leadId, mensagem, tipo } }),
    onSuccess: async () => {
      toast.success("Mensagem enviada pelo WhatsApp Business.");
      setMensagem("");
      await carregar();
      reloadInteracoes();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível enviar a mensagem."),
  });

  const mConsent = useMutation({
    mutationFn: (payload) => consentimento({ data: { leadId, ...payload } }),
    onSuccess: async () => {
      toast.success("Autorização atualizada.");
      await carregar();
      reloadInteracoes();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível registrar."),
  });

  async function mudarEtapa(etapa) {
    const anterior = lead.etapa;
    setLead({ ...lead, etapa });
    try {
      await base44.entities.Lead.update(leadId, { etapa });
      await base44.entities.LeadInteraction.create({
        lead_id: leadId,
        empresa: lead.empresa,
        tipo: "sistema",
        mensagem: `Etapa alterada: ${etapa}`,
        autor: "Painel",
        detalhe: `De "${anterior}" para "${etapa}"`,
      });
      reloadInteracoes();
    } catch (e) {
      setLead({ ...lead, etapa: anterior });
      toast.error(e?.message || "Não foi possível alterar a etapa.");
    }
  }

  async function registrarEnvioManual() {
    if (mensagem.trim().length < 5) return toast.error("Escreva a mensagem antes de registrar.");
    try {
      const agora = new Date().toISOString();
      await base44.entities.Lead.update(leadId, {
        ultimo_contato_em: agora,
        consent_mensagem: mensagem,
        consentimento: lead.consentimento === "autorizado" ? "autorizado" : "solicitado",
        consent_solicitado_em: lead.consent_solicitado_em || agora,
        etapa: lead.consentimento === "autorizado" ? lead.etapa : "aguardando_autorizacao",
        consent_origem: lead.consent_origem || "Envio manual pelo operador (registrado no CRM)",
      });
      await base44.entities.LeadInteraction.create({
        lead_id: leadId,
        empresa: lead.empresa,
        tipo: "whatsapp_enviado",
        mensagem,
        autor: "Registro manual",
        detalhe: "Mensagem enviada fora da API e registrada no histórico.",
      });
      toast.success("Envio registrado no histórico.");
      await carregar();
      reloadInteracoes();
    } catch (e) {
      toast.error(e?.message || "Não foi possível registrar.");
    }
  }

  if (carregando) {
    return <div className="flex items-center gap-2 py-20 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" /> Carregando lead...</div>;
  }
  if (!lead) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-300">{erro || "Lead não encontrado."}</p>
        <Link to={crmPath} className="mt-3 inline-block text-[12.5px] font-semibold text-primary">Voltar ao CRM</Link>
      </div>
    );
  }

  const bloqueado = lead.bloqueado || ["recusado", "revogado"].includes(lead.consentimento);
  const autorizado = lead.consentimento === "autorizado";

  return (
    <div className="space-y-5">
      <Link to={crmPath} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/45 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> CRM
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-white">{lead.empresa}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
            {lead.categoria && <span>{lead.categoria}</span>}
            {lead.cidade && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.cidade}{lead.bairro ? ` · ${lead.bairro}` : ""}</span>}
            {lead.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>}
            {!lead.site && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">Sem site</span>}
            {lead.site && <a href={lead.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#8ab4f8] hover:underline"><Globe className="h-3 w-3" />site</a>}
            {lead.nota_google != null && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-[#FBBC05] text-[#FBBC05]" />{lead.nota_google} ({lead.total_avaliacoes || 0})</span>}
          </p>
          {!representante && <RepresentanteDoLead lead={lead} variante="destaque" />}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lead.etapa}
            onChange={(e) => mudarEtapa(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1729] px-2.5 py-2 text-[12px] font-semibold text-white"
          >
            {FUNIL_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <StatusPill map={STATUS_CONSENT} value={lead.consentimento} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
                <Bot className="h-4 w-4 text-primary" /> Assistente comercial (IA)
              </p>
              <button
                onClick={() => mAnalisar.mutate()}
                disabled={mAnalisar.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11.5px] font-bold text-[#0a1128] disabled:opacity-60"
              >
                {mAnalisar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {lead.ai_resumo ? "Analisar novamente" : "Analisar empresa"}
              </button>
            </div>

            {lead.ai_resumo ? (
              <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed">
                <Block titulo="Resumo" texto={lead.ai_resumo} />
                {lead.ai_oportunidades && <Block titulo="Serviços indicados" texto={lead.ai_oportunidades} />}
                {lead.ai_abordagem && <Block titulo="Sugestão de abordagem" texto={lead.ai_abordagem} />}
                {lead.ai_proposta && <Block titulo="Esboço de proposta" texto={lead.ai_proposta} />}
                <p className="text-[10.5px] text-white/25">Analisado em {dataHora(lead.ai_analisado_em)}</p>
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
                Nenhuma análise ainda. A IA identifica quais dos quatro serviços fazem sentido para
                esta empresa e sugere uma abordagem.
              </p>
            )}

            <button
              onClick={() => mResumo.mutate()}
              disabled={mResumo.isPending}
              className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {mResumo.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <History className="h-3 w-3" />}
              Resumir histórico e sugerir próxima ação
            </button>
          </section>

          {(() => {
            const props = {
              lead,
              onGerado: () => {
                carregar();
                reloadInteracoes();
              },
              onUsarMensagem: (texto) => {
                setMensagem(texto);
                toast.success("Mensagem pronta no campo de WhatsApp. Revise antes de enviar.");
                document.getElementById("mensagem-whatsapp")?.scrollIntoView({ behavior: "smooth", block: "center" });
              },
            };
            return representante ? <SiteDoLeadRepresentante {...props} /> : <SiteDoLead {...props} />;
          })()}

          <section id="mensagem-whatsapp" className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Mensagem de WhatsApp</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { tipo: "autorizacao", label: "Pedir autorização" },
                { tipo: "proposta", label: "Proposta" },
                { tipo: "followup", label: "Follow-up" },
                { tipo: "resposta_avaliacao", label: "Resposta a avaliação" },
              ].map((b) => (
                <button
                  key={b.tipo}
                  onClick={() => mRascunho.mutate(b.tipo)}
                  disabled={mRascunho.isPending}
                  className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/65 hover:border-primary/40 hover:text-white disabled:opacity-50"
                >
                  {b.label}
                </button>
              ))}
              {mRascunho.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </div>

            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
              placeholder="A mensagem gerada aparece aqui. Revise e edite antes de enviar."
              className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[12.5px] leading-relaxed text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
            />

            {bloqueado && (
              <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-red-300">
                Este contato recusou ou revogou a autorização. Nenhuma mensagem promocional pode ser
                enviada. O sistema bloqueia o envio automaticamente.
              </p>
            )}
            {!bloqueado && !autorizado && (
              <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-amber-200">
                Sem autorização registrada, apenas a mensagem de solicitação pode ser enviada.
                O material promocional é liberado depois do consentimento.
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => mEnviar.mutate(lead.consentimento === "autorizado" ? "proposta" : "autorizacao")}
                disabled={mEnviar.isPending || bloqueado || mensagem.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-[11.5px] font-bold text-[#062b14] disabled:opacity-40"
              >
                {mEnviar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Enviar pela API
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(mensagem);
                  toast.success("Mensagem copiada.");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/70"
              >
                <Copy className="h-3 w-3" /> Copiar
              </button>
              <a
                href={`https://wa.me/55${(lead.telefone || "").replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(mensagem)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/70"
              >
                <ExternalLink className="h-3 w-3" /> Abrir WhatsApp
              </a>
              <button
                onClick={registrarEnvioManual}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/55 hover:text-white"
              >
                Registrar envio manual
              </button>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
              Nada é disparado em massa: cada envio depende deste botão e do seu controle.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Autorização (LGPD / WhatsApp)
            </p>
            <dl className="mt-3 space-y-1.5 text-[11.5px]">
              <Row label="Situação" value={<StatusPill map={STATUS_CONSENT} value={lead.consentimento} />} />
              <Row label="Solicitada em" value={dataHora(lead.consent_solicitado_em)} />
              <Row label="Autorizada em" value={dataHora(lead.consent_autorizado_em)} />
              <Row label="Revogada em" value={dataHora(lead.consent_revogado_em)} />
              <Row label="Origem" value={lead.consent_origem || "—"} />
              <Row label="Último contato" value={dataHora(lead.ultimo_contato_em)} />
            </dl>

            {lead.consent_mensagem && (
              <div className="mt-3 rounded-lg bg-white/[0.03] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Mensagem enviada</p>
                <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-white/55">{lead.consent_mensagem}</p>
              </div>
            )}
            {lead.consent_resposta && (
              <div className="mt-2 rounded-lg bg-white/[0.03] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Resposta recebida</p>
                <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-white/55">{lead.consent_resposta}</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => mConsent.mutate({ status: "autorizado", resposta: "Autorização registrada manualmente pelo operador." })}
                disabled={mConsent.isPending}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[11px] font-bold text-emerald-300 disabled:opacity-50"
              >
                <ShieldCheck className="h-3 w-3" /> Autorizou
              </button>
              <button
                onClick={() => mConsent.mutate({ status: "recusado", resposta: "Recusa registrada pelo operador." })}
                disabled={mConsent.isPending}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-[11px] font-bold text-red-300 disabled:opacity-50"
              >
                <ShieldX className="h-3 w-3" /> Recusou
              </button>
            </div>
            <button
              onClick={() => mConsent.mutate({ status: "revogado", resposta: "Autorização revogada." })}
              disabled={mConsent.isPending}
              className="mt-2 w-full rounded-lg border border-white/10 px-2 py-2 text-[11px] font-semibold text-white/50 hover:text-white disabled:opacity-50"
            >
              Revogar autorização
            </button>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <MessageCircle className="h-4 w-4 text-primary" /> Histórico
            </p>
            <div className="mt-3 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {interacoes.length === 0 ? (
                <p className="text-[12px] text-white/30">Nenhuma interação registrada ainda.</p>
              ) : (
                interacoes.map((i) => (
                  <div key={i.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-white/30">
                      <span>{i.tipo.replace(/_/g, " ")}</span>
                      <span>{dataHora(i.created_date)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-white/65">{i.mensagem}</p>
                    {i.detalhe && <p className="mt-1 text-[10.5px] text-white/30">{i.detalhe}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          {lead.observacoes && (
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Observações</p>
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-white/55">{lead.observacoes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ titulo, texto }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{titulo}</p>
      <p className="mt-0.5 whitespace-pre-line text-white/65">{texto}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-white/35">{label}</dt>
      <dd className="text-right text-white/65">{value}</dd>
    </div>
  );
}