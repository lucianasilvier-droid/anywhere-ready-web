import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Minus, Plus, ShoppingCart, Check, ArrowLeft, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import PlateVisual from "@/components/store/PlateVisual";
import { cart } from "@/lib/cart";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_site/loja/$slug")({
  head: () => ({ meta: [{ title: "Produto — Loja Google NFC Connect" }] }),
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    base44.entities.Produto.filter({ slug }, { limit: 1 })
      .then(async (page) => {
        const lista = Array.isArray(page) ? page : page?.items || [];
        if (lista[0]) return lista[0];
        try {
          return await base44.entities.Produto.get(slug);
        } catch {
          return null;
        }
      })
      .then((resultado) => ativo && setProduto(resultado))
      .catch(() => ativo && setProduto(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [slug]);

  if (carregando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando produto...
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-heading text-2xl font-bold text-white">Produto não encontrado</p>
        <p className="mt-2 text-sm text-white/55">Ele pode ter sido desativado pela loja.</p>
        <Link to="/loja" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-[#0a1128]">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  function adicionar(irParaCarrinho) {
    cart.add(produto, quantidade);
    toast.success("Produto adicionado ao carrinho.");
    if (irParaCarrinho) navigate({ to: "/carrinho" });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/loja" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white/50 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a loja
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          {produto.imagens?.[0] ? (
            <img src={produto.imagens[0]} alt={produto.nome} className="w-full rounded-2xl object-cover" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10">
              <PlateVisual nome={produto.modelo ? produto.modelo.toUpperCase() : "Sua Empresa"} />
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Truck, t: produto.prazo_producao || "Produção acompanhada" },
              { icon: ShieldCheck, t: "Links testados" },
              { icon: Check, t: "Personalização inclusa" },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3">
                <b.icon className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1.5 text-[10.5px] leading-tight text-white/50">{b.t}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-white">{produto.nome}</h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/60">{produto.descricao_curta}</p>

          <div className="mt-5 flex items-end gap-3">
            <p className="font-heading text-3xl font-extrabold text-primary">{brl(produto.preco)}</p>
            {produto.preco_antigo > produto.preco && (
              <p className="pb-1 text-sm text-white/35 line-through">{brl(produto.preco_antigo)}</p>
            )}
          </div>
          <p className="mt-1 text-[12px] text-white/40">
            {produto.estoque > 0
              ? `${produto.estoque} unidade(s) em estoque · frete grátis acima de R$ 150,00`
              : "Produção sob encomenda"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-white/12 p-1">
              <button
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-white">{quantidade}</span>
              <button
                onClick={() => setQuantidade((q) => Math.min(50, q + 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => adicionar(false)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-bold text-primary"
            >
              <ShoppingCart className="h-4 w-4" /> Adicionar
            </button>
            <button
              onClick={() => adicionar(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-3 text-sm font-bold text-[#0a1128]"
            >
              Comprar agora
            </button>
          </div>

          {produto.descricao && (
            <div className="mt-7 border-t border-white/[0.07] pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Descrição</p>
              <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-white/60">
                {produto.descricao}
              </p>
            </div>
          )}

          {produto.itens_inclusos?.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">O que está incluso</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {produto.itens_inclusos.map((i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-white/55">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}