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

function tipoResposta(item) {
  if (item.origem_registro === "manual") {
    if (item.resposta_tipo === "sim") return { titulo: "Resposta SIM registrada manualmente", classe: "text-emerald-300", fundo: "bg-emerald-500/10", detalhe: "Registro feito pelo representante" };
    if (item.resposta_tipo === "nao") return { titulo: "Resposta NÃO registrada manualmente", classe: "text-red-300", fundo: "bg-red-500/10", detalhe: "Contato bloqueado" };
    if (item.resposta_tipo === "sim_bloqueado") return { titulo: "Resposta SIM · bloqueio mantido", classe: "text-amber-200", fundo: "bg-amber-500/10", detalhe: "Resposta manual; bloqueio preservado" };
    return { titulo: "Resposta registrada manualmente", classe: "text-amber-200", fundo: "bg-amber-500/10", detalhe: "Revisar resposta do cliente" };
  }
  if (item.resposta_tipo === "sim") return { titulo: "Cliente respondeu SIM", classe: "text-emerald-300", fundo: "bg-emerald-500/10", detalhe: "Autorização recebida" };
  if (item.resposta_tipo === "nao") return { titulo: "Cliente respondeu NÃO", classe: "text-red-300", fundo: "bg-red-500/10", detalhe: "Contato bloqueado" };
  if (item.resposta_tipo === "sim_bloqueado") return { titulo: "Cliente respondeu SIM · bloqueio mantido", classe: "text-amber-200", fundo: "bg-amber-500/10", detalhe: "Autorização não reativada" };
  return { titulo: "Cliente enviou uma resposta", classe: "text-amber-200", fundo: "bg-amber-500/10", detalhe: "Revisar resposta" };
}

export default function WhatsAppReplyNotifications() {
  const [items, setItems] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const initialLoad = useRef(true);
  const knownIds = useRef(new Set());

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const result = await base44.entities.LeadInteraction.filter(
          { tipo: "whatsapp_recebido" },
          { sort: "-created_date", limit: 50 },
        );
        if (!ativo) return;
        const recebidasBrutas = Array.isArray(result) ? result : result?.items || [];
        // Interações antigas não tinham campo de leitura: exibi-las como lidas evita alertas retroativos.
        const recebidas = recebidasBrutas.map((item) => ({ ...item, notificacao_lida: item.notificacao_lida === false ? false : true }));
        const novas = recebidas.filter((item) => item.id && !knownIds.current.has(item.id));
        if (!initialLoad.current && novas.length) {
          novas.forEach((item) => {
            const tipo = tipoResposta(item);
            toast(tipo.titulo, { description: item.empresa || item.mensagem || "Nova mensagem no WhatsApp" });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(tipo.titulo, { body: item.empresa || item.mensagem || "Nova resposta recebida" });
            }
          });
        }
        recebidas.forEach((item) => knownIds.current.add(item.id));
        initialLoad.current = false;
        setItems(recebidas);
        setErro("");
      } catch (e) {
        if (ativo) setErro(e?.message || "Não foi possível carregar as notificações.");
      }
    }
    carregar();
    const timer = window.setInterval(carregar, 15000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, []);

  const naoLidas = items.filter((item) => item.notificacao_lida !== true).length;

  async function marcarLida(item) {
    try {
      await base44.entities.LeadInteraction.update(item.id, { notificacao_lida: true });
      setItems((atual) => atual.map((x) => x.id === item.id ? { ...x, notificacao_lida: true } : x));
    } catch (e) {
      toast.error(e?.message || "Não foi possível atualizar a notificação.");
    }
  }

  async function marcarTodas() {
    const pendentes = items.filter((item) => item.notificacao_lida !== true);
    try {
      for (const item of pendentes) {
        await base44.entities.LeadInteraction.update(item.id, { notificacao_lida: true });
      }
      setItems((atual) => atual.map((item) => ({ ...item, notificacao_lida: true })));
      toast.success("Notificações marcadas como lidas.");
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((value) => !value)}
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
        aria-expanded={aberto}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/75 hover:border-primary/40 hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-[70] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1426] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div>
              <p className="text-[12px] font-bold text-white">Respostas dos clientes</p>
              <p className="text-[10.5px] text-white/40">{naoLidas} não lida(s) · atualização automática</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={ativarAvisosDoNavegador} title="Ativar notificações do navegador" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white">
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              {naoLidas > 0 && (
                <button type="button" onClick={marcarTodas} title="Marcar todas como lidas" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white">
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar notificações" className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {erro && <p className="px-4 py-2 text-[11px] text-red-300">{erro}</p>}
          <div className="max-h-[min(65vh,480px)] overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-[12px] text-white/35">Nenhuma resposta recebida ainda.</p>
            ) : items.map((item) => {
              const tipo = tipoResposta(item);
              return (
                <div key={item.id} className={`mb-1 rounded-xl border border-white/[0.06] p-3 ${item.notificacao_lida === true ? "bg-white/[0.015]" : tipo.fundo}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-[11.5px] font-bold ${tipo.classe}`}>{tipo.titulo}</p>
                      <p className="mt-0.5 truncate text-[12px] font-semibold text-white">{item.empresa || "Estabelecimento"}</p>
                    </div>
                    {!item.notificacao_lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11.5px] text-white/65">“{item.mensagem || "Mensagem sem texto"}”</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/35">{dataHora(item.recebido_em || item.created_date)}</span>
                    <div className="flex items-center gap-2">
                      {item.lead_id && (
                        <Link
                          to="/admin/lead/$leadId"
                          params={{ leadId: item.lead_id }}
                          onClick={() => marcarLida(item)}
                          className="text-[10.5px] font-bold text-primary hover:underline"
                        >
                          Abrir lead
                        </Link>
                      )}
                      {!item.notificacao_lida && (
                        <button type="button" onClick={() => marcarLida(item)} className="text-[10.5px] font-semibold text-white/45 hover:text-white">
                          Lida
                        </button>
                      )}
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
