import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight, BadgeDollarSign, CheckCircle2, Globe2, Link2, Loader2, LayoutDashboard, Send, Smartphone, Wallet,
} from "lucide-react";
import { inscricaoRepresentanteFn } from "@/lib/landing-representante-fns";
import { TABELA_COMISSAO } from "@/lib/comissoes";
import { PRECO_SITE } from "@/lib/preco-site";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_site/seja-representante")({
  head: () => ({
    meta: [
      { title: "Seja um representante comercial — Google NFC Connect" },
      {
        name: "description",
        content:
          "Venda perfis no Google, gestão mensal, sites e placas NFC de avaliação. Comissão de 50% nos sites e até R$ 100 nos demais serviços, página pessoal e painel próprio.",
      },
    ],
  }),
  component: SejaRepresentantePage,
});

const COMISSOES = [
  {
    titulo: TABELA_COMISSAO.perfil_google.titulo,
    valor: TABELA_COMISSAO.perfil_google.comissao,
    detalhe: `por perfil vendido (valor ao cliente ${brl(TABELA_COMISSAO.perfil_google.valor)})`,
    cor: "#4285F4",
  },
  {
    titulo: TABELA_COMISSAO.mensalidade.titulo,
    valor: TABELA_COMISSAO.mensalidade.comissao,
    detalhe: `todo mês, enquanto o cliente mantiver o plano (${brl(TABELA_COMISSAO.mensalidade.valor)}/mês)`,
    cor: "#34A853",
  },
  {
    titulo: TABELA_COMISSAO.placa.titulo,
    valor: TABELA_COMISSAO.placa.comissaoUnidade,
    detalhe: `por placa vendida (a partir de ${brl(TABELA_COMISSAO.placa.valorUnidade)})`,
    cor: "#f0ac2b",
  },
  {
    titulo: TABELA_COMISSAO.site.titulo,
    valorTexto: `${Math.round(TABELA_COMISSAO.site.percentual * 100)}%`,
    detalhe: `do valor de cada site vendido: de ${brl(PRECO_SITE.minimo * TABELA_COMISSAO.site.percentual)} a ${brl(PRECO_SITE.maximo * TABELA_COMISSAO.site.percentual)} por site (sites de ${brl(PRECO_SITE.minimo)} a ${brl(PRECO_SITE.maximo)})`,
    cor: "#22d3ee",
  },
  {
    titulo: TABELA_COMISSAO.mensalidade_site.titulo,
    valor: TABELA_COMISSAO.mensalidade_site.comissao,
    detalhe: `todo mês, enquanto o cliente mantiver o site: uma carteira vitalícia (${brl(TABELA_COMISSAO.mensalidade_site.valor)}/mês)`,
    cor: "#EA4335",
  },
];

const VANTAGENS = [
  { icon: Link2, titulo: "Página pessoal", texto: "Você recebe um link com sua foto, apresentação e WhatsApp para divulgar aos clientes." },
  { icon: LayoutDashboard, titulo: "Painel próprio", texto: "Acompanhe vendas, contatos recebidos e comissões em tempo real." },
  { icon: Wallet, titulo: "Saque das comissões", texto: "Comissão liberada após o pagamento do cliente; você solicita o saque pelo painel." },
  { icon: Smartphone, titulo: "Trabalhe de onde quiser", texto: "Sem horário fixo e sem estoque: a produção e a entrega ficam com a gente." },
];

const PASSOS = [
  "Envie sua inscrição pelo formulário abaixo.",
  "Nossa equipe analisa e aprova o seu cadastro.",
  "Você recebe o convite por e-mail e cria sua senha.",
  "Personalize sua página e comece a vender.",
];

