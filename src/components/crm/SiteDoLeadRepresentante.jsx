import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe, Loader2, MessageCircle, Wand2 } from "lucide-react";
import { gerarSiteFn, siteDoLeadFn } from "@/lib/sites-clientes-fns";
import { LIMITE_SITES_DIA_REPRESENTANTE } from "@/lib/crm-limites";

const STATUS = {
  demonstracao: { label: "Demonstração", cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  publicado: { label: "Publicado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  desativado: { label: "Desativado", cls: "border-white/15 bg-white/5 text-white/50" },
};

/**
 * Cartão "Site para o cliente" no painel do representante. O representante cria até
 * 2 sites de demonstração por dia, só para os próprios clientes, e compartilha o link.
 * Preço, custos e status do site continuam com o administrador.
 */
export default function SiteDoLeadRepresentante({ lead, onUsarMensagem, onGerado }) {
  const buscar = useServerFn(siteDoLeadFn);
  const gerar = useServerFn(gerarSiteFn);
  const [site, setSite] = useState(null);
  const [limite, setLimite] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [orientacoes, setOrientacoes] = useState("");

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscar({ data: { leadId: lead.id } })
      .then((r) => {
        if (!ativo) return;
        setSite(r?.site || null);
        setLimite(r?.limite || null);
      })
      .catch(() => {})
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const mGerarAutomatico = useMutation({
    mutationFn: () => gerar({ data: { leadId: lead.id, orientacoes } }),
    onSuccess: (r) => {
      if (!r?.ok || !r?.site) {
        toast.error("O CRM não confirmou a criação do site.");
        return;
      }
      setSite(r.site);
      if (r?.limite) setLimite(r.limite);
      toast.success("Site de demonstração criado e salvo no CRM.");
      onGerado?.();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível criar o site."),
  });

  const total = limite?.limite ?? LIMITE_SITES_DIA_REPRESENTANTE;
  const restantes = limite ? limite.restantes : total;
  const esgotado = restantes <= 0;
  const url = site && typeof window !== "undefined" ? `${window.location.origin}/site/${site.slug}` : "";

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/60">
          <Globe className="h-4 w-4 text-primary" /> Site para o cliente
        </p>
        {site ? (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${STATUS[site.status]?.cls || STATUS.demonstracao.cls}`}>
            {STATUS[site.status]?.label || site.status}
          </span>
        ) : (
          limite && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${esgotado ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/15 bg-white/5 text-white/60"}`}>
              Sites hoje: {limite.usados}/{total}
            </span>
          )
        )}
      </div>

      {carregando ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-white/40"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando...</p>
      ) : !site ? (
        <div className="mt-2.5 space-y-3">
          <p className="text-[12.5px] leading-relaxed text-white/65">
            {lead.site ? (
              <>Esta empresa já tem um site próprio, mas você pode criar uma demonstração nova para oferecer. </>
            ) : (
              <><strong className="text-white">Esta empresa não tem site.</strong> </>
            )}
            O sistema monta automaticamente uma demonstração com os dados cadastrados, localização, informações do segmento e contato pelo WhatsApp. Nenhuma API paga é utilizada.
          </p>
          <textarea
            value={orientacoes}
            onChange={(e) => setOrientacoes(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Observação opcional que aparecerá no site (não inclua dados não confirmados)"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
          />
          <button
            onClick={() => mGerarAutomatico.mutate()}
            disabled={mGerarAutomatico.isPending || esgotado}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-50"
          >
            {mGerarAutomatico.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {mGerarAutomatico.isPending ? "Criando demonstração..." : "Criar site automaticamente"}
          </button>
          <p className={`text-[11px] ${esgotado ? "text-red-300" : "text-white/40"}`}>
            {esgotado
              ? `Você já criou ${total} sites hoje, que é o limite diário. Amanhã você pode criar mais.`
              : `Você pode criar ${total} sites por dia. Restam ${restantes} hoje.`}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="truncate text-[13px] font-semibold text-white">{site.conteudo?.titulo || site.empresa}</p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-white/45">{site.conteudo?.subtitulo}</p>
            <a href={`/site/${site.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-[11.5px] font-semibold text-[#8ab4f8] hover:underline">
              /site/{site.slug} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <a href={`/site/${site.slug}`} target="_blank" rel="noreferrer" className={btnCls}>
              <ExternalLink className="h-3 w-3" /> Ver site
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(url);
                toast.success("Link copiado.");
              }}
              className={btnCls}
            >
              <Copy className="h-3 w-3" /> Copiar link
            </button>
            <button
              onClick={() =>
                onUsarMensagem?.(
                  `Olá! Tudo bem? Preparamos uma demonstração gratuita de site para a ${site.empresa}, com mapa do Google e agendamento direto pelo WhatsApp:\n${url}\n\nSe gostar, ativamos com o seu domínio e ajustamos o que quiser. Posso te explicar como funciona?`,
                )
              }
              className={btnCls}
            >
              <MessageCircle className="h-3 w-3" /> Oferecer pelo WhatsApp
            </button>
          </div>
          <p className="text-[10.5px] leading-relaxed text-white/35">
            Ajustes, preço e publicação do site são feitos pelo administrador. Quando o cliente fechar, avise a equipe.
          </p>
        </div>
      )}
    </section>
  );
}

const btnCls =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-50";
