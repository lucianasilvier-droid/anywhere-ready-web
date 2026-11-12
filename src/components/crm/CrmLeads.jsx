import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Loader2, Plus, MapPin, Phone, Mail, Star, Check, Target, X, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { searchPlacesFn } from "@/lib/admin-fns";
import { meuLimiteCrmFn } from "@/lib/representantes-fns";
import { FUNIL_STAGES } from "@/lib/site-content";
import StatusPill from "@/components/admin/StatusPill";
import EmptyState from "@/components/admin/EmptyState";
import { STATUS_CONSENT } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";
import RepresentanteDoLead from "@/components/crm/RepresentanteDoLead";

const digitsOnly = (value) => String(value || "").replace(/[^0-9]/g, "");
const telefoneValido = (value) => {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11 ||
    (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));
};
const emailValido = (value) => {
  const email = String(value || "").trim().toLowerCase();
  const domain = email.split("@")[1] || "";
  return email.length <= 254 &&
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) &&
    !/(^|\.)(example|invalid|localhost|test)$/i.test(domain) &&
    !/^(no[-_.]?reply|noreply|do[-_.]?not[-_.]?reply)@/i.test(email);
};
const temContatoValido = (place) => telefoneValido(place?.telefone) || telefoneValido(place?.whatsapp) || emailValido(place?.email || place?.email_contato || place?.email_publico);

/**
 * CRM · prospecção e lista de leads. Usado no painel do administrador (base "/admin")
 * e no painel do representante (base "/representante"), onde só aparecem os clientes
 * do próprio representante e vale o limite diário de novos clientes.
 */
