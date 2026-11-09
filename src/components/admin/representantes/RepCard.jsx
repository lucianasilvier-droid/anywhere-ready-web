import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, Globe, Pencil, Mail, Loader2 } from "lucide-react";
import { adminPaginaRepresentanteFn } from "@/lib/landing-representante-fns";
import { reenviarConviteRepresentanteFn } from "@/lib/representantes-fns";
import { brl } from "@/lib/format";
import { STATUS_REPRESENTANTE } from "@/lib/representante-ui";

export default function RepCard({ rep, onEditar, onAtualizado }) {
  const alternarPagina = useServerFn(adminPaginaRepresentanteFn);
  const reenviarConvite = useServerFn(reenviarConviteRepresentanteFn);
  const [processando, setProcessando] = useState(false);
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const paginaAtiva = rep.pagina_ativa !== false;
  const endereco = rep.pagina_slug || rep.codigo;

  async function enviarConvite() {
    setEnviandoConvite(true);
    try {
      const resultado = await reenviarConvite({ data: { id: rep.id } });
      if (resultado?.delivered === false) {
        toast.error(resultado.mensagem || "O sistema não confirmou o envio do e-mail.");
      } else {
        toast.success(resultado?.mensagem || "Convite solicitado para envio por e-mail.");
      }
    } catch (e) {
      toast.error(e?.message || "Não foi possível reenviar o convite.");
    } finally {
      setEnviandoConvite(false);
    }
  }

  async function mudarPagina() {
    setProcessando(true);
    try {
      await alternarPagina({ data: { id: rep.id, ativa: !paginaAtiva } });
      toast.success(paginaAtiva ? "Página suspensa." : "Página publicada.");
      await onAtualizado?.();
    } catch (e) {
      toast.error(e?.message || "Não foi possível alterar a página.");
    } finally {
      setProcessando(false);
    }
  }

  const status = STATUS_REPRESENTANTE[rep.status] || STATUS_REPRESENTANTE.ativo;
  const m = rep.metricas || {};

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-heading text-[14px] font-bold text-white">{rep.nome}</p>
          <p className="truncate text-[11px] text-white/40">
            {rep.codigo ? `${rep.codigo} · ` : ""}
            {rep.user_email || rep.email}
          </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Vendas", value: m.vendas || 0 },
          { label: "Comissão total", value: brl(m.comissao_total || 0) },
          { label: "Disponível", value: brl(m.comissao_disponivel || 0) },
          { label: "Pago", value: brl(m.comissao_paga || 0) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9.5px] uppercase tracking-wider text-white/35">{item.label}</p>
            <p className="truncate text-[12px] font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-2.5 py-1.5">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/50">
          <Globe className="h-3 w-3 shrink-0" />
          {paginaAtiva && rep.status === "ativo" && endereco ? (
            <a href={`/r/${endereco}`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-primary hover:underline">
              /r/{endereco} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span>{rep.status !== "ativo" ? "Página oculta (representante não ativo)" : "Página suspensa"}</span>
          )}
        </p>
        <button
          onClick={mudarPagina}
          disabled={processando}
          className="shrink-0 text-[10.5px] font-semibold text-white/45 hover:text-white disabled:opacity-50"
        >
          {paginaAtiva ? "Suspender página" : "Publicar página"}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-[10.5px] text-white/30">
          {brl(m.comissao_aguardando || 0)} aguardando pagamento do cliente
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={enviarConvite}
            disabled={enviandoConvite}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {enviandoConvite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            Enviar convite
          </button>
          <button
            onClick={() => onEditar(rep)
            className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 text-[11px] font-semibold text-white/60 hover:text-white"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
          <Link
            to="/admin/representantes/$repId"
            params={{ repId: rep.id }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/25"
          >
            Abrir <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}