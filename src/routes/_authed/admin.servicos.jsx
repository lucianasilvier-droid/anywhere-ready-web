import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Loader2, Briefcase, Pencil, CalendarClock, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import StatusPill from "@/components/admin/StatusPill";
import EmptyState from "@/components/admin/EmptyState";
import { brl, dataCurta, diasAte, STATUS_SERVICO } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/servicos")({
  head: () => ({ meta: [{ title: "Serviços e assinaturas — Painel" }] }),
  component: ServicosPage,
});

const VAZIO = {
  cliente_id: "", cliente_nome: "", cliente_email: "", empresa: "", tipo: "perfil_google",
  plano: "essencial", valor_mensal: 0, status: "solicitado", etapa_atual: "Briefing",
  progresso: 0, perfil_url: "", inicio: "", vencimento: "", observacoes: "",
};

function ServicosPage() {
  const { items, loading, reload } = useEntityList("ServicoCliente", {}, { limit: 300 });
  const { items: clientes } = useEntityList("Cliente", {}, { limit: 300 });
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [updateModal, setUpdateModal] = useState(null);
  const [upd, setUpd] = useState({ tipo: "mensagem", titulo: "", descricao: "", visivel_cliente: true });
  const [relModal, setRelModal] = useState(null);
  const [rel, setRel] = useState({ periodo: "", resumo: "", visualizacoes: 0, ligacoes: 0, rotas: 0, avaliacoes_novas: 0, nota_media: 0, acoes_realizadas: "" });

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setModal(true);
  }

  function abrirEdicao(s) {
    setEditando(s);
    setForm({ ...VAZIO, ...s });
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.cliente_nome.trim()) return toast.error("Selecione ou informe o cliente.");
    setSalvando(true);
    try {
      const dados = { ...form, valor_mensal: Number(form.valor_mensal) || 0, progresso: Number(form.progresso) || 0 };
      if (!dados.cliente_email && dados.cliente_id) {
        const c = clientes.find((x) => x.id === dados.cliente_id);
        dados.cliente_email = c?.user_email || c?.email || "";
      }
      delete dados.id;
      delete dados.created_date;
      delete dados.updated_date;
      delete dados.created_by_id;
      if (editando) await base44.entities.ServicoCliente.update(editando.id, dados);
      else await base44.entities.ServicoCliente.create(dados);
      toast.success("Serviço salvo.");
      setModal(false);
      await reload();
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar o serviço.");
    } finally {
      setSalvando(false);
    }
  }

  async function registrarAtualizacao(e) {
    e.preventDefault();
    if (!upd.titulo.trim()) return toast.error("Informe um título.");
    try {
      await base44.entities.ServicoAtualizacao.create({
        ...upd,
        servico_id: updateModal.id,
        cliente_email: updateModal.cliente_email || "",
      });
      toast.success("Atualização registrada no histórico do serviço.");
      setUpdateModal(null);
      setUpd({ tipo: "mensagem", titulo: "", descricao: "", visivel_cliente: true });
    } catch (err) {
      toast.error(err?.message || "Não foi possível registrar.");
    }
  }

  async function lancarRelatorio(e) {
    e.preventDefault();
    if (!rel.periodo.trim()) return toast.error("Informe o período (ex.: outubro/2026).");
    try {
      await base44.entities.Relatorio.create({
        ...rel,
        servico_id: relModal.id,
        cliente_email: relModal.cliente_email || "",
        empresa: relModal.empresa || relModal.cliente_nome,
        visualizacoes: Number(rel.visualizacoes) || 0,
        ligacoes: Number(rel.ligacoes) || 0,
        rotas: Number(rel.rotas) || 0,
        avaliacoes_novas: Number(rel.avaliacoes_novas) || 0,
        nota_media: Number(rel.nota_media) || 0,
      });
      toast.success("Relatório publicado para o cliente.");
      setRelModal(null);
      setRel({ periodo: "", resumo: "", visualizacoes: 0, ligacoes: 0, rotas: 0, avaliacoes_novas: 0, nota_media: 0, acoes_realizadas: "" });
    } catch (err) {
      toast.error(err?.message || "Não foi possível publicar o relatório.");
    }
  }

  const filtrados = items.filter((s) => {
    if (filtro === "vencidos") {
      const d = diasAte(s.vencimento);
      return d !== null && d < 0 && s.status !== "cancelado" && s.status !== "concluido";
    }
    if (filtro === "ativos") return s.status === "em_andamento" || s.status === "aguardando_cliente";
    return true;
  });

  const mrr = items.filter((s) => s.status !== "cancelado").reduce((t, s) => t + (Number(s.valor_mensal) || 0), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Operação</p>
          <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Serviços e assinaturas</h1>
          <p className="mt-1 text-[13px] text-white/45">
            Criação de perfil, gestão mensal, planos, vencimentos e histórico de cada cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/35">Recorrência</p>
            <p className="font-heading text-sm font-bold text-primary">{brl(mrr)}</p>
          </div>
          <button onClick={abrirNovo} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-bold text-[#0a1128]">
            <Plus className="h-3.5 w-3.5" /> Novo serviço
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "todos", label: "Todos" },
          { key: "ativos", label: "Planos ativos" },
          { key: "vencidos", label: "Vencidos" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
              filtro === f.key ? "bg-primary text-[#0a1128]" : "border border-white/10 text-white/55"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando serviços...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhum serviço encontrado" description="Cadastre um serviço para acompanhar etapas, vencimentos e histórico do cliente." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtrados.map((s) => {
            const vencido = (diasAte(s.vencimento) ?? 0) < 0;
            return (
              <article key={s.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-bold text-white">{s.cliente_nome}</p>
                    <p className="truncate text-[11.5px] text-white/40">
                      {s.tipo === "gestao_perfil" ? "Gestão de perfil" : "Criação de perfil"} · {s.plano || "sem plano"}
                    </p>
                  </div>
                  <StatusPill map={STATUS_SERVICO} value={s.status} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[10.5px]">
                  <div>
                    <p className="text-white/30">Mensalidade</p>
                    <p className="font-semibold text-white">{brl(s.valor_mensal)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Vencimento</p>
                    <p className={`font-semibold ${vencido ? "text-red-300" : "text-white"}`}>{dataCurta(s.vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Progresso</p>
                    <p className="font-semibold text-white">{s.progresso || 0}%</p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b]" style={{ width: `${Math.min(Number(s.progresso) || 0, 100)}%` }} />
                </div>
                {s.etapa_atual && <p className="mt-1.5 text-[11px] text-white/35">Etapa atual: {s.etapa_atual}</p>}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => abrirEdicao(s)} className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button onClick={() => setUpdateModal(s)} className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                    <CalendarClock className="h-3 w-3" /> Atualização
                  </button>
                  <button onClick={() => setRelModal(s)} className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white/65">
                    <FileText className="h-3 w-3" /> Relatório
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={modal} onOpenChange={setModal} title={editando ? "Editar serviço" : "Novo serviço"} wide>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <AdminField
            label="Cliente *"
            value={form.cliente_id}
            onChange={(e) => {
              const c = clientes.find((x) => x.id === e.target.value);
              setForm((f) => ({
                ...f,
                cliente_id: e.target.value,
                cliente_nome: c?.nome || f.cliente_nome,
                empresa: c?.empresa || f.empresa,
                cliente_email: c?.user_email || c?.email || "",
              }));
            }}
            options={[{ value: "", label: "Selecione..." }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
          />
          <AdminField label="Nome do cliente (se não estiver na lista)" value={form.cliente_nome} onChange={set("cliente_nome")} />
          <AdminField label="E-mail do cliente" value={form.cliente_email} onChange={set("cliente_email")} hint="Permite que o cliente veja o serviço na área dele." />
          <AdminField label="Empresa" value={form.empresa} onChange={set("empresa")} />
          <AdminField label="Tipo" value={form.tipo} onChange={set("tipo")} options={[{ value: "perfil_google", label: "Criação de perfil" }, { value: "gestao_perfil", label: "Gestão de perfil" }]} />
          <AdminField label="Plano" value={form.plano} onChange={set("plano")} options={[{ value: "essencial", label: "Essencial" }, { value: "profissional", label: "Profissional" }, { value: "premium", label: "Premium" }]} />
          <AdminField label="Mensalidade (R$)" type="number" step="0.01" value={form.valor_mensal} onChange={set("valor_mensal")} />
          <AdminField label="Status" value={form.status} onChange={set("status")} options={Object.entries(STATUS_SERVICO).map(([v, c]) => ({ value: v, label: c.label }))} />
          <AdminField label="Etapa atual" value={form.etapa_atual} onChange={set("etapa_atual")} />
          <AdminField label="Progresso (%)" type="number" value={form.progresso} onChange={set("progresso")} />
          <AdminField label="Início" type="date" value={form.inicio} onChange={set("inicio")} />
          <AdminField label="Vencimento" type="date" value={form.vencimento} onChange={set("vencimento")} />
          <AdminField label="Link do perfil no Google" value={form.perfil_url} onChange={set("perfil_url")} className="sm:col-span-2" />
          <AdminField label="Observações internas" value={form.observacoes} onChange={set("observacoes")} textarea className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">Cancelar</button>
            <button type="submit" disabled={salvando} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60">
              {salvando && <Loader2 className="h-3 w-3 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!updateModal} onOpenChange={() => setUpdateModal(null)} title="Registrar atualização / tarefa">
        <form onSubmit={registrarAtualizacao} className="grid gap-3">
          <AdminField label="Tipo" value={upd.tipo} onChange={(e) => setUpd({ ...upd, tipo: e.target.value })} options={[
            { value: "mensagem", label: "Mensagem ao cliente" },
            { value: "etapa", label: "Mudança de etapa" },
            { value: "documento", label: "Documento" },
            { value: "tarefa", label: "Tarefa interna" },
            { value: "solicitacao", label: "Solicitação do cliente" },
          ]} />
          <AdminField label="Título *" value={upd.titulo} onChange={(e) => setUpd({ ...upd, titulo: e.target.value })} />
          <AdminField label="Descrição" textarea value={upd.descricao} onChange={(e) => setUpd({ ...upd, descricao: e.target.value })} />
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            <input type="checkbox" checked={upd.visivel_cliente} onChange={(e) => setUpd({ ...upd, visivel_cliente: e.target.checked })} />
            Visível para o cliente
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setUpdateModal(null)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">Cancelar</button>
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">Registrar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!relModal} onOpenChange={() => setRelModal(null)} title="Publicar relatório de acompanhamento">
        <form onSubmit={lancarRelatorio} className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Período *" value={rel.periodo} onChange={(e) => setRel({ ...rel, periodo: e.target.value })} placeholder="Ex.: Outubro/2026" className="sm:col-span-2" />
          <AdminField label="Visualizações" type="number" value={rel.visualizacoes} onChange={(e) => setRel({ ...rel, visualizacoes: e.target.value })} />
          <AdminField label="Ligações" type="number" value={rel.ligacoes} onChange={(e) => setRel({ ...rel, ligacoes: e.target.value })} />
          <AdminField label="Rotas" type="number" value={rel.rotas} onChange={(e) => setRel({ ...rel, rotas: e.target.value })} />
          <AdminField label="Novas avaliações" type="number" value={rel.avaliacoes_novas} onChange={(e) => setRel({ ...rel, avaliacoes_novas: e.target.value })} />
          <AdminField label="Nota média" type="number" step="0.1" value={rel.nota_media} onChange={(e) => setRel({ ...rel, nota_media: e.target.value })} />
          <AdminField label="Resumo" textarea value={rel.resumo} onChange={(e) => setRel({ ...rel, resumo: e.target.value })} className="sm:col-span-2" />
          <AdminField label="Ações realizadas" textarea value={rel.acoes_realizadas} onChange={(e) => setRel({ ...rel, acoes_realizadas: e.target.value })} className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setRelModal(null)} className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-white/60">Cancelar</button>
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">Publicar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}