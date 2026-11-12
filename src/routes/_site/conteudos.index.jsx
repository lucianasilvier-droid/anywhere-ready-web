import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/conteudos/")({
  head: () => ({
    meta: [
      { title: "Conteúdos sobre Google Maps, avaliações e NFC | Google NFC Connect" },
      { name: "description", content: "Guias práticos para empresas: Perfil da Empresa no Google, avaliações de clientes, placas NFC e presença digital local." },
    ],
  }),
  component: ConteudosPage,
});

const artigos = [
  { to: "/conteudos/perfil-da-empresa-google", titulo: "Perfil da Empresa no Google: por onde começar", resumo: "Entenda como organizar as informações da empresa, manter os dados corretos e facilitar que clientes encontrem seu negócio." },
  { to: "/conteudos/como-conseguir-avaliacoes-google", titulo: "Como pedir avaliações no Google de forma correta", resumo: "Boas práticas para convidar clientes reais a compartilhar experiências honestas, sem oferecer recompensas ou pressionar." },
  { to: "/conteudos/placa-nfc-como-funciona", titulo: "Placa NFC: como funciona e como usar no atendimento", resumo: "Saiba como a aproximação NFC pode facilitar o acesso a links úteis, como a página de avaliação da empresa." },
];

function ConteudosPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Central de conteúdos</p>
      <h1 className="mt-3 font-heading text-3xl font-extrabold text-white sm:text-4xl">Ideias práticas para fortalecer sua presença digital</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65">Informação clara para negócios locais que querem melhorar seus dados no Google, facilitar o contato com clientes e usar recursos digitais no dia a dia.</p>
      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {artigos.map((artigo) => (
          <article key={artigo.to} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-heading text-xl font-bold text-white">{artigo.titulo}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{artigo.resumo}</p>
            <Link to={artigo.to} className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">Ler conteúdo</Link>
          </article>
        ))}
      </div>
    </main>
  );
}
