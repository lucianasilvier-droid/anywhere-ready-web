import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen, Calendar, Car, CheckCircle2, ChevronDown, Clock, Coffee, Gift, Heart, Home, Instagram,
  Leaf, MapPin, MessageCircle, Music, Navigation, PawPrint, Phone, ShieldCheck, Smile, Sparkles,
  Star, Stethoscope, UtensilsCrossed, Wrench, Scissors, Zap,
} from "lucide-react";
import { sitePublicoFn } from "@/lib/sites-clientes-fns";
import { whatsappLink } from "@/lib/site-content";

export const Route = createFileRoute("/site/$slug")({
  loader: ({ params }) => sitePublicoFn({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const s = loaderData?.site;
    if (!s) return { meta: [{ title: "Site não encontrado" }, { name: "robots", content: "noindex" }] };
    const titulo = `${s.empresa}${s.cidade ? ` — ${s.cidade}` : ""}`;
    const descricao = s.conteudo?.seo_descricao || s.conteudo?.subtitulo || titulo;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        ...(s.status === "publicado" ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: SiteClientePage,
});

// Paletas que o agente Claude escolhe conforme o ramo da empresa.
const TEMAS = {
  esmeralda: { bg: "#f4f7f2", surface: "#ffffff", ink: "#11261c", muted: "#4f6358", accent: "#0f7a4f", accentInk: "#ffffff", soft: "#dcebe2", dark: "#0b2318" },
  oceano: { bg: "#f2f6f9", surface: "#ffffff", ink: "#0d1f33", muted: "#4d6074", accent: "#1665c1", accentInk: "#ffffff", soft: "#dbe8f6", dark: "#0a1a2e" },
  terracota: { bg: "#fbf5ef", surface: "#ffffff", ink: "#2d1a10", muted: "#6e5545", accent: "#c0532b", accentInk: "#ffffff", soft: "#f3e0d3", dark: "#2a160c" },
  vinho: { bg: "#faf4f4", surface: "#ffffff", ink: "#2a0f17", muted: "#6c4d55", accent: "#8e1f3d", accentInk: "#ffffff", soft: "#f1dce2", dark: "#250b13" },
  grafite: { bg: "#f4f4f2", surface: "#ffffff", ink: "#161616", muted: "#5b5b57", accent: "#1f1f1f", accentInk: "#f5d26b", soft: "#e6e5df", dark: "#111111" },
  solar: { bg: "#fffaf0", surface: "#ffffff", ink: "#2a1e05", muted: "#6b5a35", accent: "#e09a00", accentInk: "#1d1400", soft: "#fbecc4", dark: "#241a04" },
  lavanda: { bg: "#f7f5fb", surface: "#ffffff", ink: "#1e1530", muted: "#5e5470", accent: "#6a43c7", accentInk: "#ffffff", soft: "#e6def7", dark: "#1a1229" },
  floresta: { bg: "#f3f5ef", surface: "#ffffff", ink: "#1a2410", muted: "#56604a", accent: "#4d6b1f", accentInk: "#ffffff", soft: "#e1e8d2", dark: "#151d0c" },
};

const ICONES = {
  estrela: Star, coracao: Heart, tesoura: Scissors, dente: Smile, carro: Car, comida: UtensilsCrossed,
  cafe: Coffee, casa: Home, ferramenta: Wrench, saude: Stethoscope, beleza: Sparkles, pet: PawPrint,
  escudo: ShieldCheck, relogio: Clock, folha: Leaf, presente: Gift, livro: BookOpen, musica: Music,
  raio: Zap, check: CheckCircle2,
};

const PERIODOS = ["Manhã", "Tarde", "Noite", "Qualquer horário"];

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function SiteClientePage() {
  const dados = Route.useLoaderData();
  const site = dados?.site;

  if (!site) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f4f2] px-4">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-[#161616]">Site não encontrado</h1>
          <p className="mt-2 text-sm text-[#5b5b57]">Este endereço não está ativo no momento.</p>
          <Link to="/" className="mt-5 inline-block text-sm font-semibold text-[#1665c1] underline">Ir para a página inicial</Link>
        </div>
      </div>
    );
  }
  return <SiteCliente site={site} />;
}

