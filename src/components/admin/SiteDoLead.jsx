import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe, Loader2, MessageCircle, Plus, RefreshCw, Save, Server, Wand2 } from "lucide-react";
import { atualizarSiteFn, gerarSiteFn, prepararSiteGratuitoFn, registrarVendaSiteFn, representantesParaSiteFn, siteDoLeadFn } from "@/lib/sites-clientes-fns";
import { competenciaAtual } from "@/lib/representante-ui";
import { MENSALIDADE_SITE, PRECO_SITE, custosDoSite, resumoFinanceiro } from "@/lib/preco-site";
import { brl } from "@/lib/format";

const STATUS = {
  demonstracao: { label: "Demonstração", cls: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  publicado: { label: "Publicado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  desativado: { label: "Desativado", cls: "border-white/15 bg-white/5 text-white/50" },
};

/**
 * Cartão do CRM: quando a empresa não tem site, o agente Claude AI cria um site de
 * demonstração com Google Maps e agendamento pelo WhatsApp para oferecer ao cliente.
 */
export default function SiteDoLead({ lead, onUsarMensagem, onGerado }) {
  const buscar = useServerFn(siteDoLeadFn);
  const gerar = useServerFn(gerarSiteFn);
  const prepararGratis = useServerFn(prepararSiteGratuitoFn);
  const atualizar = useServerFn(atualizarSiteFn);
  const [site, setSite] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [orientacoes, setOrientacoes] = useState("");
  const [promptClaude, setPromptClaude] = useState("");
  const [jsonClaude, setJsonClaude] = useState("");
  const [ajustes, setAjustes] = useState({ whatsapp: "", instagram: "", horario: "", slug: "" });

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscar({ data: { leadId: lead.id } })
      .then((r) => ativo && setSite(r?.site || null))
      .catch(() => {})
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    if (site) setAjustes({ whatsapp: site.whatsapp || "", instagram: site.instagram || "", horario: site.horario || "", slug: site.slug || "" });
  }, [site]);

  const mPrepararGratis = useMutation({
    mutationFn: () => prepararGratis({ data: { leadId: lead.id, orientacoes } }),
    onSuccess: async (r) => {
      setPromptClaude(r?.prompt || "");
      try {
        await navigator.clipboard.writeText(r.prompt);
        toast.success("Instruções copiadas. Cole no Claude gratuito e peça o JSON.");
      } catch {
        toast.success("Instruções prontas. Copie o texto exibido abaixo.");
      }
    },
    onError: (e) => toast.error(e?.message || "Não foi possível preparar as instruções."),
  });

  const mSalvarGratis = useMutation({
    mutationFn: () => gerar({ data: { leadId: lead.id, orientacoes, conteudoManual: jsonClaude } }),
    onSuccess: (r) => {
      setSite(r?.site || null);
      setJsonClaude("");
      setPromptClaude("");
      toast.success("Site salvo no CRM usando o Claude gratuito.");
      onGerado?.();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível validar e salvar o site."),
  });

  const mAtualizar = useMutation({
    mutationFn: (patch) => atualizar({ data: { id: site.id, ...patch } }),
    onSuccess: (r) => {
      setSite(r?.site || site);
      toast.success("Site atualizado.");
    },
    onError: (e) => toast.error(e?.message || "Não foi possível atualizar o site."),
  });

  const semSite = !lead.site;
  const url = site && typeof window !== "undefined" ? `${window.location.origin}/site/${site.slug}` : "";


  return (
    <section className={`rounded-2xl border p-4 ${semSite ? "border-primary/30 bg-primary/[0.05]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/60">
          <Globe className="h-4 w-4 text-primary" /> Site para o cliente
        </p>
        {site && (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${STATUS[site.status]?.cls || STATUS.demonstracao.cls}`}>
            {STATUS[site.status]?.label || site.status}
          </span>
        )}
      </div>

      {carregando ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-white/40"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando...</p>
      ) : !site ? (
        <div className="mt-2.5 space-y-3">
          <p className="text-[12.5px] leading-relaxed text-white/65">
            {semSite ? (
              <><strong className="text-white">Esta empresa ainda não tem site.</strong> </>
            ) : (
              <><strong className="text-white">Esta empresa já tem site.</strong> Você também pode preparar uma nova demonstração moderna para apresentar ao cliente. </>
            )}
            Prepare as instruções no sistema, gere o conteúdo no Claude gratuito pelo navegador e salve a resposta aqui. Não precisa de chave de API.
          </p>
          <textarea
            value={orientacoes}
            onChange={(e) => setOrientacoes(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Orientações opcionais para o agente (ex.: destacar corte infantil, tom mais jovem...)"
            className={inputCls}
          />
          <button
            onClick={() => { window.open("https://claude.ai/new", "_blank", "noopener,noreferrer"); mPrepararGratis.mutate(); }}
            disabled={mPrepararGratis.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {mPrepararGratis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {mPrepararGratis.isPending ? "Preparando instruções..." : "Preparar no Claude gratuito"}
          </button>
          {promptClaude && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
              <p className="text-[11.5px] leading-relaxed text-white/65">As instruções foram copiadas. No Claude gratuito, cole o texto, envie e depois copie a resposta JSON completa para o campo abaixo.</p>
              <textarea readOnly value={promptClaude} rows={4} className={inputCls} />
              <label className="block text-[11px] font-semibold text-white/60">Cole aqui a resposta JSON do Claude</label>
              <textarea value={jsonClaude} onChange={(e) => setJsonClaude(e.target.value)} rows={6} maxLength={30000} placeholder='{"slogan":"...","titulo":"...","servicos":[...]}' className={inputCls} />
              <button onClick={() => mSalvarGratis.mutate()} disabled={!jsonClaude.trim() || mSalvarGratis.isPending} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-primary-foreground disabled:opacity-50">
                {mSalvarGratis.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {mSalvarGratis.isPending ? "Validando e salvando..." : "Salvar site no CRM"}
              </button>
            </div>
          )}
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

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              WhatsApp de agendamento
              <input value={ajustes.whatsapp} onChange={(e) => setAjustes({ ...ajustes, whatsapp: e.target.value })} placeholder="(11) 99999-9999" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Instagram
              <input value={ajustes.instagram} onChange={(e) => setAjustes({ ...ajustes, instagram: e.target.value })} placeholder="@empresa" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Horário de atendimento
              <input value={ajustes.horario} onChange={(e) => setAjustes({ ...ajustes, horario: e.target.value })} placeholder="Seg a sáb, 9h às 19h" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
              Endereço do site
              <input value={ajustes.slug} onChange={(e) => setAjustes({ ...ajustes, slug: e.target.value })} placeholder="nome-da-empresa" className={`${inputCls} mt-1`} />
            </label>
          </div>
          <p className="text-[10.5px] leading-relaxed text-white/30">
            Se a empresa não usa WhatsApp no telefone do Google, informe o número certo para os agendamentos.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => mAtualizar.mutate(ajustes)} disabled={mAtualizar.isPending} className={`${btnCls} border-primary/40 text-primary`}>
              {mAtualizar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar ajustes
            </button>
            <select
              value={site.status}
              onChange={(e) => mAtualizar.mutate({ status: e.target.value })}
              disabled={mAtualizar.isPending}
              className="rounded-full border border-white/12 bg-[#0d1729] px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              <option value="demonstracao">Demonstração (com aviso, fora do Google)</option>
              <option value="publicado">Publicado (cliente contratou)</option>
              <option value="desativado">Desativado</option>
            </select>
          </div>

          <PrecoDoSite site={site} salvando={mAtualizar.isPending} onSalvar={(patch) => mAtualizar.mutate(patch)} />

          <details className="rounded-xl border border-white/[0.07] p-3">
            <summary className="cursor-pointer text-[11.5px] font-semibold text-white/55">Atualizar com Claude gratuito</summary>
            <textarea
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="O que mudar? (ex.: incluir delivery, cores mais sóbrias...)"
              className={`${inputCls} mt-2`}
            />
            <button onClick={() => { window.open("https://claude.ai/new", "_blank", "noopener,noreferrer"); mPrepararGratis.mutate(); }} disabled={mPrepararGratis.isPending} className={`${btnCls} mt-2`}>
              {mPrepararGratis.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Preparar atualização no Claude gratuito
            </button>
            {promptClaude && (
              <div className="mt-2 space-y-2">
                <textarea readOnly value={promptClaude} rows={3} className={inputCls} />
                <textarea value={jsonClaude} onChange={(e) => setJsonClaude(e.target.value)} rows={5} maxLength={30000} placeholder="Cole aqui o JSON retornado pelo Claude gratuito" className={inputCls} />
                <button onClick={() => mSalvarGratis.mutate()} disabled={!jsonClaude.trim() || mSalvarGratis.isPending} className={btnCls}>
                  {mSalvarGratis.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Validar e salvar atualização
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[10.5px] text-white/30">O endereço, o WhatsApp e o status continuam os mesmos. Nenhuma chave de API é necessária.</p>
          </details>
        </div>
      )}
    </section>
  );
}

/** Valor do site, comissão e mensalidade de administração (R$ 150/mês: R$ 50 representante, R$ 100 empresa). */
function PrecoDoSite({ site, salvando, onSalvar }) {
  const valorAtual = Number(site.valor_final ?? site.valor_sugerido) || 0;
  const [valor, setValor] = useState(valorAtual);
  useEffect(() => setValor(valorAtual), [valorAtual]);

  if (!valorAtual) return null;
  const d = site.preco_detalhes || {};
  const mensalidade = !!site.mensalidade_contratada;
  const custos = custosDoSite(site);
  const r = resumoFinanceiro(valorAtual, { mensalidade, custos });
  const ano = mensalidade
    ? {
        cliente: r.site.cliente_paga + 12 * r.mensalidade.cliente_paga_por_mes,
        rep: r.site.representante + 12 * r.mensalidade.representante_por_mes,
        empresa: r.site.empresa + 12 * r.mensalidade.empresa_por_mes,
      }
    : null;
  const valido = valor >= PRECO_SITE.minimo && valor <= PRECO_SITE.maximo;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-[11.5px] text-white/60">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Preço do site</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[10.5px] text-white/40">
          Valor final (R$)
          <input
            type="number"
            min={PRECO_SITE.minimo}
            max={PRECO_SITE.maximo}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            className={`${inputCls} mt-1 w-32`}
          />
        </label>
        <button
          onClick={() => onSalvar({ valor_final: valor })}
          disabled={salvando || !valido || valor === valorAtual}
          className={`${btnCls} border-primary/40 text-primary`}
        >
          <Save className="h-3 w-3" /> Salvar valor
        </button>
        <span className="pb-1.5 text-white/35">
          Sugerido {brl(site.valor_sugerido)} · tabela {brl(site.valor_calculado)}
          {d.fonte === "ia" ? ` · ajuste do Claude ${Math.round((d.ajuste_ia || 0) * 100)}%` : ""}
        </span>
      </div>
      {!valido && <p className="mt-1 text-red-300">O valor deve ficar entre {brl(PRECO_SITE.minimo)} e {brl(PRECO_SITE.maximo)}.</p>}
      {d.justificativa && <p className="mt-2 leading-relaxed">{d.justificativa}</p>}
      {d.argumento_cliente && <p className="mt-1 italic text-white/45">Para o representante: “{d.argumento_cliente}”</p>}

      <label className="mt-3 flex items-center gap-2 text-white/70">
        <input type="checkbox" checked={mensalidade} disabled={salvando} onChange={(e) => onSalvar({ mensalidade_contratada: e.target.checked })} />
        Cliente contratou a administração do site ({brl(MENSALIDADE_SITE.valor)}/mês)
      </label>

      <table className="mt-2 w-full text-left">
        <thead className="text-[10px] uppercase tracking-wider text-white/30">
          <tr><th className="py-1 font-semibold"></th><th className="font-semibold">Cliente paga</th><th className="font-semibold">Representante</th><th className="font-semibold">Empresa</th></tr>
        </thead>
        <tbody className="text-white/75">
          <tr><td className="py-0.5">Site (uma vez)</td><td>{brl(r.site.cliente_paga)}</td><td>{brl(r.site.representante)}</td><td>{brl(r.site.empresa)}</td></tr>
          {mensalidade && (
            <>
              <tr><td className="py-0.5">Por mês</td><td>{brl(r.mensalidade.cliente_paga_por_mes)}</td><td>{brl(r.mensalidade.representante_por_mes)}</td><td>{brl(r.mensalidade.empresa_por_mes)}</td></tr>
              <tr className="font-semibold text-white"><td className="py-0.5">1º ano</td><td>{brl(ano.cliente)}</td><td>{brl(ano.rep)}</td><td>{brl(ano.empresa)}</td></tr>
            </>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">
        As comissões só são liberadas após a confirmação do pagamento. A mensalidade gera {brl(MENSALIDADE_SITE.comissao_representante)} ao representante a cada mês pago.
        Domínio ({brl(custos.dominio_anual)}/ano) e hospedagem ({brl(custos.hospedagem_mensal)}/mês) ficam fora do preço e da comissão
        {mensalidade && custos.hospedagem_inclusa ? ` — a hospedagem está dentro da mensalidade, então a parte da empresa fica em ~${brl(r.mensalidade.empresa_liquida_estimada)}/mês` : ""}.
      </p>

      <DominioHospedagem site={site} custos={custos} resumo={r} mensalidade={mensalidade} salvando={salvando} onSalvar={onSalvar} />
      <VendaDoRepresentante site={site} mensalidade={mensalidade} salvando={salvando} onSalvar={onSalvar} />
    </div>
  );
}

/** Domínio próprio e hospedagem de cada site. São custos repassados ao cliente, fora da comissão. */
function DominioHospedagem({ site, custos, resumo, mensalidade, salvando, onSalvar }) {
  const inicial = () => ({
    dominio: custos.dominio,
    dominio_valor_anual: custos.dominio_anual,
    hospedagem_valor_mensal: custos.hospedagem_mensal,
    hospedagem_inclusa: custos.hospedagem_inclusa,
  });
  const [form, setForm] = useState(inicial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(inicial()), [site.id, site.dominio, site.dominio_valor_anual, site.hospedagem_valor_mensal, site.hospedagem_inclusa]);

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
        <Server className="h-3.5 w-3.5" /> Domínio e hospedagem
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-[10.5px] text-white/40 sm:col-span-3">
          Domínio próprio
          <input
            value={form.dominio}
            onChange={(e) => setForm({ ...form, dominio: e.target.value })}
            placeholder="empresa.com.br (deixe vazio se ainda não tiver)"
            className={`${inputCls} mt-1`}
          />
        </label>
        <label className="text-[10.5px] text-white/40">
          Domínio (R$ por ano)
          <input type="number" min={0} step="0.01" value={form.dominio_valor_anual} onChange={(e) => setForm({ ...form, dominio_valor_anual: Number(e.target.value) })} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-[10.5px] text-white/40">
          Hospedagem (R$ por mês)
          <input type="number" min={0} step="0.01" value={form.hospedagem_valor_mensal} onChange={(e) => setForm({ ...form, hospedagem_valor_mensal: Number(e.target.value) })} className={`${inputCls} mt-1`} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-[11px] text-white/60">
          <input type="checkbox" checked={form.hospedagem_inclusa} onChange={(e) => setForm({ ...form, hospedagem_inclusa: e.target.checked })} />
          Hospedagem incluída na mensalidade
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => onSalvar(form)} disabled={salvando} className={`${btnCls} border-primary/40 text-primary`}>
          <Save className="h-3 w-3" /> Salvar domínio e hospedagem
        </button>
        <span className="text-[10.5px] text-white/35">
          Cliente paga à parte: domínio {brl(resumo.custos.cliente_paga_dominio_ano)}/ano
          {resumo.custos.cliente_paga_hospedagem_mes > 0 ? ` + hospedagem ${brl(resumo.custos.cliente_paga_hospedagem_mes)}/mês` : " (hospedagem dentro da mensalidade)"}
        </span>
      </div>
      {form.hospedagem_inclusa && !mensalidade && (
        <p className="mt-1 text-[10.5px] text-amber-300/80">A hospedagem só fica incluída quando o cliente contrata a administração mensal.</p>
      )}
    </div>
  );
}

/** Representante responsável e lançamento das comissões do site. */
function VendaDoRepresentante({ site, mensalidade, salvando, onSalvar }) {
  const listarReps = useServerFn(representantesParaSiteFn);
  const registrar = useServerFn(registrarVendaSiteFn);
  const [reps, setReps] = useState([]);
  const [competencia, setCompetencia] = useState(competenciaAtual());

  useEffect(() => {
    listarReps().then((r) => setReps(r?.representantes || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mVenda = useMutation({
    mutationFn: (tipo) => registrar({ data: { id: site.id, tipo, competencia } }),
    onSuccess: (r) =>
      toast.success(
        r?.duplicada
          ? `Já estava lançado (${r.venda?.numero}). Nada foi duplicado.`
          : `Venda ${r?.venda?.numero || ""} lançada para o representante. Confirme o pagamento para liberar a comissão.`,
      ),
    onError: (e) => toast.error(e?.message || "Não foi possível lançar a venda."),
  });

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">Representante e comissões</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[10.5px] text-white/40">
          Representante do site
          <select
            value={site.representante_id || ""}
            disabled={salvando}
            onChange={(e) => onSalvar({ representante_id: e.target.value })}
            className="mt-1 block rounded-lg border border-white/10 bg-[#0d1729] px-2.5 py-2 text-[12px] text-white"
          >
            <option value="">Sem representante</option>
            {site.representante_id && !reps.some((r) => r.id === site.representante_id) && (
              <option value={site.representante_id}>{site.representante_nome || "Representante atual"}</option>
            )}
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}{r.codigo ? ` · ${r.codigo}` : ""}</option>
            ))}
          </select>
        </label>
        <button onClick={() => mVenda.mutate("site")} disabled={!site.representante_id || mVenda.isPending} className={btnCls}>
          {mVenda.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Lançar venda do site
        </button>
        {mensalidade && (
          <>
            <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className={`${inputCls} w-36`} />
            <button onClick={() => mVenda.mutate("mensalidade_site")} disabled={!site.representante_id || mVenda.isPending} className={btnCls}>
              <Plus className="h-3 w-3" /> Lançar mensalidade do mês
            </button>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/30">
        O site aparece no painel do representante. Ao lançar a venda, a comissão entra como aguardando pagamento e é liberada
        quando você confirmar o pagamento em Representantes › Vendas.
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] normal-case tracking-normal text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none";
const btnCls =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-50";
