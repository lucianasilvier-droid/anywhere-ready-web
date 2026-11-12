import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronDown, Clock3, Coffee, MapPin, Menu, MessageCircle, ParkingCircle, Scissors, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/proposta-barbearia-da-vinci")({
  head: () => ({
    meta: [
      { title: "Barbearia da Vinci | Seu visual é nossa arte" },
      { name: "description", content: "Barbearia no Ipiranga com cortes clássicos e modernos, barba com toalha quente, visagismo e espaço kids. Agende seu horário." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PropostaBarbeariaDaVinci,
});

const WHATSAPP = "https://wa.me/5511972168790";
const AGENDAR = "https://sites.appbarber.com.br/studiobarbav8-mkz9";
const MAPA = "https://www.google.com/maps/search/?api=1&query=Rua+Silva+Bueno%2C+65%2C+Ipiranga%2C+S%C3%A3o+Paulo";
const fotos = [
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-03-at-15.07.45-1024x1024.jpeg", alt: "Resultado de corte na Barbearia da Vinci", tag: "Visagismo" },
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2025/08/WhatsApp-Image-2025-08-15-at-18.48.43-1-768x1024.jpeg", alt: "Corte infantil feito na Barbearia da Vinci", tag: "Corte" },
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2025/08/WhatsApp-Image-2025-07-24-at-13.00.39-768x1024.jpeg", alt: "Cliente após corte infantil", tag: "Kids" },
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2025/08/WhatsApp-Image-2025-08-09-at-14.46.52-768x1024.jpeg", alt: "Experiência do espaço kids", tag: "Família" },
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2025/08/WhatsApp-Image-2025-08-19-at-18.43.26-2-768x1024.jpeg", alt: "Corte criativo infantil", tag: "Kids" },
  { src: "https://barbeariadavinci.com.br/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-03-at-15.04.05.jpeg", alt: "Detalhe de corte realizado na barbearia", tag: "Corte" },
];
const equipe = [
  { nome: "Luan", funcao: "Barbeiro profissional", foto: "https://barbeariadavinci.com.br/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-19-at-12.39.16-682x1024.jpeg" },
  { nome: "Karen", funcao: "Equipe profissional", foto: "https://barbeariadavinci.com.br/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-19-at-12.47.09-682x1024.jpeg" },
  { nome: "Thiago", funcao: "Barbeiro profissional", foto: "https://barbeariadavinci.com.br/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-19-at-12.32.32-682x1024.jpeg" },
  { nome: "Denner", funcao: "Equipe profissional", foto: "https://barbeariadavinci.com.br/wp-content/uploads/2026/06/WhatsApp-Image-2026-06-19-at-12.35.28-682x1024.jpeg" },
];
const servicos = [
  ["Cabelo", "Corte clássico ou moderno, com acabamento cuidadoso.", "R$ 80", "45 min", "Seg. a qua.: R$ 70"],
  ["Barba", "Ritual tradicional com atenção aos detalhes.", "R$ 70", "45 min", "Seg. a qua.: R$ 65"],
  ["Combo cabelo + barba", "O cuidado completo para renovar o visual.", "R$ 130", "", ""],
  ["Cabelo 1 pente + barba", "Praticidade e acabamento em um só atendimento.", "R$ 90", "60 min", "Seg. a qua.: R$ 85"],
  ["Corte 1 pente / raspar", "Visual uniforme e prático.", "R$ 65", "15 min", "Seg. a qua.: R$ 60"],
  ["Spa capilar", "Momento de cuidado e relaxamento.", "R$ 65", "15 min", ""],
  ["Perfil / pezinho", "Acabamento para manter o corte alinhado.", "R$ 20", "15 min", ""],
  ["Ajuste de sobrancelha", "Finalização sutil para valorizar o rosto.", "R$ 20", "15 min", ""],
  ["Depilação nariz + orelha", "Atendimento combinado.", "R$ 70", "", ""],\n  ["Depilação de nariz ou orelha", "Cuidado rápido e acabamento.", "R$ 40 cada", "", ""],
  ["Disfarce de grisalhos", "Barba R$ 50 · Cabelo R$ 70.", "A partir de R$ 50", "", ""],
  ["Limpeza de pele", "Extração de cravos e vapor de ozônio.", "R$ 70", "", ""],
  ["Botox capilar", "Tratamento para os fios.", "A partir de R$ 170", "2 h", "Consulte a equipe"],
  ["Luzes", "Valor depende do cabelo e do tempo de execução.", "A partir de R$ 160", "", "Envie uma foto para orçamento"],
  ["Progressiva", "Orçamento personalizado conforme o cabelo.", "A partir de R$ 170", "", "Envie uma foto para orçamento"],
];
const visagismo = [
  ["Consultoria + barba", "Seg. a qua. R$ 265 · Qui. a sáb. R$ 370"],
  ["Consultoria + cabelo", "Seg. a qua. R$ 270 · Qui. a sáb. R$ 380"],
  ["Consultoria completa", "Barba + cabelo · Seg. a qua. R$ 310 · Qui. a sáb. R$ 430"],
];

function Img({ src, alt, className = "" }) {
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className={className} onError={(event) => { event.currentTarget.style.display = "none"; }} />;
}

function PropostaBarbeariaDaVinci() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [categoria, setCategoria] = useState("Todos");
  const [faqAberto, setFaqAberto] = useState(0);
  const categorias = ["Todos", "Corte", "Kids", "Família", "Visagismo"];
  const fotosFiltradas = categoria === "Todos" ? fotos : fotos.filter((foto) => foto.tag === categoria);
  const wa = (msg) => `${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#191714] selection:bg-[#c7a66a] selection:text-[#17130d]" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
      <div className="bg-[#171512] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[.22em] text-[#d7bd8b] sm:text-[11px]">
        Ipiranga · São Paulo · Desde 2021
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f0e8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Barbearia da Vinci - início">
            <span className="grid h-11 w-11 place-items-center border border-[#b89a63] text-[#9a7841]"><Scissors size={21}/></span>
            <span><strong className="block font-serif text-[18px] leading-none tracking-[.04em]">DA VINCI</strong><small className="mt-1 block text-[9px] font-semibold uppercase tracking-[.25em] text-[#806c4e]">Barbearia · Ipiranga</small></span>
          </a>
          <nav className="hidden items-center gap-7 text-[11px] font-bold uppercase tracking-[.16em] lg:flex">
            <a href="#experiencia" className="hover:text-[#967544]">A experiência</a><a href="#servicos" className="hover:text-[#967544]">Serviços</a><a href="#galeria" className="hover:text-[#967544]">Galeria</a><a href="#equipe" className="hover:text-[#967544]">Equipe</a><a href="#localizacao" className="hover:text-[#967544]">Localização</a>
          </nav>
          <a href={AGENDAR} target="_blank" rel="noreferrer" className="hidden items-center gap-2 bg-[#a98750] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-white transition hover:bg-[#80643b] sm:inline-flex">Agendar horário <ArrowRight size={14}/></a>
          <button className="grid h-10 w-10 place-items-center border border-black/15 lg:hidden" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu">{menuAberto ? <X/> : <Menu/>}</button>
        </div>
        {menuAberto && <nav className="grid gap-1 border-t border-black/10 bg-[#f4f0e8] px-5 py-3 text-sm lg:hidden">{[["A experiência","#experiencia"],["Serviços","#servicos"],["Galeria","#galeria"],["Equipe","#equipe"],["Localização","#localizacao"]].map(([label,href]) => <a key={href} onClick={() => setMenuAberto(false)} className="py-2" href={href}>{label}</a>)}</nav>}
      </header>

      <section id="inicio" className="relative isolate min-h-[620px] overflow-hidden bg-[#171512] text-white sm:min-h-[700px]">
        <Img src={fotos[0].src} alt={fotos[0].alt} eager className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#171512] via-[#171512]/85 to-[#171512]/25"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#171512]/75 via-transparent to-[#171512]/10"/>
        <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-5 py-20 sm:min-h-[700px] lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.3em] text-[#d9bd88]"><span className="h-px w-10 bg-[#b9975e]"/> Seu visual é nossa arte</p>
            <h1 className="font-serif text-[clamp(3.2rem,8vw,6.8rem)] leading-[.96] tracking-[-.045em]">Tradição no<br/><span className="text-[#d7bd8b]">cuidado.</span><br/>Estilo em você.</h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/75 sm:text-[17px]">Uma experiência de barbearia clássica no Ipiranga, com olhar contemporâneo, profissionais visagistas e atenção a cada detalhe.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={AGENDAR} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-[#b18e55] px-7 py-4 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#171512] transition hover:bg-[#d5b77f]">Agendar meu horário <ArrowRight size={16}/></a>
              <a href="#servicos" className="inline-flex items-center border border-white/35 px-7 py-4 text-[11px] font-bold uppercase tracking-[.16em] text-white transition hover:bg-white/10">Conhecer serviços</a>
            </div>
            <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-[10px] font-semibold uppercase tracking-[.15em] text-white/65"><span className="flex items-center gap-2"><Coffee size={15} className="text-[#d7bd8b]"/> Café expresso cortesia</span><span className="flex items-center gap-2"><ParkingCircle size={15} className="text-[#d7bd8b]"/> Estacionamento</span><span className="flex items-center gap-2"><Sparkles size={15} className="text-[#d7bd8b]"/> Espaço kids</span></div>
          </div>
        </div>
        <div className="absolute bottom-7 right-8 hidden text-right text-[9px] uppercase tracking-[.3em] text-white/50 md:block">Rua Silva Bueno, 65<br/>Ipiranga · São Paulo</div>
      </section>

      <section className="border-b border-[#d9d0c0] bg-[#eae3d7]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[#d0c5b2] px-5 sm:grid-cols-4 sm:divide-y-0 lg:px-8">
          {[["01","Desde 2021","Tradição no bairro"],["02","Visagismo","Cuidado personalizado"],["03","Kids","Espaço pensado para os pequenos"],["04","Família","Cuidado para todos"]].map(([n,t,d]) => <div key={n} className="px-4 py-6 sm:px-6 sm:py-8"><span className="text-[10px] tracking-[.2em] text-[#a17d48]">{n}</span><h3 className="mt-2 font-serif text-xl">{t}</h3><p className="mt-1 text-[11px] text-[#766c5e]">{d}</p></div>)}
        </div>
      </section>

      <section id="experiencia" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-28">
        <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7847]">Muito além do corte</p><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A barbearia clássica, com uma experiência completa.</h2><p className="mt-6 text-[15px] leading-8 text-[#655d52]">A Barbearia da Vinci resgata o clima das barbearias tradicionais e une técnica, estilo e conforto. Do corte clássico ao moderno, da barba com toalha quente ao visagismo, cada atendimento é pensado para valorizar sua identidade.</p><p className="mt-4 text-[15px] leading-8 text-[#655d52]">Enquanto você cuida do visual, aproveite o café expresso cortesia, o espaço de lazer com PlayStation e o estacionamento. As crianças também têm um espaço especial e atendimento pensado para elas.</p><a href={wa("Olá! Gostaria de conhecer melhor a experiência da Barbearia da Vinci.")} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-3 border-b border-[#a98750] pb-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#87683e]">Fale com nossa equipe <ArrowRight size={15}/></a></div>
        <div className="grid grid-cols-2 gap-3"><Img src={fotos[1].src} alt={fotos[1].alt} className="h-64 w-full object-cover sm:h-80"/><Img src={fotos[5].src} alt={fotos[5].alt} className="mt-10 h-64 w-full object-cover sm:h-80"/></div>
      </section>

      <section id="servicos" className="bg-[#1b1916] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#c6a46e]">Serviços & valores</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Seu próximo visual começa aqui.</h2></div><p className="max-w-sm text-[12px] leading-6 text-white/55">Valores conforme a tabela divulgada pela barbearia. Serviços com orçamento variável devem ser confirmados com a equipe.</p></div>
          <div className="mt-12 grid gap-x-12 md:grid-cols-2">
            {servicos.map(([nome,desc,preco,duracao,nota],i) => <article key={nome} className="border-b border-white/15 py-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-serif text-xl">{nome}</h3><p className="mt-1.5 max-w-md text-[12px] leading-5 text-white/55">{desc}</p>{nota && <p className="mt-2 text-[10px] font-semibold uppercase tracking-[.08em] text-[#d5b77f]">{nota}</p>}</div><div className="shrink-0 text-right"><strong className="font-serif text-xl text-[#d7bd8b]">{preco}</strong>{duracao && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/45"><Clock3 size={11}/>{duracao}</p>}</div></div></article>)}
          </div>
          <div className="mt-14 grid gap-8 border border-[#8e744d] p-6 sm:p-9 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d7bd8b]">Assinatura da casa</p><h3 className="mt-3 font-serif text-3xl">Visagismo</h3><p className="mt-3 text-[13px] leading-6 text-white/60">Estudo personalizado do formato do rosto e das proporções para criar uma proposta de cabelo e/ou barba alinhada à sua identidade.</p><p className="mt-3 text-[11px] text-[#d7bd8b]">Duração aproximada: 150 minutos</p></div><div className="grid gap-3 sm:grid-cols-3">{visagismo.map(([nome,valor]) => <div key={nome} className="bg-white/[.06] p-4"><h4 className="font-serif text-lg">{nome}</h4><p className="mt-3 text-[11px] leading-5 text-white/65">{valor}</p></div>)}</div></div>
          <p className="mt-5 text-[10px] leading-5 text-white/40">Luzes e progressiva: a partir de R$ 160 e R$ 170, respectivamente; é necessário enviar uma foto para orçamento. Confirme valores e disponibilidade ao agendar.</p>
          <div className="mt-9 text-center"><a href={AGENDAR} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-[#b18e55] px-8 py-4 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#171512] hover:bg-[#d5b77f]">Escolher horário <ArrowRight size={16}/></a></div>
        </div>
      </section>

      <section id="galeria" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7847]">Trabalhos & ambiente</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Veja de perto.</h2></div><p className="max-w-sm text-[12px] leading-6 text-[#766c5e]">Fotos reais publicadas nos canais oficiais da Barbearia da Vinci.</p></div>
        <div className="mt-7 flex flex-wrap gap-2">{categorias.map((cat) => <button key={cat} onClick={() => setCategoria(cat)} className={`border px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] transition ${categoria === cat ? "border-[#9c7b4b] bg-[#9c7b4b] text-white" : "border-[#cfc4b3] text-[#625746] hover:border-[#9c7b4b]"}`}>{cat}</button>)}</div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">{fotosFiltradas.map((foto) => <figure key={foto.src} className="group relative aspect-[4/5] overflow-hidden bg-[#ded6c9]"><Img src={foto.src} alt={foto.alt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12 text-[10px] font-bold uppercase tracking-[.2em] text-white">{foto.tag}</figcaption></figure>)}</div>
      </section>

      <section id="equipe" className="bg-[#e8e0d3] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7847]">Quem cuida de você</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Nossa equipe.</h2><p className="mt-4 max-w-xl text-[13px] leading-6 text-[#766c5e]">Conheça os profissionais apresentados nos canais oficiais da barbearia.</p><div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">{equipe.map((p) => <article key={p.nome} className="bg-[#f4f0e8]"><div className="aspect-[3/4] overflow-hidden bg-[#d3c9b8]"><Img src={p.foto} alt={`Foto de ${p.nome}, equipe da Barbearia da Vinci`} className="h-full w-full object-cover object-top"/></div><div className="p-4"><h3 className="font-serif text-xl">{p.nome}</h3><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#84745c]">{p.funcao}</p></div></article>)}</div></div>
      </section>

      <section className="bg-[#b18e55] px-5 py-14 text-center text-[#171512]"><p className="text-[10px] font-extrabold uppercase tracking-[.25em]">Seu momento, seu estilo</p><h2 className="mx-auto mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">Um bom corte muda o visual. Uma boa experiência muda o dia.</h2><a href={AGENDAR} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-3 bg-[#171512] px-8 py-4 text-[11px] font-extrabold uppercase tracking-[.15em] text-white hover:bg-[#302a20]">Agendar agora <ArrowRight size={16}/></a></section>

      <section id="localizacao" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
        <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7847]">Estamos no Ipiranga</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Vai ser um prazer receber você.</h2><p className="mt-6 flex items-start gap-3 text-[14px] text-[#62594d]"><MapPin className="mt-0.5 text-[#9b7847]" size={18}/>Rua Silva Bueno, 65 · Ipiranga · São Paulo – SP</p><p className="mt-4 flex items-start gap-3 text-[14px] text-[#62594d]"><Clock3 className="mt-0.5 text-[#9b7847]" size={18}/><span>Segunda a sexta: 10h às 20h<br/>Sábado: 9h às 18h<br/>Domingo: fechado</span></p><p className="mt-4 flex items-center gap-3 text-[14px] text-[#62594d]"><MessageCircle className="text-[#9b7847]" size={18}/>(11) 97216-8790</p><div className="mt-8 flex flex-wrap gap-3"><a href={MAPA} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#171512] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[.12em] text-white">Como chegar <MapPin size={14}/></a><a href={wa("Olá! Gostaria de tirar uma dúvida e agendar um horário.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#9b7847] px-6 py-3.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#6d5330]">WhatsApp <MessageCircle size={14}/></a></div></div>
        <div className="min-h-[320px] overflow-hidden bg-[#ded6c9]"><iframe title="Mapa da Barbearia da Vinci no Ipiranga" src="https://www.google.com/maps?q=Rua%20Silva%20Bueno%2C%2065%2C%20Ipiranga%2C%20S%C3%A3o%20Paulo&output=embed" className="h-full min-h-[320px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div>
      </section>

      <section className="bg-[#e8e0d3] px-5 py-16"><div className="mx-auto max-w-3xl"><p className="text-center text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7847]">Dúvidas frequentes</p><h2 className="mt-3 text-center font-serif text-4xl">Antes de agendar.</h2><div className="mt-8 divide-y divide-[#cfc4b3]">{[["Como faço para agendar?","Você pode escolher o serviço e reservar diretamente pelo sistema de agendamento da barbearia."],["A barbearia atende crianças?","Sim. A Barbearia da Vinci oferece corte infantil e conta com espaço kids."],["Tem estacionamento?","Sim. O estacionamento é um dos diferenciais divulgados pela barbearia."],["Como funciona o visagismo?","É uma consultoria personalizada que considera o formato do rosto e as proporções para orientar o visual."]].map(([q,a],i) => <div key={q} className="py-5"><button onClick={() => setFaqAberto(faqAberto === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 text-left font-serif text-lg">{q}<ChevronDown className={`shrink-0 transition ${faqAberto === i ? "rotate-180" : ""}`} size={18}/></button>{faqAberto === i && <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#766c5e]">{a}</p>}</div>)}</div></div></section>

      <footer className="bg-[#171512] px-5 py-10 text-center text-white"><div className="font-serif text-2xl tracking-[.08em]">BARBEARIA DA VINCI</div><p className="mt-2 text-[10px] uppercase tracking-[.2em] text-[#d7bd8b]">Seu visual é nossa arte</p><p className="mt-5 text-[11px] text-white/55">Rua Silva Bueno, 65 · Ipiranga · São Paulo – SP</p><div className="mt-6 flex justify-center gap-5 text-[10px] font-bold uppercase tracking-[.15em] text-white/65"><a href={AGENDAR} target="_blank" rel="noreferrer">Agendamento</a><a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a><a href={MAPA} target="_blank" rel="noreferrer">Localização</a></div><p className="mt-8 text-[9px] text-white/30">Proposta de novo site · Conteúdo baseado nos canais oficiais da empresa</p></footer>
      <a href={wa("Olá! Vim pelo site da Barbearia da Vinci e gostaria de agendar.")} target="_blank" rel="noreferrer" aria-label="Falar com a Barbearia da Vinci pelo WhatsApp" className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105"><MessageCircle size={25}/></a>
    </main>
  );
}
