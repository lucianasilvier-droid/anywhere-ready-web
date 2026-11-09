import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Package, ExternalLink } from "lucide-react";
import PlateVisual from "@/components/store/PlateVisual";
import { brl } from "@/lib/format";

export default function ProductCard({ produto }) {
  const temPreco = Number(produto.preco) > 0;
  return <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-primary/30">
    <Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="block">
      <div className="relative p-3">{produto.imagens?.[0] ? <img src={produto.imagens[0]} alt={produto.nome} className="h-44 w-full rounded-xl object-cover" /> : <PlateVisual nome={produto.modelo ? produto.modelo.toUpperCase() : "Sua Empresa"} />}</div>
      <div className="px-5 pb-2 pt-2"><h3 className="font-heading text-[15px] font-bold leading-snug text-white">{produto.nome}</h3><p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/50">{produto.descricao_curta}</p></div>
    </Link>
    <div className="mt-auto flex items-end justify-between gap-3 px-5 pb-3 pt-4"><div>{temPreco ? <p className="font-heading text-lg font-extrabold text-primary">{brl(produto.preco)}</p> : <p className="text-xs font-semibold text-primary">Consulte condições</p>}<p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/35"><Package className="h-3 w-3" />{produto.estoque > 0 ? `${produto.estoque} em estoque` : "Sob encomenda"}</p></div><Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-primary transition-colors group-hover:bg-primary group-hover:text-[#0a1128]" aria-label="Ver produto"><ArrowUpRight className="h-4 w-4" /></Link></div>
    {produto.checkout_url && <div className="px-5 pb-5"><a href={produto.checkout_url} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-3 text-xs font-bold text-[#0a1128]"><ExternalLink className="h-3.5 w-3.5" />{produto.checkout_label || "Comprar agora"}</a></div>}
  </article>;
}