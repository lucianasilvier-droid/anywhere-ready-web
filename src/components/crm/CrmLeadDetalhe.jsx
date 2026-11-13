import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Sparkles, MessageCircle, Copy, ExternalLink, ShieldCheck, ShieldX,
  Send, History, Phone, Globe, MapPin, Star, Bot, Mail,
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
import { gerarSiteFn, siteDoLeadFn } from "@/lib/sites-clientes-fns";
import RepresentanteDoLead from "@/components/crm/RepresentanteDoLead";
import { STATUS_CONSENT, dataHora, telefoneWhatsApp } from "@/lib/format";

/** Ficha do lead no CRM. No painel do representante, só abre clientes do próprio representante. */
export default function CrmLeadDetalhe({ leadId, base = "/admin" }) {
  const representante = base === "/representante";
  const crmPath = representante ? "/representante/crm" : "/admin/leads";
  const [lead, setLead] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [emailEdicao, setEmailEdicao] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [respostaManual, setRespostaManual] = useState("");
  const [evidenciaConsentimento, setEvidenciaConsentimento] = useState("");
  const [tipoRespostaManual, setTipoRespostaManual] = useState("indefinida");
  const [salvandoRespostaManual, setSalvandoRespostaManual] = useState(false);
  const [erro, setErro] = useState("");
  const { items: interacoes, reload: reloadInteracoes } = useEntityList("LeadInteraction", { lead_id: leadId });

  const analisar = useServerFn(analyzeLeadFn);
  const rascunho = useServerFn(draftMessageFn);
  const resumir = useServerFn(summarizeHistoryFn);
  const enviar = useServerFn(sendWhatsappFn);
  const consentimento = useServerFn(registerConsentFn);
  const buscarSite = useServerFn(siteDoLeadFn);
  const gerarSite = useServerFn(gerarSiteFn);

  async function carregar() {
    setCarregando(true);
    try {
      const registro = await base44.entities.Lead.get(leadId);
      setLead(registro);
      setEmailEdicao(String(registro.email || registro.email_contato || registro.email_publico || "").trim());
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
    mutationFn: async (tipo) => {
      let previewSiteUrl = "";
      if (!lead.site && ["autorizacao", "proposta"].includes(tipo)) {
        const atual = await buscarSite({ data: { leadId } });
        let site = atual?.site || null;
        if (!site && tipo === "autorizacao") {
          try {
            const criado = await gerarSite({ data: { leadId, orientacoes: "Criar uma prévia comercial visualmente atraente, moderna e fiel às informações públicas verificáveis deste estabelecimento. Manter como demonstração, sem afirmar que o cliente já contratou." } });
            site = criado?.site || null;
            if (site) toast.success("Prévia do site criada para acompanhar a abordagem.");
          } catch (e) {
            toast.error("Não foi possível gerar a prévia do site. A mensagem será preparada sem prometer um site pronto: " + (e?.message || "verifique a chave Claude."));
          }
        }
        if (site?.slug && typeof window !== "undefined") previewSiteUrl = `${window.location.origin}/site/${site.slug}`;
      }
      const payload = { leadId, tipo };
      if (previewSiteUrl) payload.previewSiteUrl = previewSiteUrl;
      return rascunho({ data: payload });
    },
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
      setEvidenciaConsentimento("");
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
    } catch (e) {
      setLead((atual) => atual ? { ...atual, etapa: anterior } : atual);
      toast.error(e?.message || "Não foi possível salvar a etapa.");
      return;
    }

    // A etapa já está persistida. Falha no histórico não pode reverter a tela
    // nem fazer parecer que a alteração não foi salva.
    setLead((atual) => atual ? { ...atual, etapa } : atual);
    try {
      await base44.entities.LeadInteraction.create({
        lead_id: leadId,
        empresa: lead.empresa,
        tipo: "sistema",
        mensagem: `Etapa alterada: ${etapa}`,
        autor: representante
          ? lead.representante_nome || lead.responsavel || "Representante"
          : "Administrador",
        detalhe: `De "${anterior}" para "${etapa}"`,
      });
      toast.success("Etapa atualizada e registrada.");
    } catch (historyError) {
      toast.warning("Etapa salva. Não foi possível registrar o histórico: " + (historyError?.message || "tente novamente."));
    }
    reloadInteracoes();
  }

  async function salvarEmailLead(e) {
    e.preventDefault();
    const email = emailEdicao.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um endereço de e-mail válido.");
      return;
    }
    setSalvandoEmail(true);
    try {
      await base44.entities.Lead.update(leadId, { email });
      setLead((atual) => atual ? { ...atual, email, email_contato: "", email_publico: "" } : atual);
      setEmailEdicao(email);
      toast.success(email ? "E-mail do estabelecimento atualizado." : "E-mail removido do cadastro.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar o e-mail.");
    } finally {
      setSalvandoEmail(false);
    }
  }

  function registrarAberturaEmail() {
    if (!emailLead) return;
    base44.entities.LeadInteraction.create({
      lead_id: leadId,
      empresa: lead.empresa,
      tipo: "email_aberto",
      mensagem: "Rascunho preparado para " + emailLead + ": " + emailAssunto,
      autor: "Painel",
      detalhe: "Aplicativo de e-mail aberto; o envio não foi confirmado.",
    })
      .then(() => reloadInteracoes())
      .catch((e) => toast.error(e?.message || "Não foi possível registrar a abertura do e-mail."));
  }

  async function registrarEnvioManual() {
    if (!autorizado || bloqueado) return toast.error("Registre o consentimento prévio do contato antes de enviar ou registrar uma mensagem pelo WhatsApp.");
    if (mensagem.trim().length < 5) return toast.error("Escreva a mensagem antes de registrar.");
    try {
      const agora = new Date().toISOString();
      await base44.entities.Lead.update(leadId, {
        ultimo_contato_em: agora,
        consent_mensagem: mensagem,
        consentimento: "autorizado",
        etapa: lead.etapa,
        consent_origem: lead.consent_origem || "Consentimento prévio registrado no CRM",
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

  async function registrarRespostaManual(e) {
    e.preventDefault();
    if (!representante || salvandoRespostaManual) return;
    const texto = respostaManual.trim();
    if (texto.length < 2) return toast.error("Informe o que o cliente respondeu.");

    const bloqueado = lead.bloqueado || ["recusado", "revogado"].includes(lead.consentimento);
    const tipo = tipoRespostaManual === "sim" && bloqueado ? "sim_bloqueado" : tipoRespostaManual;
    const agora = new Date().toISOString();
    setSalvandoRespostaManual(true);
    let notificacaoSalva = false;
    try {
      await base44.entities.LeadInteraction.create({
        lead_id: leadId,
        empresa: lead.empresa,
        tipo: "whatsapp_recebido",
        origem_registro: "manual",
        resposta_tipo: tipo,
        mensagem: texto,
        autor: lead.representante_nome || lead.responsavel || "Representante",
        detalhe: tipo === "sim_bloqueado"
          ? "Resposta anotada manualmente. O bloqueio anterior foi preservado."
          : "Resposta recebida pelo representante e registrada manualmente, sem conexão com a API.",
        notificacao_lida: false,
        recebido_em: agora,
      });
      notificacaoSalva = true;

      if (tipoRespostaManual === "nao") {
        await consentimento({ data: {
          leadId,
          status: "recusado",
          resposta: texto,
          origem: "Resposta recebida e registrada manualmente pelo representante",
        } });
      } else if (tipoRespostaManual === "sim" && !bloqueado) {
        await consentimento({ data: {
          leadId,
          status: "autorizado",
          resposta: texto,
          origem: "Resposta recebida e registrada manualmente pelo representante",
        } });
      }

      toast.success("Resposta registrada. A notificação foi enviada ao painel administrativo.");
      setRespostaManual("");
      setTipoRespostaManual("indefinida");
      await carregar();
      reloadInteracoes();
    } catch (e) {
      toast.error(notificacaoSalva
        ? "A resposta foi registrada e notificada, mas houve falha ao atualizar a autorização: " + (e?.message || "verifique o cadastro.")
        : e?.message || "Não foi possível registrar a resposta.");
      if (notificacaoSalva) reloadInteracoes();
    } finally {
      setSalvandoRespostaManual(false);
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
  const emailLead = String(lead.email || lead.email_contato || lead.email_publico || "").trim();
  const mapsQuery = encodeURIComponent([lead.empresa, lead.endereco || [lead.bairro, lead.cidade, lead.estado].filter(Boolean).join(", ")].filter(Boolean).join(" "));
  const rawMapsPlaceId = String(lead.place_id || "");
  const mapsPlaceId = rawMapsPlaceId.startsWith("osm:") ? "" : rawMapsPlaceId.replace(/^places\//, "");
  const mapsUrl = mapsPlaceId
    ? "https://www.google.com/maps/search/?api=1&query=" + mapsQuery + "&query_place_id=" + encodeURIComponent(mapsPlaceId)
    : "https://www.google.com/maps/search/?api=1&query=" + mapsQuery;
  const emailAssunto = "Uma ideia para valorizar " + (lead.empresa || "seu estabelecimento") + " no Google";
  const emailCorpo = [
    "Olá, equipe " + (lead.empresa || "do estabelecimento") + "!",
    "",
    "Encontrei o perfil de vocês" + (lead.categoria ? " na categoria " + lead.categoria : "") + ((lead.bairro || lead.cidade) ? " em " + [lead.bairro, lead.cidade].filter(Boolean).join(", ") : "") + " e gostaria de apresentar uma ideia para facilitar o acesso dos clientes às avaliações no Google por meio de uma placa NFC.",
    "",
    "Se fizer sentido para vocês, posso enviar uma apresentação breve com os detalhes. Se não quiserem receber esse tipo de contato, basta me avisar.",
    "",
    "Atenciosamente,",
    "Equipe Google NFC Connect",
  ].join("\n");
  const emailHref = emailLead
    ? "mailto:" + encodeURIComponent(emailLead) + "?subject=" + encodeURIComponent(emailAssunto) + "&body=" + encodeURIComponent(emailCorpo)
    : "";

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
            {emailLead && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{emailLead}</span>}
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#8ab4f8] hover:underline"><MapPin className="h-3 w-3" />Abrir Google Maps</a>
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

      <form onSubmit={salvarEmailLead} className="flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-white/45">E-mail comercial do estabelecimento</span>
          <input
            type="email"
            value={emailEdicao}
            onChange={(e) => setEmailEdicao(e.target.value)}
            placeholder="contato@empresa.com.br"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
          />
        </label>
        <button type="submit" disabled={salvandoEmail} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[11.5px] font-bold text-[#0a1128] disabled:opacity-50">
          {salvandoEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
          {salvandoEmail ? "Salvando..." : "Salvar e-mail"}
        </button>
      </form>

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
                A política do WhatsApp exige consentimento prévio antes de iniciar contato. Obtenha a autorização por um canal apropriado, identifique a empresa e registre a evidência aqui. Até lá, o CRM não libera envio pela API nem abertura do WhatsApp.
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => mEnviar.mutate(lead.consentimento === "autorizado" ? "proposta" : "autorizacao")}
                disabled={mEnviar.isPending || bloqueado || !autorizado || mensagem.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-[11.5px] font-bold text-[#062b14] disabled:opacity-40"
              >
                {mEnviar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {autorizado ? "Enviar pela API" : "API bloqueada até autorização"}
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
              {autorizado && !bloqueado ? (
                <a
                  href={`https://wa.me/${telefoneWhatsApp(lead.telefone)}?text=${encodeURIComponent(mensagem)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/70"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir WhatsApp
                </a>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-white/30" title="Registre o consentimento prévio antes de abrir o WhatsApp.">
                  <ExternalLink className="h-3 w-3" /> WhatsApp após autorização
                </span>
              )}
              {emailLead ? (
                <a href={emailHref} onClick={registrarAberturaEmail} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-semibold text-white/70 hover:border-primary/40 hover:text-white">
                  <Mail className="h-3 w-3" /> Abrir e-mail
                </a>
              ) : (
                <span title="Cadastre um e-mail para este estabelecimento para habilitar o envio." className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-white/30">
                  <Mail className="h-3 w-3" /> E-mail não disponível
                </span>
              )}
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

            <div className="mt-3 space-y-2">
              <label className="block text-[10.5px] font-semibold text-white/45">
                Evidência do consentimento prévio
                <textarea
                  value={evidenciaConsentimento}
                  onChange={(e) => setEvidenciaConsentimento(e.target.value)}
                  rows={2}
                  placeholder="Registre a resposta ou a origem da autorização (ex.: formulário do site, solicitação do próprio cliente)."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => mConsent.mutate({ status: "autorizado", resposta: evidenciaConsentimento.trim(), origem: "Consentimento prévio documentado pelo operador" })}
                disabled={mConsent.isPending || evidenciaConsentimento.trim().length < 5}
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
            </div>
            <button
              onClick={() => mConsent.mutate({ status: "revogado", resposta: "Autorização revogada." })}
              disabled={mConsent.isPending}
              className="mt-2 w-full rounded-lg border border-white/10 px-2 py-2 text-[11px] font-semibold text-white/50 hover:text-white disabled:opacity-50"
            >
              Revogar autorização
            </button>
          </section>

          {representante && (
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.045] p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-primary">Registrar resposta recebida</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">
                Enquanto a API do WhatsApp não estiver conectada, anote aqui a resposta que você recebeu do cliente.
                O painel administrativo será avisado automaticamente.
              </p>
              <form onSubmit={registrarRespostaManual} className="mt-3 space-y-2.5">
                <select
                  value={tipoRespostaManual}
                  onChange={(e) => setTipoRespostaManual(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0d1729] px-3 py-2 text-[12px] text-white"
                  disabled={salvandoRespostaManual}
                >
                  <option value="indefinida">Outra resposta / precisa analisar</option>
                  <option value="sim">Cliente autorizou (SIM)</option>
                  <option value="nao">Cliente recusou (NÃO)</option>
                </select>
                <textarea
                  value={respostaManual}
                  onChange={(e) => setRespostaManual(e.target.value)}
                  rows={3}
                  placeholder="Digite a resposta que o cliente enviou..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[12px] leading-relaxed text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
                  disabled={salvandoRespostaManual}
                />
                <button
                  type="submit"
                  disabled={salvandoRespostaManual || respostaManual.trim().length < 2}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-[12px] font-bold text-[#0a1128] disabled:opacity-50"
                >
                  {salvandoRespostaManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  {salvandoRespostaManual ? "Registrando..." : "Registrar resposta e notificar administrador"}
                </button>
              </form>
              {bloqueado && (
                <p className="mt-2 text-[10.5px] leading-relaxed text-amber-200/75">
                  Este contato já está bloqueado. Uma resposta SIM será registrada, mas não removerá o bloqueio nem reativará a autorização.
                </p>
              )}
            </section>
          )}

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
                    {i.autor && <p className="mt-1 text-[10.5px] font-semibold text-sky-200/70">Responsável: {i.autor}</p>}
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