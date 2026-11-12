import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/conteudos/perfil-da-empresa-google")({
  head: () => ({
    meta: [
      { title: "Perfil da Empresa no Google: guia para negócios locais | Google NFC Connect" },
      { name: "description", content: "Aprenda a organizar o Perfil da Empresa no Google: nome, categoria, endereço, telefone, horários, fotos e atualizações para clientes." },
    ],
  }),
  component: Artigo,
});

function Artigo() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/conteudos" className="text-sm font-semibold text-primary hover:underline">← Todos os conteúdos</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-primary">Google Maps · Presença local</p>
      <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">Perfil da Empresa no Google: por onde começar</h1>
      <p className="mt-5 text-lg leading-relaxed text-white/65">O Perfil da Empresa no Google ajuda pessoas a encontrar informações importantes sobre um negócio na Busca e no Maps. Manter esse cadastro correto facilita o contato e evita que o cliente encontre dados desatualizados.</p>
      <h2 className="mt-9 font-heading text-2xl font-bold text-white">1. Confira o nome e a categoria</h2>
      <p className="mt-3 leading-relaxed text-white/65">Use o nome comercial real, como ele é apresentado aos clientes. Escolha uma categoria principal que descreva a atividade central e adicione categorias secundárias apenas quando forem relevantes. Não inclua palavras promocionais ou termos extras no nome para tentar manipular resultados.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">2. Mantenha contato e localização atualizados</h2>
      <p className="mt-3 leading-relaxed text-white/65">Revise endereço, telefone, site, área atendida e horários. Se a empresa atende somente por região ou não recebe clientes em endereço comercial, configure o perfil de acordo com as regras aplicáveis ao tipo de negócio.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">3. Mostre o que a empresa oferece</h2>
      <p className="mt-3 leading-relaxed text-white/65">Inclua uma descrição objetiva, serviços reais, fotos atuais e informações úteis. Evite textos repetitivos ou promessas que a empresa não possa cumprir. Atualize as imagens quando houver mudanças relevantes no espaço, equipe ou produtos.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">4. Acompanhe avaliações e perguntas</h2>
      <p className="mt-3 leading-relaxed text-white/65">Responda com educação e contexto, sem divulgar dados pessoais do cliente. Convide clientes reais a avaliar a experiência, mas não ofereça descontos, brindes ou vantagens em troca de avaliações. Também não selecione apenas clientes satisfeitos para pedir avaliações.</p>
      <h2 className="mt-8 font-heading text-2xl font-bold text-white">5. Revise o perfil regularmente</h2>
      <p className="mt-3 leading-relaxed text-white/65">Crie uma rotina para conferir horários especiais, telefones, links, fotos e serviços. Mudanças precisam refletir a realidade da empresa. A verificação e a exibição do perfil dependem dos processos e decisões do Google; nenhum prestador pode garantir posição específica nos resultados.</p>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-bold text-white">Precisa de ajuda com seu perfil?</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">Conheça nosso serviço de configuração do Perfil da Empresa no Google e veja como funciona o acompanhamento.</p>
        <Link to="/servicos/perfil-google" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Conhecer o serviço</Link>
      </div>
    </article>
  );
}
