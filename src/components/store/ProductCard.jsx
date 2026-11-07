import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Package } from "lucide-react";
import PlateVisual from "@/components/store/PlateVisual";
import { brl } from "@/lib/format";

export default function ProductCard({ produto }) {
  return (
    <Link
      to="/loja/$slug"
      params={{ slug: produto.slug || produto.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-primary/30"
    >
      <div className="relative p-3">
        {produto.imagens?.[0] ? (
          <img
            src={produto.imagens[0]}
            alt={produto.nome}
            className="h-44 w-full rounded-xl object-cover"
          />
        ) : (
          <PlateVisual nome={produto.modelo ? produto.modelo.toUpperCase() : "Sua Empresa"} />
        )}
        {produto.destaque && (
          <span className="absolute left-5 top-5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a1128]">
            Mais vendido
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 pt-2">
        <h3 className="font-heading text-[15px] font-bold leading-snug text-white">{produto.nome}</h3>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/50">
          {produto.descricao_curta}
        </p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            {produto.preco_antigo > produto.preco && (
              <p className="text-[11px] text-white/30 line-through">{brl(produto.preco_antigo)}</p>
            )}
            <p className="font-heading text-lg font-extrabold text-primary">{brl(produto.preco)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/35">
              <Package className="h-3 w-3" />
              {produto.estoque > 0 ? `${produto.estoque} em estoque` : "Sob encomenda"}
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-primary transition-colors group-hover:bg-primary group-hover:text-[#0a1128]">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}