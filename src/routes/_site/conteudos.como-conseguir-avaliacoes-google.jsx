import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/conteudos/como-conseguir-avaliacoes-google")({
  head: () => ({
    meta: [
      { title: "Como pedir avaliações no Google com boas práticas | Google NFC Connect" },
      { name: "description", content: "Veja maneiras simples e transparentes de convidar clientes reais a avaliar sua empresa no Google, respeitando as políticas da plataforma." },
    ],
  }),
  component: Artigo,
});

function Artigo() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/conteudos" className="text-sm font-semibold text-primary hover:underline">← Todos os conteúdos</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-primary">Avaliações · Relacionamento</p>
      <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">Como pedir avaliações no Google de forma correta</h1>
      <p className="mt-5 text-lg leading-relaxed text-white/65">Avaliações ajudam futuros clientes a conhecer experiências de outras pessoas. O caminho correto é tornar fácil para qualquer cliente real compartilhar uma opinião honesta, sem pressão e sem recompensa.</p>
      <h2 className="mt-9 font-heading text-2xl font-bold text-white">Convide clientes depois de uma experiência real</h2>
      <p className="mt-3 leading-relaxed text-white/65">Escolha um momento natural, como após a conclusão de um serviço ou uma compra. Use uma mensagem curta e educada, explique que a opinião é voluntária e deixe claro que comentários positivos e negativos são bem-vindos.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">Facilite o acesso ao link de avaliação</h2>
      <p className="mt-3 leading-relaxed text-white/65">Você pode compartilhar o link oficial de avaliação por mensagem, e-mail, recibo ou em um display físico no estabelecimento. Uma placa com NFC pode abrir o endereço correto quando o cliente aproxima um celular compatível e com NFC ativado.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">O que evitar</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-white/65">
        <li>Não ofereça dinheiro, descontos, brindes ou benefícios em troca de avaliações.</li>
        <li>Não peça somente avaliações de clientes que você acredita que darão nota alta.</li>
        <li>Não pressione o cliente nem dite o texto que ele deve publicar.</li>
        <li>Não publique avaliações falsas, de funcionários ou de pessoas sem experiência real.</li>
        <li>Não condicione atendimento, garantia ou benefício à publicação de uma avaliação.</li>
      </ul>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">Responda com atenção</h2>
      <p className="mt-3 leading-relaxed text-white/65">Agradeça comentários positivos de forma genuína. Quando houver crítica, reconheça a experiência relatada, evite discutir publicamente e ofereça um canal adequado para resolver o problema. Nunca exponha informações privadas do cliente na resposta.</p>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-bold text-white">Deixe o acesso mais simples com NFC</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">Veja como funciona uma placa NFC configurada para abrir o link de avaliação da sua empresa.</p>
        <Link to="/servicos/placa-nfc" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Conhecer as placas NFC</Link>
      </div>
    </article>
  );
}
