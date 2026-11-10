import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Clock, Archive, Play, RotateCcw, Search, ShieldCheck, Save } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { dataHora } from "@/lib/format";
import { PRAZOS_RAPIDOS, validarPrazo, diaBR } from "@/lib/inatividade";
import {
  executarArquivamentoFn, listarArquivadosFn, restaurarClienteFn, resumoInatividadeFn, salvarPrazoInatividadeFn,
} from "@/lib/inatividade-fns";

export const Route = createFileRoute("/_authed/admin/inativos")({
  head: () => ({
    meta: [
      { title: "Controle de tempo dos clientes inativos — Painel" },
      { name: "description", content: "Prazo de inatividade, clientes próximos do prazo e clientes arquivados." },
    ],
  }),
  component: InativosPage,
});

function InativosPage() {
  const resumoFn = useServerFn(resumoInatividadeFn);
  const salvarFn = useServerFn(salvarPrazoInatividadeFn);
  const executarFn = useServerFn(executarArquivamentoFn);
  const listarFn = useServerFn(listarArquivadosFn);
  const restaurarFn = useServerFn(restaurarClienteFn);

  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");
  const [dias, setDias] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [arquivo, setArquivo] = useState({ itens: [], representantes: [] });
  const [busca, setBusca] = useState("");
  const [rep, setRep] = useState("");
  const [carregandoArq, setCarregandoArq] = useState(true);
  const [restaurando, setRestaurando] = useState("");

  async function carregarResumo() {
    try {
      const r = await resumoFn();
      setResumo(r);
      setDias((d) => d || String(r.prazoDias));
    } catch (e) {
      setErro(e?.message || "Não foi possível carregar o controle de inatividade.");
    }
  }
  async function carregarArquivo() {
    setCarregandoArq(true);
    try {
      setArquivo(await listarFn({ data: { busca, representanteId: rep } }));
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar os arquivados.");
    } finally {
      setCarregandoArq(false);
    }
  }
  useEffect(() => {
    carregarResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(carregarArquivo, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, rep]);

  async function salvar() {
    const v = validarPrazo(dias);
    if (!v.ok) return toast.error(v.erro);
    setSalvando(true);
    try {
      await salvarFn({ data: { dias: v.valor } });
      toast.success(`Prazo salvo: ${v.valor} dias.`);
      await carregarResumo();
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar o prazo.");
    } finally {
      setSalvando(false);
    }
  }
  async function executar() {
    setExecutando(true);
    try {
      const r = await executarFn();
      toast.success(r.arquivados ? `${r.arquivados} cliente(s) arquivado(s).` : "Nenhum cliente atingiu o prazo.");
      await Promise.all([carregarResumo(), carregarArquivo()]);
    } catch (e) {
      toast.error(e?.message || "Não foi possível executar agora.");
    } finally {
      setExecutando(false);
    }
  }
  async function restaurar(id) {
    setRestaurando(id);
    try {
      const r = await restaurarFn({ data: { leadId: id } });
      toast.success(r.restaurado ? "Cliente restaurado e de volta ao CRM." : "Este cliente já estava ativo.");
      await Promise.all([carregarResumo(), carregarArquivo()]);
    } catch (e) {
      toast.error(e?.message || "Não foi possível restaurar.");
    } finally {
      setRestaurando("");
    }
  }

  const salvo = resumo?.prazoDias;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">CRM</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Controle de tempo dos clientes inativos</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/45">
          Clientes do CRM sem atividade pelo prazo escolhido são arquivados automaticamente — nunca excluídos.
          Negociação em andamento, tarefa pendente ou retorno agendado impedem o arquivamento.
        </p>
      </header>

      {erro && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</p>}

      {!resumo ? (
        <div className="flex items-center gap-2 py-8 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Clock} label="Próximos do prazo" value={resumo.proximosDoPrazo} accent="#f97316" />
            <StatCard icon={Archive} label="Arquivados" value={resumo.arquivados} hint={`${resumo.arquivadosUltimos30} nos últimos 30 dias`} accent="#64748b" />
            <StatCard icon={ShieldCheck} label="Protegidos" value={resumo.contagem.protegido} hint="Negociação, tarefa ou retorno" accent="#22c55e" />
            <StatCard icon={Clock} label="Sem data de atividade" value={resumo.contagem.sem_data} hint="Não são arquivados" accent="#4285F4" />
          </div>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Prazo de inatividade</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {PRAZOS_RAPIDOS.map((n) => (
                <button
                  key={n}
                  onClick={() => setDias(String(n))}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${String(n) === dias ? "border-primary/50 bg-primary/15 text-primary" : "border-white/12 text-white/65 hover:text-white"}`}
                >
                  {n} dias
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-[12px] text-white/50">
                Outro:
                <input
                  type="number" min={1} max={365} step={1} value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  aria-label="Prazo em dias"
                  className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12.5px] text-white"
                />
                dias
              </label>
              <button
                onClick={salvar}
                disabled={salvando || String(salvo) === dias}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-bold text-[#0a1128] disabled:opacity-50"
              >
                {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar prazo
              </button>
            </div>
            <p className="mt-2 text-[11.5px] text-white/40">
              Prazo atual: <b className="text-white/70">{salvo} dias</b> (fuso de Brasília). Última execução:{" "}
              {resumo.ultimaExecucao?.em ? `${dataHora(resumo.ultimaExecucao.em)} · ${resumo.ultimaExecucao.arquivados ?? 0} arquivado(s)` : "ainda não executado"}.
            </p>
            <button
              onClick={executar}
              disabled={executando}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:text-white disabled:opacity-50"
            >
              {executando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Verificar e arquivar agora
            </button>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Próximos do prazo</p>
            {resumo.proximos.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-white/35">Nenhum cliente perto do prazo.</p>
            ) : (
              <div className="mt-2 divide-y divide-white/[0.06]">
                {resumo.proximos.map((c) => (
                  <Link key={c.id} to="/admin/lead/$leadId" params={{ leadId: c.id }} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-white/[0.03]">
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold text-white">{c.empresa}</span>
                      <span className="block text-[11px] text-white/40">
                        {c.representante_nome || "Equipe"} · última atividade {diaBR(c.ultima_atividade_dia)} ({c.ultima_atividade_fonte})
                      </span>
                    </span>
                    <span className="text-[11.5px] font-semibold text-amber-300">
                      {c.dias_restantes <= 0 ? "Será arquivado na próxima verificação" : `${c.dias_restantes} dia(s) restante(s)`}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section id="arquivados" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
          <Archive className="h-4 w-4 text-primary" /> Clientes arquivados
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5">
            <Search className="h-3.5 w-3.5 text-white/35" />
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por empresa, cidade, telefone, representante ou motivo"
              className="w-full bg-transparent py-2 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none"
            />
          </label>
          <select
            value={rep} onChange={(e) => setRep(e.target.value)} aria-label="Filtrar por representante"
            className="rounded-lg border border-white/10 bg-[#0d1729] px-2.5 py-2 text-[12px] text-white"
          >
            <option value="">Todos os responsáveis</option>
            <option value="__equipe__">Equipe (sem representante)</option>
            {arquivo.representantes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        {carregandoArq ? (
          <div className="flex items-center gap-2 py-6 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : arquivo.itens.length === 0 ? (
          <p className="py-6 text-[12.5px] text-white/35">Nenhum cliente arquivado{busca || rep ? " com esse filtro" : ""}.</p>
        ) : (
          <div className="mt-3 divide-y divide-white/[0.06]">
            {arquivo.itens.map((c) => (
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link to="/admin/lead/$leadId" params={{ leadId: c.id }} className="text-[13px] font-semibold text-white hover:text-primary">{c.empresa}</Link>
                  <p className="text-[11px] text-white/40">
                    {c.cidade || "—"} · Responsável: {c.representante_nome || "Equipe"} · Arquivado em {dataHora(c.arquivado_em)}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">{c.arquivado_motivo}</p>
                </div>
                <button
                  onClick={() => restaurar(c.id)}
                  disabled={restaurando === c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11.5px] font-bold text-emerald-300 disabled:opacity-50"
                >
                  {restaurando === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
