import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/conteudos/placa-nfc-como-funciona")({
  head: () => ({
    meta: [
      { title: "Placa NFC: como funciona e como usar no atendimento | Google NFC Connect" },
      { name: "description", content: "Entenda a tecnologia NFC, como aproximar o celular de uma placa e como configurar um link para avaliações no Google ou redes sociais." },
    ],
  }),
  component: Artigo,
});

function Artigo() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/conteudos" className="text-sm font-semibold text-primary hover:underline">← Todos os conteúdos</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-primary">NFC · Atendimento</p>
      <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">Placa NFC: como funciona e como usar no atendimento</h1>
      <p className="mt-5 text-lg leading-relaxed text-white/65">NFC é uma tecnologia de comunicação por aproximação de curto alcance. Em uma placa configurada, um pequeno chip pode guardar um endereço digital para que o celular abra uma página ou link compatível.</p>
      <h2 className="mt-9 font-heading text-2xl font-bold text-white">Como o cliente usa a placa?</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 leading-relaxed text-white/65">
        <li>O cliente aproxima a área NFC do celular da placa.</li>
        <li>O aparelho identifica a etiqueta, quando possui NFC compatível e a função está disponível.</li>
        <li>O celular apresenta uma notificação ou abre o link conforme o sistema e as configurações.</li>
        <li>O cliente acessa a página indicada, por exemplo, o link de avaliação da empresa.</li>
      </ol>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">Onde colocar a placa?</h2>
      <p className="mt-3 leading-relaxed text-white/65">Escolha um local visível e de fácil acesso, como balcão, recepção ou mesa de atendimento. Evite superfícies metálicas sem uma etiqueta apropriada e deixe espaço para o cliente aproximar o aparelho. Uma orientação curta ao lado da placa pode explicar o gesto.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">O que pode abrir?</h2>
      <p className="mt-3 leading-relaxed text-white/65">A etiqueta pode direcionar para um link definido na configuração, como a página de avaliação do Google, o Instagram, um cardápio digital ou outro endereço permitido. Antes da entrega, teste o link em aparelhos compatíveis e confirme que ele leva ao destino correto.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">NFC substitui a avaliação?</h2>
      <p className="mt-3 leading-relaxed text-white/65">Não. A placa apenas facilita o acesso ao endereço. O cliente decide livremente se deseja avaliar e escreve sua própria opinião. Não ofereça recompensas nem condicione atendimento a uma avaliação positiva.</p>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-bold text-white">Veja os modelos disponíveis</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">Conheça as placas NFC personalizadas e as opções de configuração para seu estabelecimento.</p>
        <Link to="/loja" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Visitar a loja</Link>
      </div>
    </article>
  );
}