function SejaRepresentantePage() {
  const comissaoSiteExemplo = Math.round(PRECO_SITE.base * TABELA_COMISSAO.site.percentual * 100) / 100;
  const simulacao =
    5 * TABELA_COMISSAO.perfil_google.comissao +
    5 * TABELA_COMISSAO.mensalidade.comissao +
    20 * TABELA_COMISSAO.placa.comissaoUnidade +
    2 * comissaoSiteExemplo +
    2 * TABELA_COMISSAO.mensalidade_site.comissao;
  // Comissões recorrentes: se repetem todo mês enquanto o cliente mantiver o serviço.
  const carteiraMensal = 5 * TABELA_COMISSAO.mensalidade.comissao + 2 * TABELA_COMISSAO.mensalidade_site.comissao;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="aurora absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
              Programa de representantes
            </p>
            <h1 className="mt-4 font-heading text-[2.1rem] font-extrabold leading-[1.08] text-white sm:text-[3rem]">
              Ajude empresas a serem encontradas.{" "}
              <span className="text-gradient-gold">Ganhe por cada venda.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60">
              Seja representante comercial do Google NFC Connect: ofereça perfis no Google Maps,
              gestão mensal, sites e placas NFC de avaliação aos negócios da sua região, com comissão fixa,
              página pessoal de vendas e painel próprio.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#inscricao"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-6 py-3.5 text-sm font-bold text-[#0a1128]"
              >
                Quero me inscrever
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/representante"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:border-primary/50"
              >
                Já sou representante
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              <BadgeDollarSign className="h-4 w-4 text-primary" /> Exemplo de mês
            </p>
            <ul className="mt-4 space-y-2 text-[13px] text-white/60">
              <li className="flex justify-between"><span>5 perfis no Google</span><span className="text-white">{brl(5 * TABELA_COMISSAO.perfil_google.comissao)}</span></li>
              <li className="flex justify-between"><span>5 mensalidades de perfil (todo mês)</span><span className="text-white">{brl(5 * TABELA_COMISSAO.mensalidade.comissao)}</span></li>
              <li className="flex justify-between"><span>20 placas NFC</span><span className="text-white">{brl(20 * TABELA_COMISSAO.placa.comissaoUnidade)}</span></li>
              <li className="flex justify-between"><span>2 sites de {brl(PRECO_SITE.base)}</span><span className="text-white">{brl(2 * comissaoSiteExemplo)}</span></li>
              <li className="flex justify-between"><span>2 sites administrados (todo mês)</span><span className="text-white">{brl(2 * TABELA_COMISSAO.mensalidade_site.comissao)}</span></li>
            </ul>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-white/40">Comissão no mês</p>
              <p className="font-heading text-3xl font-extrabold text-white">{brl(simulacao)}</p>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Carteira vitalícia</p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-white">
                {brl(carteiraMensal)}<span className="text-[13px] font-semibold text-white/50">/mês</span>
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                As 5 mensalidades de perfil e os 2 sites administrados continuam pagando você <strong className="text-white">todo mês</strong>,
                enquanto o cliente mantiver o serviço. Cada novo cliente soma à sua carteira: são {brl(12 * carteiraMensal)} por ano só
                com esses 7 clientes, sem precisar vender de novo.
              </p>
            </div>
            <p className="mt-3 text-[11px] text-white/35">Simulação ilustrativa. O ganho depende das suas vendas.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="font-heading text-2xl font-extrabold text-white">Tabela de comissões</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMISSOES.map((c) => (
            <div key={c.titulo} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <span className="block h-1 w-10 rounded-full" style={{ background: c.cor }} />
              <p className="mt-4 text-sm font-semibold text-white">{c.titulo}</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-white">{c.valorTexto || brl(c.valor)}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{c.detalhe}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VANTAGENS.map((v) => (
            <div key={v.titulo} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <v.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-white">{v.titulo}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{v.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="inscricao" className="border-t border-white/[0.06] bg-[#050a15] py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-white">Como funciona</h2>
            <ol className="mt-5 space-y-3">
              {PASSOS.map((p, i) => (
                <li key={p} className="flex gap-3 text-[13.5px] text-white/65">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
            <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-white/40">
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0" /> Atendemos empresas de todo o Brasil. Você
              pode vender na sua cidade ou de forma online.
            </p>
          </div>
          <FormularioInscricao />
        </div>
      </section>
    </div>
  );
}

const VAZIO = { nome: "", email: "", telefone: "", cidade: "", experiencia: "nenhuma", mensagem: "", website: "" };

function FormularioInscricao() {
  const enviar = useServerFn(inscricaoRepresentanteFn);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) => enviar({ data: payload }),
    onSuccess: () => {
      setEnviado(true);
      toast.success("Inscrição enviada!");
    },
    onError: (e) => setErro(e?.message || "Não foi possível enviar agora. Tente novamente."),
  });

  function submit(event) {
    event.preventDefault();
    setErro("");
    if (form.nome.trim().length < 2) return setErro("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErro("Informe um e-mail válido.");
    if (form.telefone.replace(/\D/g, "").length < 10) return setErro("Informe um WhatsApp com DDD.");
    if (form.cidade.trim().length < 2) return setErro("Informe sua cidade.");
    mutation.mutate(form);
  }

  if (enviado) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h3 className="mt-4 font-heading text-lg font-bold text-white">Inscrição recebida</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/60">
          Nossa equipe vai analisar seu cadastro. Quando aprovado, você recebe um convite no e-mail
          {" "}<strong className="text-white">{form.email}</strong> para acessar o seu painel.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card rounded-2xl p-6">
      <h3 className="font-heading text-lg font-bold text-white">Inscreva-se como representante</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Campo label="Nome completo *" value={form.nome} onChange={set("nome")} />
        <Campo label="E-mail *" type="email" value={form.email} onChange={set("email")} />
        <Campo label="WhatsApp *" value={form.telefone} onChange={set("telefone")} placeholder="(11) 90000-0000" />
        <Campo label="Cidade / estado *" value={form.cidade} onChange={set("cidade")} />
      </div>
      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Experiência</span>
        <select
          value={form.experiencia}
          onChange={set("experiencia")}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1424] px-3.5 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
        >
          <option value="nenhuma">Nunca trabalhei com vendas</option>
          <option value="vendas">Já trabalho com vendas</option>
          <option value="marketing">Trabalho com marketing digital</option>
          <option value="autonomo">Sou autônomo / tenho empresa</option>
        </select>
      </label>
      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Conte um pouco sobre você</span>
        <textarea
          value={form.mensagem}
          onChange={set("mensagem")}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
        />
      </label>
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden="true" />
      {erro && <p className="mt-3 text-xs font-medium text-red-400">{erro}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-3 text-sm font-bold text-[#0a1128] disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {mutation.isPending ? "Enviando..." : "Enviar inscrição"}
      </button>
    </form>
  );
}

function Campo({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
      />
    </label>
  );
}
