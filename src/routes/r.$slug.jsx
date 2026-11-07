import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Instagram, Loader2, MapPin, MessageCircle, Send, ShoppingBag, UserRound } from "lucide-react";
import { contatoRepresentanteFn, paginaRepresentanteFn } from "@/lib/landing-representante-fns";
import { indicacao } from "@/lib/indicacao";
import { SERVICES, BRAND_NAME } from "@/lib/site-content";

export const Route = createFileRoute("/r/$slug")({
  loader: ({ params }) => paginaRepresentanteFn({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const p = loaderData?.perfil;
    if (!p) return { meta: [{ title: "Representante não encontrado — Google NFC Connect" }, { name: "robots", content: "noindex" }] };
    const descricao = (p.bio || `${p.nome}, ${p.titulo} do Google NFC Connect${p.cidade ? ` em ${p.cidade}` : ""}.`).slice(0, 160);
    return {
      meta: [
        { title: `${p.nome} — ${p.titulo} | Google NFC Connect` },
        { name: "description", content: descricao },
        { property: "og:title", content: `${p.nome} — Google NFC Connect` },
        { property: "og:description", content: descricao },
        ...(p.foto ? [{ property: "og:image", content: p.foto }] : []),
      ],
    };
  },
  component: PaginaRepresentante,
});

function waLink(numero, texto) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function PaginaRepresentante() {
  const dados = Route.useLoaderData();
  const perfil = dados?.perfil;

  useEffect(() => {
    if (perfil) indicacao.salvar(perfil);
  }, [perfil]);

  if (!perfil) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="glass-card max-w-md rounded-2xl p-8 text-center">
          <UserRound className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-heading text-xl font-bold text-white">Representante não encontrado</h1>
          <p className="mt-2 text-[13px] text-white/55">Este link não está ativo no momento.</p>
          <Link to="/" className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-[#0a1128]">
            Ir para o site
          </Link>
        </div>
      </div>
    );
  }

  const primeiroNome = perfil.nome.split(" ")[0];
  const msg = `Olá, ${primeiroNome}! Vi sua página no Google NFC Connect e quero saber mais.`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/[0.07] bg-[#070d1c]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#ffd97a] to-[#e0a12c] font-heading text-[13px] font-extrabold text-[#0a1128]">
              N
            </span>
            <span className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-white">{BRAND_NAME}</span>
          </Link>
          <Link to="/loja" className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 hover:text-white">
            <ShoppingBag className="h-3.5 w-3.5" /> Loja
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="aurora absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 md:flex-row md:text-left lg:py-20">
          <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full border-4 border-primary/40 bg-white/5 shadow-[0_20px_60px_-20px_rgba(255,194,74,0.6)] sm:h-44 sm:w-44">
            {perfil.foto ? (
              <img src={perfil.foto} alt={perfil.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center font-heading text-5xl font-extrabold text-primary">
                {perfil.nome.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">{perfil.titulo}</p>
            <h1 className="mt-3 font-heading text-[2.1rem] font-extrabold leading-[1.08] text-white sm:text-[2.8rem]">{perfil.nome}</h1>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-[12.5px] text-white/50 md:justify-start">
              {perfil.cidade && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {perfil.cidade}</span>
              )}
              {perfil.instagram && (
                <a href={`https://instagram.com/${perfil.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                  <Instagram className="h-3.5 w-3.5" /> @{perfil.instagram}
                </a>
              )}
            </div>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-white/65">
              {perfil.bio ||
                `Sou representante oficial do Google NFC Connect. Ajudo empresas a aparecerem no Google Maps, a cuidar do perfil todo mês e a receber mais avaliações com a placa NFC.`}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              {perfil.whatsapp && (
                <a href={waLink(perfil.whatsapp, msg)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-bold text-[#062b14]">
                  <MessageCircle className="h-4 w-4" /> Falar com {primeiroNome}
                </a>
              )}
              <a href="#contato" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:border-primary/50">
                Pedir orçamento
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-heading text-2xl font-extrabold text-white">O que posso fazer pela sua empresa</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.slug} className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <span className="block h-1 w-10 rounded-full" style={{ background: s.color }} />
              <p className="mt-4 font-heading text-base font-bold text-white">{s.title}</p>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-white/55">{s.short}</p>
              <ul className="mt-3 space-y-1.5">
                {(s.features || []).slice(0, 3).map((f) => (
                  <li key={f} className="flex gap-2 text-[12px] text-white/50">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:flex-row sm:items-center">
          <p className="text-[13.5px] text-white/70">
            Prefere comprar direto? As placas NFC compradas pela loja a partir desta página são atendidas por {primeiroNome}.
          </p>
          <Link to="/loja" className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-2.5 text-sm font-bold text-[#0a1128]">
            Ver placas na loja <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section id="contato" className="border-t border-white/[0.06] bg-[#050a15] py-14">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <FormularioContato slug={perfil.slug} nome={primeiroNome} />
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-6 text-center text-[11.5px] text-white/35">
        {perfil.nome} · Representante oficial {BRAND_NAME} ·{" "}
        <Link to="/seja-representante" className="hover:text-white">Seja um representante</Link>
      </footer>

      {perfil.whatsapp && (
        <a
          href={waLink(perfil.whatsapp, msg)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Falar com ${primeiroNome} no WhatsApp`}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-[#062b14] shadow-[0_18px_45px_-16px_rgba(37,211,102,0.9)]"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </div>
  );
}

const VAZIO = { nome: "", empresa: "", email: "", telefone: "", cidade: "", servico: "nao_sei", mensagem: "", website: "" };

function FormularioContato({ slug, nome }) {
  const enviar = useServerFn(contatoRepresentanteFn);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) => enviar({ data: payload }),
    onSuccess: () => {
      setEnviado(true);
      toast.success("Contato enviado!");
    },
    onError: (e) => setErro(e?.message || "Não foi possível enviar agora. Tente novamente."),
  });

  function submit(event) {
    event.preventDefault();
    setErro("");
    if (form.nome.trim().length < 2) return setErro("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErro("Informe um e-mail válido.");
    if (form.telefone.replace(/\D/g, "").length < 10) return setErro("Informe um WhatsApp com DDD.");
    mutation.mutate({ ...form, slug });
  }

  if (enviado) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h3 className="mt-4 font-heading text-lg font-bold text-white">Contato enviado</h3>
        <p className="mt-2 text-sm text-white/60">{nome} vai falar com você pelo WhatsApp informado.</p>
      </div>
    );
  }

  const input = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none";
  const rotulo = "text-[11px] font-semibold uppercase tracking-wider text-white/45";

  return (
    <form onSubmit={submit} className="glass-card rounded-2xl p-6">
      <h2 className="font-heading text-lg font-bold text-white">Peça seu orçamento com {nome}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label><span className={rotulo}>Seu nome *</span><input className={input} value={form.nome} onChange={set("nome")} /></label>
        <label><span className={rotulo}>Empresa</span><input className={input} value={form.empresa} onChange={set("empresa")} /></label>
        <label><span className={rotulo}>E-mail *</span><input type="email" className={input} value={form.email} onChange={set("email")} /></label>
        <label><span className={rotulo}>WhatsApp *</span><input className={input} value={form.telefone} onChange={set("telefone")} placeholder="(11) 90000-0000" /></label>
        <label><span className={rotulo}>Cidade</span><input className={input} value={form.cidade} onChange={set("cidade")} /></label>
        <label>
          <span className={rotulo}>Serviço</span>
          <select className={`${input} bg-[#0b1424]`} value={form.servico} onChange={set("servico")}>
            <option value="nao_sei">Ainda não sei</option>
            <option value="perfil_google">Criação de perfil no Google</option>
            <option value="gestao_perfil">Gestão mensal do perfil</option>
            <option value="placa_nfc">Placa NFC de avaliação</option>
            <option value="criacao_site">Criação de site com agendamento</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className={rotulo}>Mensagem</span>
        <textarea rows={3} className={input} value={form.mensagem} onChange={set("mensagem")} />
      </label>
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden="true" />
      {erro && <p className="mt-3 text-xs font-medium text-red-400">{erro}</p>}
      <button type="submit" disabled={mutation.isPending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-3 text-sm font-bold text-[#0a1128] disabled:opacity-60">
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {mutation.isPending ? "Enviando..." : "Enviar"}
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Ao enviar, você autoriza o contato sobre este serviço. Seus dados são usados apenas para atendimento.
      </p>
    </form>
  );
}
