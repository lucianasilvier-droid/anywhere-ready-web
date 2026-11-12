import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, ShoppingBag, Nfc, ShieldCheck, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProductCard from "@/components/store/ProductCard";
import { CATALOGO_INICIAL } from "@/lib/catalogo-inicial";

export const Route = createFileRoute("/_site/loja/")({
  head: () => ({
    meta: [
      { title: "Loja de Placas NFC Personalizadas e Soluções Digitais | Google NFC Connect" },
      {
        name: "description",
        content:
          "Conheça placas NFC personalizadas para avaliações no Google e acesso ao Instagram, além de soluções digitais para empresas. Veja os modelos e condições de compra.",
      },
      { property: "og:title", content: "Loja de Placas NFC Personalizadas | Google NFC Connect" },
      {
        property: "og:description",
        content: "Placas NFC personalizadas para empresas e soluções para fortalecer sua presença digital.",
      },
    ],
  }),
  component: LojaPage,
});

function LojaPage() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true;
    base44.entities.Produto.filter({ ativo: true }, { sort: "-destaque", limit: 50 })
      .then((page) => {
        if (!ativo) return;
        const lista = Array.isArray(page) ? page : page?.items || [];
        setProdutos(lista.length ? lista : CATALOGO_INICIAL);
      })
      .catch(() => ativo && setProdutos(CATALOGO_INICIAL))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, []);

  return <div>
    <section className="relative overflow-hidden border-b border-white/[0.06]"><div className="aurora absolute inset-0" /><div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">Loja</p>
      <h1 className="mt-3 max-w-2xl font-heading text-[2.1rem] font-extrabold leading-tight text-white sm:text-[2.8rem]">Placas NFC de avaliação <span className="text-gradient-gold">personalizadas</span></h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">Escolha seu modelo e compre com segurança. As placas são personalizadas após a compra e entregues prontas para usar.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{[
        { icon: Nfc, t: "NFC por aproximação", d: "Compatível com celulares Android e iPhone." },
        { icon: Zap, t: "Acesso rápido", d: "O cliente aproxima o celular e abre seu link." },
        { icon: ShieldCheck, t: "Personalização", d: "Configuramos os dados do estabelecimento após a compra." },
      ].map((b) => <div key={b.t} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"><b.icon className="mt-0.5 h-4.5 w-4.5 text-primary" /><div><p className="text-[13px] font-semibold text-white">{b.t}</p><p className="text-[11.5px] leading-relaxed text-white/45">{b.d}</p></div></div>)}</div>
    </div></section>
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between"><h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white"><ShoppingBag className="h-4.5 w-4.5 text-primary" /> Catálogo</h2><Link to="/carrinho" className="text-[12.5px] font-semibold text-primary hover:underline">Ver carrinho</Link></div>
      {carregando ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{produtos.map((p) => <ProductCard key={p.id} produto={p} />)}</div>}
    </section>
  </div>;
}
