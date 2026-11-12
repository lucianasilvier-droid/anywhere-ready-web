import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Package } from "lucide-react";
import PlateVisual from "@/components/store/PlateVisual";
import { brl } from "@/lib/format";

export default function ProductCard({ produto }) {
  const temPreco = Number(produto.preco) > 0;
  const imagem = produto.imagens?.[0];
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111827] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_45px_rgba(0,0,0,.22)]">
    <Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="block">
      <div className="relative flex aspect-[4/5] max-h-[330px] items-center justify-center overflow-hidden bg-gradient-to-b from-[#172238] to-[#0d1422] p-3 sm:p-4">
        {imagem ? <img src={imagem} alt={produto.nome} loading="lazy" className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.025] ${produto.imagem_fit === "contain" ? "object-contain" : "object-cover"}`} /> : <div className="w-full"><PlateVisual nome={produto.modelo ? produto.modelo.toUpperCase() : "Sua Empresa"} /></div>}
      </div>
      <div className="px-5 pb-2 pt-4"><h3 className="font-heading text-[15px] font-bold leading-snug text-white">{produto.nome}</h3><p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-[12.5px] leading-relaxed text-white/55">{produto.descricao_curta}</p></div>
    </Link>
    <div className="mt-auto flex items-end justify-between gap-3 px-5 pb-5 pt-4">
      <div className="min-w-0">
        {temPreco ? <p className="font-heading text-xl font-extrabold text-primary">{brl(produto.preco)}</p> : <p className="text-xs font-semibold text-primary">Consulte condições</p>}
        {produto.preco_antigo > produto.preco && <p className="text-[11px] text-white/35 line-through">{brl(produto.preco_antigo)}</p>}
        <p className="mt-1 flex items-center gap-1 text-[10.5px] text-white/40"><Package className="h-3 w-3" />{produto.estoque > 0 ? `${produto.estoque} em estoque` : "Produção sob encomenda"}</p>
      </div>
      <Link to="/loja/$slug" params={{ slug: produto.slug || produto.id }} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[10.5px] font-extrabold text-[#0a1128] transition group-hover:bg-[#ffdf94]" aria-label={`Ver ${produto.nome}`}>Ver produto <ArrowUpRight className="h-3.5 w-3.5" /></Link>
    </div>
  </article>;
}