export default function CrmLeads({ base = "/admin" }) {
  const representante = base === "/representante";
  const carregarLimite = useServerFn(meuLimiteCrmFn);
  const [limite, setLimite] = useState(null);
  const atualizarLimite = () => {
    if (!representante) return;
    carregarLimite()
      .then((r) => setLimite(r?.liberado ? r : null))
      .catch(() => {});
  };
  useEffect(() => {
    atualizarLimite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [representante]);
  const esgotado = representante && limite && limite.restantes <= 0;

  const { user } = useAuth();
  const buscar = useServerFn(searchPlacesFn);
  // CRM e funil leem a mesma base. Busca paginada evita o corte antigo de 300
  // registros e a atualização silenciosa mantém as telas sincronizadas entre usuários.
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroLeads, setErroLeads] = useState("");
  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const todos = [];
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const page = await base44.entities.Lead.filter(
          { arquivado: { $ne: true } },
          { sort: "created_date", limit: pageSize, skip },
        );
        const registros = Array.isArray(page) ? page : page?.items || [];
        todos.push(...registros);
        if (registros.length < pageSize) break;
        skip += registros.length;
      }
      setLeads(todos);
      setErroLeads("");
    } catch (e) {
      setErroLeads(e?.message || "Não foi possível sincronizar os leads com o funil.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    let buscando = false;
    async function sincronizar(silent = true) {
      if (!ativo || buscando || document.visibilityState !== "visible") return;
      buscando = true;
      try {
        await reload({ silent });
      } finally {
        buscando = false;
      }
    }
    sincronizar(false);
    const intervalo = window.setInterval(() => sincronizar(true), 5000);
    const aoFocar = () => sincronizar(true);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") sincronizar(true);
    };
    window.addEventListener("focus", aoFocar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", aoFocar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [reload]);
  const [termo, setTermo] = useState("");
  const [local, setLocal] = useState("");
  const segmentosRepresentante = [
    "Barbearia",
    "Cabeleireiro",
    "Salão de Beleza",
    "Clínica de Estética",
    "Restaurantes",
    "Bares",
    "Imobiliária",
    "Mecânicas",
  ];
  const [resultados, setResultados] = useState([]);
  const [erroBusca, setErroBusca] = useState("");
  const [salvando, setSalvando] = useState("");
  const [salvandoTodos, setSalvandoTodos] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [filtroRep, setFiltroRep] = useState("");
  const [buscaLocal, setBuscaLocal] = useState("");
  const [manual, setManual] = useState(false);
  const [novo, setNovo] = useState({ empresa: "", telefone: "", email: "", cidade: "", categoria: "" });

  const existentes = useMemo(
    () => new Set(leads.map((l) => l.place_id).filter(Boolean)),
    [leads],
  );
  const jaRegistrados = (place) => Boolean(place?.ja_cadastrado || existentes.has(place?.place_id));

  const mutation = useMutation({
    mutationFn: (textQuery) => buscar({ data: { textQuery, max: 20 } }),
    onSuccess: (r) => {
      setResultados(r?.places || []);
      setErroBusca(r?.ok ? r?.aviso || "" : r?.error || "Não foi possível pesquisar agora.");
    },
    onError: (e) => {
      setResultados([]);
      setErroBusca(e?.message || "Não foi possível pesquisar agora.");
    },
  });

  function pesquisar(e) {
    e.preventDefault();
    setErroBusca("");
    if (termo.trim().length < 3) return setErroBusca("Digite ao menos 3 letras (ex.: restaurante).");
    const query = representante
      ? `${termo.trim()} em São Paulo, SP, Brasil`
      : local.trim() ? `${termo.trim()} em ${local.trim()}` : termo.trim();
    mutation.mutate(query);
  }

  async function salvarLead(place) {
    if (!temContatoValido(place)) return toast.error("Empresa sem WhatsApp/telefone válido ou e-mail válido. Ela não pode ser salva no CRM.");
    setSalvando(place.place_id);
    try {
      await base44.entities.Lead.create({
        ...place,
        origem: place.fonte === "openstreetmap" ? "openstreetmap" : "google_places",
        etapa: "novo_lead",
        responsavel: user?.full_name || user?.email || "",
        responsavel_email: user?.email || "",
        consentimento: "nao_solicitado",
      });
      toast.success(`${place.empresa} salvo no CRM.`);
      await reload();
      atualizarLimite();
    } catch (e) {
      if (e?.status === 409) {
        toast.info("Esta empresa já está cadastrada no CRM. Atualize a busca para ver o status.");
        await reload({ silent: true });
      } else {
        toast.error(e?.message || "Não foi possível salvar o lead.");
      }
      atualizarLimite();
    } finally {
      setSalvando("");
    }
  }

  async function salvarTodosResultados() {
    const pendentes = resultados.filter((place) => place.place_id && !jaRegistrados(place) && temContatoValido(place));
    if (!pendentes.length) return toast.info("Não há novos resultados com contato válido para adicionar.");
    const permitidos = representante && limite
      ? pendentes.slice(0, Math.max(0, limite.restantes))
      : pendentes;
    if (!permitidos.length) return toast.error("Você já atingiu o limite diário de clientes.");
    setSalvandoTodos(true);
    let adicionados = 0;
    let duplicados = 0;
    let falhas = 0;
    try {
      for (const place of permitidos) {
        try {
          await base44.entities.Lead.create({
            ...place,
            origem: place.fonte === "openstreetmap" ? "openstreetmap" : "google_places",
            etapa: "novo_lead",
            responsavel: user?.full_name || user?.email || "",
            responsavel_email: user?.email || "",
            consentimento: "nao_solicitado",
          });
          adicionados += 1;
        } catch (error) {
          if (error?.status === 409) duplicados += 1;
          else falhas += 1;
          if (error?.status === 429 || /limite diário/i.test(error?.message || "")) break;
        }
      }
      await reload();
      atualizarLimite();
      if (adicionados) toast.success(`${adicionados} cliente(s) adicionado(s) ao CRM.`);
      if (duplicados) toast.info(`${duplicados} empresa(s) já estavam cadastradas e foram ignoradas.`);
      if (falhas) toast.error(`${falhas} resultado(s) não puderam ser adicionados.`);
    } finally {
      setSalvandoTodos(false);
    }
  }

  async function criarManual(e) {
    e.preventDefault();
    if (novo.empresa.trim().length < 2) return toast.error("Informe o nome da empresa.");
    if (!temContatoValido(novo)) return toast.error("Informe um WhatsApp/telefone válido ou um e-mail válido. Sem um desses contatos, o lead não pode ser criado.");
    try {
      await base44.entities.Lead.create({
        ...novo,
        origem: "manual",
        etapa: "novo_lead",
        responsavel: user?.full_name || "",
        responsavel_email: user?.email || "",
        consentimento: "nao_solicitado",
      });
      toast.success("Lead criado.");
      setNovo({ empresa: "", telefone: "", email: "", cidade: "", categoria: "" });
      setManual(false);
      await reload();
      atualizarLimite();
    } catch (err) {
      toast.error(err?.message || "Não foi possível criar o lead.");
      atualizarLimite();
    }
  }

  // Representantes que têm clientes no CRM, para o filtro do administrador.
  const repsDosLeads = useMemo(() => {
    const mapa = new Map();
    for (const l of leads) {
      if (!l.representante_id) continue;
      const atual = mapa.get(l.representante_id) || { id: l.representante_id, nome: l.representante_nome || "Representante", total: 0 };
      atual.total += 1;
      mapa.set(l.representante_id, atual);
    }
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [leads]);

  const filtrados = leads.filter((l) => {
    if (filtro && l.etapa !== filtro) return false;
    if (filtroRep === "_equipe" && l.representante_id) return false;
    if (filtroRep && filtroRep !== "_equipe" && l.representante_id !== filtroRep) return false;
    if (buscaLocal) {
      const q = buscaLocal.toLowerCase();
      return `${l.empresa} ${l.cidade} ${l.bairro} ${l.categoria}`.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">CRM</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Prospecção de empresas</h1>
          <p className="mt-1 text-[13px] text-white/45">
            {representante
              ? "Pesquise empresas reais no Google, adicione os seus clientes ao CRM e acompanhe cada um no funil."
              : "Pesquise empresas reais no Google Places, salve como lead e evite duplicidades."}
          </p>
        </div>
        <button
          disabled={esgotado}
          onClick={() => setManual((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-[12.5px] font-semibold text-white/75 hover:border-primary/40 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> {representante ? "Cliente manual" : "Lead manual"}
        </button>
      </header>

      {erroLeads && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Falha na sincronização do CRM: {erroLeads}
        </p>
      )}

      {representante && limite && (
        <div
          className={`flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-[12.5px] ${
            esgotado ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-primary/25 bg-primary/[0.06] text-white/75"
          }`}
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Hoje você adicionou <strong className="text-white">{limite.usados}</strong> de{" "}
            <strong className="text-white">{limite.limite}</strong> clientes permitidos por dia.
            {esgotado
              ? " O limite de hoje acabou: amanhã você pode adicionar mais."
              : ` Ainda pode adicionar ${limite.restantes}.`}
          </span>
        </div>
      )}

      {manual && !esgotado && (
        <form onSubmit={criarManual} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:grid-cols-5">
          <input value={novo.empresa} onChange={(e) => setNovo({ ...novo, empresa: e.target.value })} placeholder="Empresa *" className={inputCls} />
          <input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} placeholder="WhatsApp/telefone válido" className={inputCls} />
          <input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} placeholder="E-mail válido (alternativa)" className={inputCls} />
          <input value={novo.cidade} onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} placeholder="Cidade" className={inputCls} />
          <input value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })} placeholder="Categoria" className={inputCls} />
          <p className="text-[10.5px] leading-relaxed text-white/45 sm:col-span-4">Obrigatório informar pelo menos um contato válido: WhatsApp/telefone ou e-mail. Sem contato, a empresa não entra no CRM.</p>
          <button type="submit" disabled={!temContatoValido(novo)} className="rounded-lg bg-primary px-3 py-2 text-[12.5px] font-bold text-[#0a1128] disabled:opacity-50">
            Salvar
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        {representante && (
          <div className="mb-3 rounded-xl border border-primary/25 bg-primary/[0.07] p-3.5">
            <p className="text-[12.5px] font-bold text-primary">Atenção, representante comercial!</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/75">
              Faça a busca de <strong className="text-white">um único segmento por vez</strong>, seguindo a sequência abaixo.
              Não misture segmentos na mesma pesquisa. Nesta fase inicial de testes, todas as buscas devem ser feitas somente em
              <strong className="text-white"> São Paulo – SP</strong>.
            </p>
            <ol className="mt-2 grid gap-x-4 gap-y-1 text-[11.5px] text-white/60 sm:grid-cols-2">
              {segmentosRepresentante.map((segmento, index) => (
                <li key={segmento}>{index + 1}. {segmento}</li>
              ))}
            </ol>
          </div>
        )}
        <form onSubmit={pesquisar} className="grid gap-2.5 sm:grid-cols-[1.2fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            {representante ? (
              <select
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                className={`${inputCls} pl-9`}
                required
              >
                <option value="">Selecione um segmento por vez</option>
                {segmentosRepresentante.map((segmento) => (
                  <option key={segmento} value={segmento}>{segmento}</option>
                ))}
              </select>
            ) : (
              <input
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex.: restaurante, barbearia, clínica..."
                className={`${inputCls} pl-9`}
              />
            )}
          </div>
          {representante ? (
            <input value="São Paulo – SP" readOnly aria-label="Local fixo da busca" className={inputCls} />
          ) : (
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Cidade, bairro ou região"
              className={inputCls}
            />
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-2 text-[12.5px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Buscar empresas
          </button>
        </form>
        <p className="mt-2 text-[11px] leading-relaxed text-white/30">
          A busca usa a Google Places API com os limites e termos de uso do Google. Resultados são
          empresas reais retornadas pela fonte.
        </p>

        {erroBusca && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
            {erroBusca}
          </p>
        )}

        {resultados.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-white/40">{resultados.length} resultado(s) encontrados · até 20 por busca</p>
              <button
                type="button"
                disabled={salvandoTodos || esgotado || resultados.every(jaRegistrados)}
                onClick={salvarTodosResultados}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-bold text-[#0a1128] disabled:opacity-50"
              >
                {salvandoTodos ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {salvandoTodos ? "Adicionando..." : "Adicionar todos os novos ao CRM"}
              </button>
            </div>
            {resultados.map((place) => {
              const jaSalvo = jaRegistrados(place);
              return (
                <div
                  key={place.place_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">{place.empresa}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{place.endereco || "sem endereço"}</span>
                      {place.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{place.telefone}</span>}
                      {(place.email || place.email_contato || place.email_publico) && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{place.email || place.email_contato || place.email_publico}</span>}
                      {place.nota_google != null && (
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-[#FBBC05] text-[#FBBC05]" />{place.nota_google} ({place.total_avaliacoes || 0})</span>
                      )}
                      {place.categoria && <span>· {place.categoria}</span>}
                      {!place.site && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">Sem site · oferecer site</span>}
                      <a href={urlGoogleMaps(place)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#8ab4f8] hover:underline"><MapPin className="h-3 w-3" /> Abrir Google Maps</a>
                    </p>
                  </div>
                  <button
                    disabled={jaSalvo || esgotado || salvando === place.place_id}
                    onClick={() => salvarLead(place)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold ${
                      jaSalvo
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "bg-primary text-[#0a1128] disabled:opacity-60"
                    }`}
                  >
                    {salvando === place.place_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : jaSalvo ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {jaSalvo ? "Já no CRM" : representante ? "Adicionar ao CRM" : "Salvar lead"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-heading text-sm font-bold text-white">
            Leads salvos <span className="text-white/30">({filtrados.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={buscaLocal}
              onChange={(e) => setBuscaLocal(e.target.value)}
              placeholder="Filtrar por nome/cidade"
              className="w-48 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-2 text-[12px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
            />
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-lg border border-white/10 bg-[#0d1729] px-2 py-1.5 text-[12px] text-white">
            <option value="">Todas as etapas</option>
            {FUNIL_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          {!representante && (
            <select value={filtroRep} onChange={(e) => setFiltroRep(e.target.value)} className="rounded-lg border border-white/10 bg-[#0d1729] px-2 py-1.5 text-[12px] text-white">
              <option value="">Todos os representantes</option>
              <option value="_equipe">Só da equipe (sem representante)</option>
              {repsDosLeads.map((r) => (
                <option key={r.id} value={r.id}>{r.nome} ({r.total})</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando leads...
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhum lead encontrado"
            description="Pesquise empresas reais acima e salve as que fazem sentido para os seus serviços."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-2.5">Empresa</th>
                  {!representante && <th className="px-4 py-2.5">Representante</th>}
                  <th className="px-4 py-2.5">Local</th>
                  <th className="px-4 py-2.5">Contato</th>
                  <th className="px-4 py-2.5">Etapa</th>
                  <th className="px-4 py-2.5">Autorização</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtrados.map((lead) => {
                  const etapa = FUNIL_STAGES.find((s) => s.key === lead.etapa);
                  return (
                    <tr key={lead.id} className="text-[12.5px] hover:bg-white/[0.02]">
                      <td className="max-w-[220px] px-4 py-2.5">
                        <Link
                          to={`${base}/lead/$leadId`}
                          params={{ leadId: lead.id }}
                          className="block truncate font-semibold text-white hover:text-primary hover:underline"
                        >
                          {lead.empresa}
                        </Link>
                        <a href={urlGoogleMaps(lead)} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#8ab4f8] hover:underline"><MapPin className="h-3 w-3" /> Abrir Google Maps</a>
                        <p className="truncate text-[11px] text-white/35">
                          {lead.categoria || "—"}
                          {!lead.site && (
                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${lead.site_demo_slug ? "bg-emerald-500/15 text-emerald-300" : "bg-primary/15 text-primary"}`}>
                              {lead.site_demo_slug ? "Site demo criado" : "Sem site"}
                            </span>
                          )}
                        </p>
                      </td>
                      {!representante && (
                        <td className="max-w-[180px] px-4 py-2.5">
                          <RepresentanteDoLead lead={lead} />
                        </td>
                      )}
                      <td className="max-w-[180px] px-4 py-2.5 text-white/55">
                        <p className="truncate">{lead.cidade || "—"}{lead.bairro ? ` · ${lead.bairro}` : ""}</p>
                      </td>
                      <td className="px-4 py-2.5 text-white/55">{lead.telefone || "—"}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
                          style={{ borderColor: `${etapa?.color || "#64748b"}55`, backgroundColor: `${etapa?.color || "#64748b"}1a`, color: etapa?.color || "#94a3b8" }}
                        >
                          {etapa?.label || lead.etapa}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><StatusPill map={STATUS_CONSENT} value={lead.consentimento} /></td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          to={`${base}/lead/$leadId`}
                          params={{ leadId: lead.id }}
                          className="text-[11.5px] font-semibold text-primary hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtroRep && (
          <button onClick={() => setFiltroRep("")} className="mr-3 inline-flex items-center gap-1 text-[11.5px] text-white/40 hover:text-white">
            <X className="h-3 w-3" /> Limpar filtro de representante
          </button>
        )}
        {filtro && (
          <button onClick={() => setFiltro("")} className="inline-flex items-center gap-1 text-[11.5px] text-white/40 hover:text-white">
            <X className="h-3 w-3" /> Limpar filtro de etapa
          </button>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none";

function urlGoogleMaps(place) {
  const nome = place?.empresa || place?.name || "";
  const endereco = place?.endereco || [place?.bairro, place?.cidade, place?.estado].filter(Boolean).join(", ");
  const rawPlaceId = String(place?.place_id || "");
  const placeId = rawPlaceId.startsWith("osm:") ? "" : rawPlaceId.replace(/^places\//, "");
  const query = encodeURIComponent([nome, endereco].filter(Boolean).join(" "));
  return placeId ? "https://www.google.com/maps/search/?api=1&query=" + query + "&query_place_id=" + encodeURIComponent(placeId) : "https://www.google.com/maps/search/?api=1&query=" + query;
}