function SiteCliente({ site }) {
  const c = site.conteudo || {};
  const t = TEMAS[c.tema] || TEMAS.oceano;
  const estiloVisual = ["premium", "urbano", "editorial", "acolhedor", "tecnologico"].includes(c.estilo_visual)
    ? c.estilo_visual
    : "premium";
  const vars = {
    "--bg": t.bg, "--surface": t.surface, "--ink": t.ink, "--muted": t.muted,
    "--accent": t.accent, "--accent-ink": t.accentInk, "--soft": t.soft, "--dark": t.dark,
  };
  const local = [site.bairro, site.cidade].filter(Boolean).join(", ");
  const consultaMapa = [site.empresa, site.endereco || local].filter(Boolean).join(", ");
  const linkRota = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa)}${
    site.place_id ? `&query_place_id=${encodeURIComponent(site.place_id)}` : ""
  }`;
  const wa = (texto) => (site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(texto)}` : "");
  const waOla = wa(`Olá, ${site.empresa}! Vi o site de vocês e gostaria de mais informações.`);
  const isRestaurante = c.tipo_negocio === "restaurante";
  const waReserva = wa(`Olá, ${site.empresa}! Gostaria de fazer uma reserva. Poderiam me informar a disponibilidade?`);
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };
  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": isRestaurante ? "Restaurant" : "LocalBusiness",
    name: site.empresa,
    description: c.seo_descricao || c.subtitulo || site.empresa,
    telephone: site.telefone || undefined,
    address: site.endereco || local ? {
      "@type": "PostalAddress",
      streetAddress: site.endereco || undefined,
      addressLocality: site.cidade || undefined,
      addressRegion: site.estado || undefined,
      addressCountry: "BR",
    } : undefined,
    aggregateRating: site.nota_google != null && Number(site.total_avaliacoes) > 0 ? {
      "@type": "AggregateRating",
      ratingValue: site.nota_google,
      reviewCount: site.total_avaliacoes,
      bestRating: 5,
    } : undefined,
    servesCuisine: isRestaurante && site.categoria ? site.categoria : undefined,
    hasMenu: isRestaurante && c.cardapio?.length ? {
      "@type": "Menu",
      hasMenuItem: c.cardapio.map((item) => ({
        "@type": "MenuItem",
        name: item.nome,
        description: item.descricao || undefined,
      })),
    } : undefined,
  };

  const fotosSite = Array.isArray(site.fotos_site) ? site.fotos_site : [];
  const fotosGoogle = Array.isArray(site.fotos_google) ? site.fotos_google : [];
  const fotoDestaque = fotosSite[0]
    ? { origem: "site_oficial", url: fotosSite[0].url }
    : fotosGoogle[0]?.name ? { origem: "google", ...fotosGoogle[0] } : null;
  const fotosGaleria = [
    ...fotosSite.slice(fotoDestaque?.origem === "site_oficial" ? 1 : 0).map((foto) => ({ origem: "site_oficial", url: foto.url })),
    ...fotosGoogle.slice(fotoDestaque?.origem === "google" ? 1 : 0).map((foto) => ({ origem: "google", ...foto })),
  ].slice(0, 12);

  return (
    <div data-estilo={estiloVisual} style={{ ...vars, backgroundColor: "var(--bg)", color: "var(--ink)" }} className="min-h-screen font-sans antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }} />
      {site.status === "demonstracao" && (
        <div className="bg-[var(--dark)] px-4 py-2 text-center text-[12px] text-white/80">
          Demonstração criada pela <strong className="text-white">Google NFC Connect</strong> para {site.empresa}.{" "}
          <a href={whatsappLink(`Olá! Vi a demonstração do site de ${site.empresa} e quero saber como ativar.`)} target="_blank" rel="noreferrer" className="font-semibold text-white underline underline-offset-2">
            Quero este site
          </a>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <a href="#topo" className="flex min-w-0 items-center gap-2.5">
            <span style={serif} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[17px] font-bold text-[var(--accent-ink)]">
              {site.empresa.trim().charAt(0).toUpperCase()}
            </span>
            <span style={serif} className="truncate text-[17px] font-bold">{site.empresa}</span>
          </a>
          <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-[var(--muted)] md:flex">
            <a href="#servicos" className="hover:text-[var(--ink)]">Serviços</a>
            <a href="#sobre" className="hover:text-[var(--ink)]">Sobre</a>
            <a href="#localizacao" className="hover:text-[var(--ink)]">Como chegar</a>
            <a href="#agendar" className="hover:text-[var(--ink)]">Agendar</a>
          </nav>
          <a href={isRestaurante && waReserva ? waReserva : "#agendar"} target={isRestaurante && waReserva ? "_blank" : undefined} rel={isRestaurante && waReserva ? "noreferrer" : undefined} className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--accent-ink)] shadow-sm hover:opacity-90">
            {isRestaurante ? "Reserve já" : "Agendar"}
          </a>
        </div>
      </header>

      <section
        id="topo"
        style={{
          backgroundImage: estiloVisual === "tecnologico"
            ? "radial-gradient(circle at 85% 20%, var(--soft), transparent 48%), linear-gradient(135deg, var(--bg), var(--surface))"
            : estiloVisual === "acolhedor"
              ? "linear-gradient(145deg, var(--soft), var(--bg) 72%)"
              : estiloVisual === "editorial"
                ? "linear-gradient(90deg, var(--surface), var(--bg))"
                : "linear-gradient(135deg, var(--soft) 0%, transparent 62%)",
        }}
        className={`relative overflow-hidden ${estiloVisual === "urbano" ? "bg-[var(--dark)] text-white" : ""}`}
      >
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[var(--soft)] opacity-80" />
        <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-[var(--soft)] opacity-50" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
          <div>
            {c.slogan && (
              <p className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] ${estiloVisual === "urbano" ? "border-white/20 bg-white/10 text-white/80" : "border-black/[0.08] bg-[var(--surface)] text-[var(--accent)]"}`}>
                {c.slogan}
              </p>
            )}
            {c.faixa_destaque && (
              <p className={`mt-5 text-[11px] font-bold uppercase tracking-[0.16em] ${estiloVisual === "urbano" ? "text-white/55" : "text-[var(--accent)]"}`}>
                {c.faixa_destaque}
              </p>
            )}
            <h1 style={serif} className={`mt-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.4rem] ${estiloVisual === "urbano" ? "text-white" : ""}`}>
              {c.titulo || site.empresa}
            </h1>
            {c.subtitulo && <p className={`mt-5 max-w-xl text-[16.5px] leading-relaxed ${estiloVisual === "urbano" ? "text-white/70" : "text-[var(--muted)]"}`}>{c.subtitulo}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={isRestaurante && waReserva ? waReserva : "#agendar"} target={isRestaurante && waReserva ? "_blank" : undefined} rel={isRestaurante && waReserva ? "noreferrer" : undefined} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-[14.5px] font-semibold text-[var(--accent-ink)] shadow-[0_12px_30px_-12px_var(--accent)] hover:opacity-90">
                <Calendar className="h-4 w-4" /> {isRestaurante ? "Reserve já" : "Agendar pelo WhatsApp"}
              </a>
              <a href={linkRota} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--surface)] px-6 py-3.5 text-[14.5px] font-semibold hover:border-black/25">
                <Navigation className="h-4 w-4" /> Como chegar
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/[0.06] bg-[var(--surface)] p-6 shadow-[0_30px_60px_-35px_rgba(0,0,0,0.35)]">
            {fotoDestaque && (
              <div className="mb-5 overflow-hidden rounded-2xl">
                <img
                  src={fotoDestaque.origem === "site_oficial"
                    ? fotoDestaque.url
                    : `/api/google-place-photo?name=${encodeURIComponent(fotoDestaque.name)}`}
                  alt={`Foto real de ${site.empresa}`}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  className="h-56 w-full object-cover sm:h-64"
                />
                <p className="bg-[var(--soft)] px-3 py-1.5 text-[10px] text-[var(--muted)]">
                  Imagem {fotoDestaque.origem === "site_oficial" ? "do site oficial" : "do perfil no Google"}
                </p>
              </div>
            )}
            {site.nota_google != null && (
              <div className="border-b border-black/[0.06] pb-5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`h-5 w-5 ${i <= Math.round(site.nota_google) ? "fill-[#FBBC05] text-[#FBBC05]" : "text-black/15"}`} />
                  ))}
                </div>
                <p className="mt-2 text-[14px]">
                  <strong style={serif} className="text-[26px]">{String(site.nota_google).replace(".", ",")}</strong>{" "}
                  <span className="text-[var(--muted)]">no Google · {site.total_avaliacoes || 0} avaliações</span>
                </p>
              </div>
            )}
            <ul className="space-y-3.5 pt-5 text-[14px]">
              {(site.endereco || local) && (
                <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" /><span>{site.endereco || local}</span></li>
              )}
              {site.telefone && (
                <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" /><a href={`tel:${site.telefone.replace(/\D/g, "")}`} className="hover:underline">{site.telefone}</a></li>
              )}
              <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" /><span>{site.horario || "Horários e disponibilidade pelo WhatsApp"}</span></li>
              {site.instagram && (
                <li className="flex gap-3"><Instagram className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" /><a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noreferrer" className="hover:underline">@{site.instagram}</a></li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {fotosGaleria.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-6 pt-2">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Conheça o espaço</p>
              <h2 style={serif} className="mt-1 text-2xl font-bold">Fotos reais do estabelecimento</h2>
            </div>
            <span className="text-xs text-[var(--muted)]">Site oficial e perfil no Google</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {fotosGaleria.map((foto, index) => (
              <figure key={foto.url || foto.name} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--surface)] shadow-sm">
                <img
                  src={foto.origem === "site_oficial"
                    ? foto.url
                    : `/api/google-place-photo?name=${encodeURIComponent(foto.name)}`}
                  alt={`Foto real ${index + 1} de ${site.empresa}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-36 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-48"
                />
                {foto.origem === "google" && foto.autor && (
                  <figcaption className="px-2.5 py-2 text-[10px] text-[var(--muted)]">
                    Foto: {foto.autor_uri ? <a href={foto.autor_uri} target="_blank" rel="noreferrer" className="underline">{foto.autor}</a> : foto.autor}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {c.servicos?.length > 0 && (
        <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Serviços</p>
          <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">O que fazemos por você</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.servicos.map((s) => {
              const Icone = ICONES[s.icone] || CheckCircle2;
              return (
                <div key={s.nome} className="group rounded-2xl border border-black/[0.06] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(0,0,0,0.4)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--soft)] text-[var(--accent)]">
                    <Icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[16.5px] font-semibold">{s.nome}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{s.descricao}</p>
                  {(s.preco || s.duracao) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.preco && <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent)]">{s.preco}</span>}
                      {s.duracao && <span className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-medium text-[var(--muted)]">{s.duracao}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {c.profissionais?.length > 0 && (
        <section id="equipe" className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Nossa equipe</p>
            <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">Profissionais que cuidam de você</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.profissionais.map((profissional) => (
              <article key={profissional.nome} className="rounded-2xl border border-black/[0.06] bg-[var(--surface)] p-5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--soft)] text-lg font-bold text-[var(--accent)]">
                  {profissional.nome.trim().charAt(0).toUpperCase()}
                </span>
                <h3 className="mt-4 text-[16px] font-bold">{profissional.nome}</h3>
                {profissional.especialidade && <p className="mt-1 text-[12px] font-semibold text-[var(--accent)]">{profissional.especialidade}</p>}
                {profissional.descricao && <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{profissional.descricao}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {isRestaurante && c.cardapio?.length > 0 && (
        <section id="cardapio" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Cardápio</p>
          <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">Conheça nossas opções</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.cardapio.map((item, index) => (
              <article key={`${item.nome}-${index}`} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--surface)]">
                {item.imagem_url && <img src={item.imagem_url} alt={item.nome} loading="lazy" className="h-44 w-full object-cover" />}
                <div className="p-5">
                  {item.categoria && <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">{item.categoria}</p>}
                  <h3 className="mt-1 text-[16px] font-semibold">{item.nome}</h3>
                  {item.descricao && <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted)]">{item.descricao}</p>}
                  {item.preco && <p className="mt-3 font-bold text-[var(--accent)]">{item.preco}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="sobre" className="scroll-mt-20 bg-[var(--dark)] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/50">Sobre nós</p>
            <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">{site.empresa}</h2>
            {(c.sobre || "").split(/\n\n+/).map((p, i) => (
              <p key={i} className="mt-4 text-[15px] leading-relaxed text-white/70">{p}</p>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(c.diferenciais || []).map((d) => (
              <div key={d.titulo} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <CheckCircle2 className="h-5 w-5" style={{ color: t.accent === "#1f1f1f" ? t.accentInk : t.soft }} />
                <p className="mt-3 text-[15px] font-semibold">{d.titulo}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="agendar" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{isRestaurante ? "Reservas" : "Agendamento"}</p>
            <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">{isRestaurante ? "Reserve já pelo WhatsApp" : "Agende em poucos cliques"}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
              {c.chamada_agendamento || "Escolha o serviço e o melhor dia. Sua solicitação chega direto no nosso WhatsApp."}
            </p>
            <p className="mt-5 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> A confirmação do horário é feita pelo WhatsApp.
            </p>
          </div>
          <Agendamento site={site} wa={wa} isRestaurante={isRestaurante} waReserva={waReserva} />
        </div>
      </section>

      <section id="localizacao" className="scroll-mt-20 border-t border-black/[0.06] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Localização</p>
            <h2 style={serif} className="mt-2 text-[2rem] font-bold leading-tight">Venha nos visitar</h2>
            <p className="mt-3 flex gap-2 text-[15px] leading-relaxed text-[var(--muted)]">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" /> {site.endereco || local || "Endereço pelo WhatsApp"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={linkRota} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-[14px] font-semibold text-[var(--accent-ink)] hover:opacity-90">
                <Navigation className="h-4 w-4" /> Abrir no Google Maps
              </a>
              {site.place_id && (
                <a href={`https://search.google.com/local/writereview?placeid=${encodeURIComponent(site.place_id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-3 text-[14px] font-semibold hover:border-black/25">
                  <Star className="h-4 w-4" /> Avaliar no Google
                </a>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-black/[0.08] shadow-[0_30px_60px_-40px_rgba(0,0,0,0.5)]">
            <iframe
              title={`Mapa de ${site.empresa}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(consultaMapa)}&output=embed`}
              className="h-[340px] w-full border-0 md:h-[400px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {c.perguntas?.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 py-16">
          <h2 style={serif} className="text-center text-[2rem] font-bold leading-tight">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {c.perguntas.map((p) => (
              <details key={p.pergunta} className="group rounded-2xl border border-black/[0.07] bg-[var(--surface)] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                  {p.pergunta}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)] transition group-open:rotate-180" />
                </summary>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--muted)]">{p.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <footer className="bg-[var(--dark)] px-5 py-8 text-center text-[12.5px] text-white/55">
        <p style={serif} className="text-[16px] font-bold text-white">{site.empresa}</p>
        {local && <p className="mt-1">{local}</p>}
        <p className="mt-4 text-white/35">Site criado por Google NFC Connect</p>
      </footer>

      {waOla && (
        <a
          href={waOla}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.7)] hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}

function Agendamento({ site, wa, isRestaurante = false, waReserva = "" }) {

  const servicos = useMemo(() => (site.conteudo?.servicos || []).map((s) => s.nome), [site]);
  const [f, setF] = useState({ nome: "", servico: servicos[0] || "", data: "", periodo: PERIODOS[0], obs: "" });
  const [erro, setErro] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function enviar(e) {
    e.preventDefault();
    if (f.nome.trim().length < 2) return setErro("Informe seu nome.");
    if (!f.data) return setErro("Escolha o dia.");
    const [a, m, d] = f.data.split("-");
    const texto = [
      `Olá, ${site.empresa}! Gostaria de agendar um horário.`,
      "",
      `*Nome:* ${f.nome.trim()}`,
      f.servico ? `*Serviço:* ${f.servico}` : null,
      `*Dia:* ${d}/${m}/${a}`,
      `*Período:* ${f.periodo}`,
      f.obs.trim() ? `*Observação:* ${f.obs.trim()}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const link = wa(texto);
    if (!link) return setErro("O WhatsApp desta empresa ainda não foi configurado.");
    setErro("");
    window.open(link, "_blank", "noopener");
  }

  const campo = "w-full rounded-xl border border-black/10 bg-[var(--bg)] px-3.5 py-3 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";

  if (isRestaurante) {
    return (
      <div className="flex flex-col justify-center rounded-[28px] border border-black/[0.06] bg-[var(--surface)] p-8 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
        <p className="text-[15px] leading-relaxed text-[var(--muted)]">Entre em contato pelo WhatsApp para fazer sua reserva e confirmar a disponibilidade.</p>
        {waReserva ? (
          <a href={waReserva} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-[15px] font-semibold text-[#062b14] hover:brightness-95">
            <MessageCircle className="h-5 w-5" /> Reserve já pelo WhatsApp
          </a>
        ) : <p className="mt-5 text-[13px] text-[var(--muted)]">O WhatsApp ainda não foi informado pela empresa.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-[28px] border border-black/[0.06] bg-[var(--surface)] p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.4)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-[12.5px] font-semibold text-[var(--muted)]">Seu nome</span>
          <input value={f.nome} onChange={set("nome")} className={`${campo} mt-1.5`} placeholder="Como podemos te chamar?" />
        </label>
        {servicos.length > 0 && (
          <label className="sm:col-span-2">
            <span className="text-[12.5px] font-semibold text-[var(--muted)]">Serviço</span>
            <select value={f.servico} onChange={set("servico")} className={`${campo} mt-1.5`}>
              {servicos.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="Outro / quero conversar">Outro / quero conversar</option>
            </select>
          </label>
        )}
        <label>
          <span className="text-[12.5px] font-semibold text-[var(--muted)]">Dia</span>
          <input type="date" min={hojeISO()} value={f.data} onChange={set("data")} className={`${campo} mt-1.5`} />
        </label>
        <label>
          <span className="text-[12.5px] font-semibold text-[var(--muted)]">Período</span>
          <select value={f.periodo} onChange={set("periodo")} className={`${campo} mt-1.5`}>
            {PERIODOS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-[12.5px] font-semibold text-[var(--muted)]">Observação (opcional)</span>
          <textarea value={f.obs} onChange={set("obs")} rows={3} className={`${campo} mt-1.5`} placeholder="Alguma preferência ou dúvida?" />
        </label>
      </div>
      {erro && <p className="mt-3 text-[13px] font-medium text-[#b42318]">{erro}</p>}
      <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-[15px] font-semibold text-[#062b14] hover:brightness-95">
        <MessageCircle className="h-5 w-5" /> Enviar agendamento pelo WhatsApp
      </button>
    </form>
  );
}
