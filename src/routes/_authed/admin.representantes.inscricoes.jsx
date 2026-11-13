import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, MapPin, MessageCircle, UserPlus, X } from "lucide-react";
import { adminCandidatosFn, decidirCandidatoFn } from "@/lib/landing-representante-fns";
import { dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/representantes/inscricoes")({
  component: InscricoesPage,
});

const EXPERIENCIA = {
  nenhuma: "Sem experiência em vendas",
  vendas: "Já trabalha com vendas",
  marketing: "Marketing digital",
  autonomo: "Autônomo / empresário",
};

const STATUS = {
  pendente: { label: "Aguardando análise", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejeitado: { label: "Rejeitado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

function InscricoesPage() {
  const carregarFn = useServerFn(adminCandidatosFn);
  const decidirFn = useServerFn(decidirCandidatoFn);
  const [candidatos, setCandidatos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("pendente");
  const [processando, setProcessando] = useState("");
  const [linksPerfis, setLinksPerfis] = useState({});

  const carregar = useCallback(async () => {
    try {
      const r = await carregarFn();
      setCandidatos(r.candidatos || []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as inscrições.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function decidir(c, acao) {
    if (acao === "rejeitar" && !window.confirm(`Rejeitar a inscrição de ${c.nome}?`)) return;
    setProcessando(c.id);
    try {
      const r = await decidirFn({ data: { id: c.id, acao } });
      if (acao === "aprovar" && r.representante) {
        const slug = r.representante.pagina_slug || r.representante.codigo;
        const link = slug ? `${window.location.origin}/r/${slug}` : "";
        if (link) setLinksPerfis((atual) => ({ ...atual, [c.id]: link }));
        toast.success(`Representante aprovado. ${r.convite || ""}${link ? ` Perfil: ${link}` : ""}`);
      } else {
        toast.success("Inscrição rejeitada.");
      }
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível concluir.");
    } finally {
      setProcessando("");
    }
  }

  const lista = filtro === "todas" ? candidatos : candidatos.filter((c) => c.status === filtro);
  const pendentes = candidatos.filter((c) => c.status === "pendente").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-white/50">
          Inscrições enviadas pela página <span className="text-white">/seja-representante</span>. Ao aprovar, o
          representante é cadastrado com as comissões padrão, recebe uma página pessoal e um convite de acesso por e-mail.
        </p>
        <div className="flex gap-1.5">
          {[
            ["pendente", `Pendentes (${pendentes})`],
            ["aprovado", "Aprovadas"],
            ["rejeitado", "Rejeitadas"],
            ["todas", "Todas"],
          ].map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${filtro === valor ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-white/55"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando inscrições...
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">Nenhuma inscrição {filtro === "todas" ? "" : "nesta situação"}.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((c) => {
            const st = STATUS[c.status] || STATUS.pendente;
            const fone = String(c.telefone || "").replace(/\D/g, "");
            const linkPerfil = linksPerfis[c.id] || (c.representante_slug ? `/r/${c.representante_slug}` : "");
            return (
              <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-[14px] font-bold text-white">{c.nome}</p>
                    <p className="truncate text-[11px] text-white/40">{c.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-white/50">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.cidade || "—"}</span>
                  {fone && (
                    <a href={`https://wa.me/${fone.length <= 11 ? `55${fone}` : fone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:underline">
                      <MessageCircle className="h-3 w-3" /> {c.telefone}
                    </a>
                  )}
                  <span>{EXPERIENCIA[c.experiencia] || c.experiencia}</span>
                </div>
                {c.mensagem && <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-white/60">{c.mensagem}</p>}
                {linkPerfil && (
                  <div className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Página do representante criada</p>
                    <a href={linkPerfil} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-[12px] font-semibold text-emerald-200 hover:underline">
                      {linkPerfil} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-white/30">{dataHora(c.created_date)}</span>
                  {c.status === "pendente" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => decidir(c, "rejeitar")}
                        disabled={processando === c.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Rejeitar
                      </button>
                      <button
                        onClick={() => decidir(c, "aprovar")}
                        disabled={processando === c.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {processando === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Aprovar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
