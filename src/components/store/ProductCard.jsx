import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Package } from "lucide-react";
import PlateVisual from "@/components/store/PlateVisual";
import { brl } from "@/lib/format";

export default function ProductCard({ produto }) {
  const temPreco = Number(produto.preco) > 0;
  const checkoutUrl = produto.checkout_url || "";
  const checkoutInfinitePay = checkoutUrl.startsWith("https://loja.infinitepay.io/");
  return <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-primary/30">
    <Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="block">
      <div className="relative p-3">{produto.imagens?.[0] ? <img src={produto.imagens[0]} alt={produto.nome} className="h-44 w-full rounded-xl object-cover" /> : <PlateVisual nome={produto.modelo ? produto.modelo.toUpperCase() : "Sua Empresa"} />}</div>
      <div className="px-5 pb-2 pt-2"><h3 className="font-heading text-[15px] font-bold leading-snug text-white">{produto.nome}</h3><p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/50">{produto.descricao_curta}</p></div>
    </Link>
    <div className="mt-auto px-5 pb-5 pt-4"><div className="mb-3 flex items-end justify-between gap-3"><div>{temPreco ? <p className="font-heading text-lg font-extrabold text-primary">{brl(produto.preco)}</p> : <p className="text-xs font-semibold text-primary">Consulte condições</p>}<p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/35"><Package className="h-3 w-3" />{produto.estoque > 0 ? `${produto.estoque} em estoque` : "Sob encomenda"}</p></div><Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="text-[11px] font-semibold text-white/55 hover:text-white">Detalhes</Link></div>{checkoutInfinitePay && <a href={checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-3 text-[12px] font-bold text-[#0a1128]">Comprar pela InfinitePay</a>}</div>
  </article>;
}