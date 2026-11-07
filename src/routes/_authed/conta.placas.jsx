import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, CreditCard, ExternalLink, Copy, Instagram, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEntityList } from "@/hooks/useEntityList";
import { dataCurta } from "@/lib/format";

export const Route = createFileRoute("/_authed/conta/placas")({
  head: () => ({ meta: [{ title: "Minhas placas NFC — Google NFC Connect" }] }),
  component: PlacasCliente,
});

const STATUS = {
  aguardando_configuracao: "Aguardando configuração",
  em_producao: "Em produção",
  testada: "Testada",
  enviada: "Enviada",
  entregue: "Entregue",
};

function PlacasCliente() {
  const { user } = useAuth();
  const { items, loading } = useEntityList("PlacaNFC", { cliente_email: user?.email }, { limit: 100 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-white">Minhas placas NFC</h1>
        <p className="mt-1 text-[12.5px] text-white/45">
          Cada placa tem um endereço exclusivo com os seus links. O chip NFC abre essa página.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando placas...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">Nenhuma placa vinculada ainda.</p>
          <Link to="/loja" className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">
            Comprar uma placa
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <article key={p.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold text-white">{p.nome_exibicao || p.empresa}</p>
                  <p className="font-mono text-[10.5px] text-white/35">{p.codigo}</p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[9.5px] font-semibold uppercase text-white/50">
                  {STATUS[p.status] || p.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-[11.5px]">
                <p className="flex items-center gap-1.5 text-white/55">
                  <Star className="h-3 w-3 text-[#FBBC05]" />
                  {p.google_review_url ? (
                    <a href={p.google_review_url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                      Link de avaliação configurado
                    </a>
                  ) : (
                    <span className="text-amber-300/80">Link do Google pendente</span>
                  )}
                </p>
                <p className="flex items-center gap-1.5 text-white/55">
                  <Instagram className="h-3 w-3 text-[#EA4335]" />
                  {p.instagram_url ? (
                    <a href={p.instagram_url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                      Instagram configurado
                    </a>
                  ) : (
                    <span className="text-white/30">Instagram não informado</span>
                  )}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link
                  to="/placa/$code"
                  params={{ code: p.codigo }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10.5px] font-bold text-[#0a1128]"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir página
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/placa/${p.codigo}`);
                    toast.success("Link da placa copiado.");
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-[10.5px] font-semibold text-white/65"
                >
                  <Copy className="h-3 w-3" /> Copiar link
                </button>
              </div>
              {p.testada_em && (
                <p className="mt-2 text-[10px] text-emerald-300/70">Links testados em {dataCurta(p.testada_em)}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}