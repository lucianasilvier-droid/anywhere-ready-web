import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function dataHora(value) {
  if (!value) return "Horário não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Horário não informado"
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function tipoAtividade(item) {
  if (item.tipo === "contato_pagina") return { titulo: "Novo contato pela página do representante", classe: "text-emerald-200", fundo: "bg-emerald-500/10" };
  if (item.tipo === "whatsapp_recebido") return { titulo: item.resposta_tipo === "nao" ? "Cliente recusou o contato" : item.resposta_tipo === "sim" ? "Cliente autorizou o contato" : "Cliente respondeu no WhatsApp", classe: item.resposta_tipo === "sim" ? "text-emerald-300" : item.resposta_tipo === "nao" ? "text-red-300" : "text-amber-200", fundo: item.resposta_tipo === "sim" ? "bg-emerald-500/10" : item.resposta_tipo === "nao" ? "bg-red-500/10" : "bg-amber-500/10" };
  if (item.tipo === "whatsapp_enviado") return { titulo: "Mensagem enviada pelo representante", classe: "text-emerald-200", fundo: "bg-emerald-500/10" };
  if (item.tipo === "sistema" || item.tipo === "etapa_alterada") return { titulo: "Movimentação no CRM", classe: "text-sky-200", fundo: "bg-sky-500/10" };
  if (item.tipo === "navegacao") return { titulo: "Representante mudou de área", classe: "text-violet-200", fundo: "bg-violet-500/10" };
  if (item.tipo === "retorno_aba") return { titulo: "Representante voltou ao sistema", classe: "text-violet-200", fundo: "bg-violet-500/10" };
  if (item.tipo === "email_aberto") return { titulo: "E-mail preparado", classe: "text-white/70", fundo: "bg-white/[0.04]" };
  if (item.tipo === "ia") return { titulo: "Atividade de análise do lead", classe: "text-primary", fundo: "bg-primary/10" };
  return { titulo: item.titulo || "Atividade do representante", classe: "text-white/75", fundo: "bg-white/[0.04]" };
}

export default function WhatsAppReplyNotifications({ representante = false }) {
  const [items, setItems] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const initialLoad = useRef(true);
  const knownIds = useRef(new Set());
  const containerRef = useRef(null);
  const buscando = useRef(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (buscando.current) return;
      buscando.current = true;
      try {
        const [interacoesRaw, atividadesRaw] = await Promise.all([
          base44.entities.LeadInteraction.filter({}, { sort: "-created_date", limit: 60 }),
          representante ? Promise.resolve([]) : base44.entities.AtividadeLog.filter({}, { sort: "-created_date", limit: 60 }),
        ]);
        if (!ativo) return;
        const interacoes = (Array.isArray(interacoesRaw) ? interacoesRaw : interacoesRaw?.items || [])
          .map((item) => ({ ...item, _entity: "LeadInteraction", _key: "interaction:" + item.id, _date: item.created_date || item.recebido_em }));
        const atividades = (Array.isArray(atividadesRaw) ? atividadesRaw : atividadesRaw?.items || [])
          .map((item) => ({ ...item, _entity: "AtividadeLog", _key: "activity:" + item.id, _date: item.created_date || item.criado_em }));
        const combinadas = [...interacoes, ...atividades]
          .sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0))
          .slice(0, 80);
        const novas = combinadas.filter((item) => item._key && !knownIds.current.has(item._key));
        if (!initialLoad.current && novas.length) {
          novas.forEach((item) => {
            const tipo = tipoAtividade(item);
            toast(tipo.titulo, { description: item.empresa || item.mensagem || item.detalhe || "Nova atividade no CRM" });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(tipo.titulo, { body: item.empresa || item.mensagem || "Nova atividade no CRM" });
            }
          });
        }
        const normalizadas = combinadas.map((item) => {
          const nova = novas.some((x) => x._key === item._key);
          const lidaSalva = item._entity === "AtividadeLog" ? item.lida : item.tipo === "contato_pagina" ? (representante ? item.notificacao_lida_representante : item.notificacao_lida_admin) : item.notificacao_lida;
          return { ...item, _lida: lidaSalva === true ? true : lidaSalva === false ? false : initialLoad.current || !nova };
        });
        combinadas.forEach((item) => knownIds.current.add(item._key));
        initialLoad.current = false;
        setItems(normalizadas);
        setErro("");
      } catch (e) {
        if (ativo) setErro(e?.message || "Não foi possível carregar as atividades.");
      } finally {
        buscando.current = false;
      }
    }
    carregar();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, 5000);
    const aoVoltar = () => { if (document.visibilityState === "visible") carregar(); };
    window.addEventListener("focus", aoVoltar);
    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", aoVoltar);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;
    function fecharAoClicarFora(event) {
      if (!containerRef.current?.contains(event.target)) setAberto(false);
    }
    function fecharComEscape(event) { if (event.key === "Escape") setAberto(false); }
    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  const naoLidas = items.filter((item) => item._lida !== true).length;

  async function marcarLida(item) {
    try {
      if (item._entity === "AtividadeLog") await base44.entities.AtividadeLog.update(item.id, { lida: true });
      else await base44.entities.LeadInteraction.update(item.id, item.tipo === "contato_pagina" ? { [representante ? "notificacao_lida_representante" : "notificacao_lida_admin"]: true } : { notificacao_lida: true });
      setItems((atual) => atual.map((x) => x._key === item._key ? { ...x, _lida: true } : x));
    } catch (e) {
      toast.error(e?.message || "Não foi possível atualizar a atividade.");
    }
  }

  async function marcarTodas() {
    const pendentes = items.filter((item) => item._lida !== true);
    try {
      for (const item of pendentes) {
        if (item._entity === "AtividadeLog") await base44.entities.AtividadeLog.update(item.id, { lida: true });
        else await base44.entities.LeadInteraction.update(item.id, item.tipo === "contato_pagina" ? { [representante ? "notificacao_lida_representante" : "notificacao_lida_admin"]: true } : { notificacao_lida: true });
      }
      setItems((atual) => atual.map((item) => ({ ...item, _lida: true })));
      toast.success("Atividades marcadas como lidas.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível marcar todas como lidas.");
    }
  }

  async function ativarAvisosDoNavegador() {
    if (!("Notification" in window)) {
      toast.info("Este navegador não oferece notificações do sistema.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") toast.success("Avisos do navegador ativados.");
    else toast.info("Permissão de notificação não concedida.");
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setAberto((value) => !value)} aria-label={naoLidas ? "Atividades: " + naoLidas + " não lidas" : "Atividades"} aria-expanded={aberto} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/75 hover:border-primary/40 hover:text-primary">
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">{naoLidas > 99 ? "99+" : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="fixed left-1/2 top-[4.25rem] z-[100] flex max-h-[calc(100dvh-5.25rem)] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1426] shadow-2xl shadow-black/50 lg:absolute lg:left-auto lg:right-0 lg:top-11 lg:max-h-[min(70vh,620px)] lg:w-[420px] lg:translate-x-0">
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div><p className="text-[12px] font-bold text-white">{representante ? "Mensagens da minha página" : "Atividades dos representantes"}</p><p className="mt-0.5 text-[10.5px] text-white/40">{naoLidas} não lida(s) · atualização a cada 5 segundos</p></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={ativarAvisosDoNavegador} title="Ativar notificações do navegador" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white"><MessageCircle className="h-3.5 w-3.5" /></button>
              {naoLidas > 0 && <button type="button" onClick={marcarTodas} title="Marcar todas como lidas" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white"><CheckCheck className="h-3.5 w-3.5" /></button>}
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar atividades" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {erro && <p className="px-4 py-2 text-[11px] text-red-300">{erro}</p>}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {items.length === 0 ? <p className="px-3 py-8 text-center text-[12px] text-white/35">Nenhuma atividade registrada ainda.</p> : items.map((item) => {
              const tipo = tipoAtividade(item);
              return (
                <div key={item._key} className={"mb-1 rounded-xl border border-white/[0.06] p-3 " + (item._lida ? "bg-white/[0.015]" : tipo.fundo)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className={"text-[11.5px] font-bold " + tipo.classe}>{tipo.titulo}</p><p className="mt-0.5 break-words text-[12px] font-semibold text-white">{item.empresa || item.representante_nome || item.autor || "Atividade no sistema"}</p></div>
                    {!item._lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-white/70">{item.mensagem || item.detalhe || "Atividade registrada"}</p>
                  {(item.autor || item.representante_nome || item.pagina) && <p className="mt-1 text-[10px] text-white/40">{item.autor || item.representante_nome || "Representante"}{item.pagina ? " · " + item.pagina : ""}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/35">{dataHora(item._date)}</span>
                    <div className="flex items-center gap-2">
                      {item.lead_id && <Link to={representante ? "/representante/lead/$leadId" : "/admin/lead/$leadId"} params={{ leadId: item.lead_id }} onClick={() => { marcarLida(item); setAberto(false); }} className="text-[10.5px] font-bold text-primary hover:underline">{representante ? "Abrir contato" : "Abrir lead"}</Link>}
                      {!item._lida && <button type="button" onClick={() => marcarLida(item)} className="text-[10.5px] font-semibold text-white/45 hover:text-white">Lida</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
