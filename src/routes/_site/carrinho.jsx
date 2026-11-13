import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2, Minus, Plus, ShoppingBag, CheckCircle2, MessageCircle } from "lucide-react";
import { createOrder } from "@/lib/server-fns";
import { indicacao } from "@/lib/indicacao";
import { checkoutPaymentInfoFn, createCheckoutPaymentFn } from "@/lib/payments-fns";
import PaymentPanel from "@/components/store/PaymentPanel";
import { cart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { whatsappLink } from "@/lib/site-content";

export const Route = createFileRoute("/_site/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho e finalização — Google NFC Connect" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CarrinhoPage,
});

const vazio = {
  nome: "",
  email: "",
  telefone: "",
  cep: "",
  endereco: "",
  cidade: "",
  estado: "",
  empresa: "",
  nome_exibicao: "",
  google_link: "",
  instagram_link: "",
  observacoes: "",
  cpf: "",
};

function CarrinhoPage() {
  const navigate = useNavigate();
  const finalizar = useServerFn(createOrder);
  const infoPagamento = useServerFn(checkoutPaymentInfoFn);
  const iniciarPagamento = useServerFn(createCheckoutPaymentFn);
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState("");
  const [pedido, setPedido] = useState(null);
  const [pagamento, setPagamento] = useState(null);
  const [metodo, setMetodo] = useState(null);
  const [avisoPagamento, setAvisoPagamento] = useState("");

  useEffect(() => {
    setItens(cart.get());
    return cart.subscribe(() => setItens(cart.get()));
  }, []);

  useEffect(() => {
    let ativo = true;
    infoPagamento()
      .then((r) => {
        if (ativo) setMetodo(r?.ativo || null);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: (payload) => finalizar({ data: payload }),
    onSuccess: async (resultado) => {
      cart.clear();
      setPedido(resultado);
      toast.success(`Pedido ${resultado.numero} registrado.`);
      try {
        const resposta = await iniciarPagamento({
          data: { pedido_id: resultado.pedidoId, documento: form.cpf.replace(/\D/g, "") },
        });
        if (resposta?.ok && resposta.pagamento?.checkout_url) {
          window.location.href = resposta.pagamento.checkout_url;
          return;
        }
        if (resposta?.ok) setPagamento(resposta.pagamento);
        else setAvisoPagamento(resposta?.erro || "");
      } catch {
        setAvisoPagamento(
          "Não foi possível iniciar o pagamento online agora. O pedido foi registrado e nossa equipe combinará o pagamento com você.",
        );
      }
    },
    onError: (e) => {
      setErro(e?.message || "Não foi possível finalizar o pedido.");
      toast.error("Não foi possível finalizar o pedido.");
    },
  });

  const itensSemPreco = itens.some((item) => !(Number(item.preco) > 0));
  const subtotal = itens.reduce((s, i) => s + (Number(i.preco) > 0 ? i.preco * i.quantidade : 0), 0);
  const frete = subtotal >= 150 ? 0 : 19.9;
  const total = subtotal + frete;
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    if (!itens.length) return setErro("Seu carrinho está vazio.");
    if (itensSemPreco) return setErro("Há produto sem preço confirmado no carrinho. Remova esse item ou volte à loja para consultar o valor antes de finalizar.");
    if (form.nome.trim().length < 2) return setErro("Informe seu nome completo.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErro("Informe um e-mail válido.");
    if (form.telefone.replace(/\D/g, "").length < 10) return setErro("Informe um telefone com DDD.");
    if (form.endereco.trim().length < 3) return setErro("Informe o endereço de entrega.");
    if (form.cidade.trim().length < 2) return setErro("Informe a cidade.");
    if (form.estado.trim().length < 2) return setErro("Informe o estado.");

    mutation.mutate({
      cliente: { nome: form.nome, email: form.email, telefone: form.telefone },
      endereco: {
        cep: form.cep,
        endereco: form.endereco,
        cidade: form.cidade,
        estado: form.estado,
      },
      itens: itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      personalizacao: {
        empresa: form.empresa,
        nome_exibicao: form.nome_exibicao,
        google_link: form.google_link,
        instagram_link: form.instagram_link,
        observacoes: form.observacoes,
      },
      observacoes: form.observacoes,
      representante_ref: indicacao.ler()?.slug || "",
    });
  }

  if (pedido) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="glass-card rounded-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 font-heading text-2xl font-extrabold text-white">Pedido registrado!</h1>
          <p className="mt-2 text-sm text-white/60">
            Seu pedido <span className="font-bold text-primary">{pedido.numero}</span> foi salvo com
            total de <span className="font-semibold text-white">{brl(pedido.total)}</span>.
          </p>
          {pagamento ? (
            <div className="mt-5 text-left">
              <PaymentPanel codigo={pagamento.codigo} inicial={pagamento} />
              <p className="mt-2 text-center text-[11px] text-white/35">
                Acompanhe pelo link{" "}
                <Link
                  to="/pagamento/$codigo"
                  params={{ codigo: pagamento.codigo }}
                  className="font-mono text-primary hover:underline"
                >
                  /pagamento/{pagamento.codigo}
                </Link>
              </p>
            </div>
          ) : (
            <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-relaxed text-white/45">
              {avisoPagamento ||
                "O pagamento é combinado com a nossa equipe — nenhum pagamento foi aprovado automaticamente. Nossa produção inicia após a confirmação."}
            </p>
          )}

          {pedido.placas?.length > 0 && (
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                Endereços exclusivos das suas placas
              </p>
              <ul className="mt-2 space-y-1">
                {pedido.placas.map((codigo) => (
                  <li key={codigo}>
                    <Link
                      to="/placa/$code"
                      params={{ code: codigo }}
                      className="font-mono text-[12.5px] text-primary hover:underline"
                    >
                      /placa/{codigo}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                Esses endereços serão gravados no chip NFC da placa.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href={whatsappLink(`Olá! Acabei de fazer o pedido ${pedido.numero} e quero combinar o pagamento.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#062b14]"
            >
              <MessageCircle className="h-4 w-4" /> Falar sobre o pedido
            </a>
            <Link
              to="/conta/pedidos"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-primary/40"
            >
              Acompanhar em Minha conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold text-white">
        <ShoppingBag className="h-5 w-5 text-primary" /> Carrinho e finalização
      </h1>

      {itens.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-10 text-center">
          <p className="text-sm font-semibold text-white">Seu carrinho está vazio.</p>
          <p className="mt-1 text-[13px] text-white/50">Escolha um modelo de placa para continuar.</p>
          <button
            onClick={() => navigate({ to: "/loja" })}
            className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-[#0a1128]"
          >
            Ir para a loja
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="font-heading text-sm font-bold text-white">1. Seus dados</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input label="Nome completo *" value={form.nome} onChange={set("nome")} />
                <Input label="E-mail *" type="email" value={form.email} onChange={set("email")} />
                <Input label="Telefone / WhatsApp *" value={form.telefone} onChange={set("telefone")} placeholder="(11) 90000-0000" />
                <Input label="Empresa na placa" value={form.empresa} onChange={set("empresa")} placeholder="Nome do negócio" />
                <Input
                  label="CPF/CNPJ (opcional)"
                  value={form.cpf}
                  onChange={set("cpf")}
                  placeholder="Exigido por alguns pagamentos"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="font-heading text-sm font-bold text-white">2. Entrega</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input label="CEP" value={form.cep} onChange={set("cep")} />
                <Input label="Estado *" value={form.estado} onChange={set("estado")} placeholder="SP" />
                <div className="sm:col-span-2">
                  <Input label="Endereço completo *" value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, complemento, bairro" />
                </div>
                <Input label="Cidade *" value={form.cidade} onChange={set("cidade")} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <p className="font-heading text-sm font-bold text-white">3. Personalização da placa</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                Informe os links que serão gravados no chip NFC. Você poderá alterá-los
                depois na sua área.
              </p>
              <div className="mt-3 grid gap-3">
                <Input label="Nome exibido na placa" value={form.nome_exibicao} onChange={set("nome_exibicao")} placeholder="Ex.: Barbearia Silva" />
                <Input label="Link de avaliação do Google" value={form.google_link} onChange={set("google_link")} placeholder="https://g.page/r/..." />
                <Input label="Link do Instagram" value={form.instagram_link} onChange={set("instagram_link")} placeholder="https://instagram.com/suaempresa" />
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Observações</span>
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={set("observacoes")}
                    placeholder="Cores, logo, prazo desejado..."
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-primary/50 focus:outline-none"
                  />
                </label>
              </div>
            </section>

            {erro && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending || itensSemPreco}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-6 py-4 text-sm font-bold text-[#0a1128] disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mutation.isPending ? "Registrando pedido..." : `Finalizar pedido · ${brl(total)}`}
            </button>
            {itensSemPreco && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Um ou mais itens estão sem preço confirmado. Remova esses itens para finalizar o pedido com segurança.</p>}
            <p className="text-center text-[11px] leading-relaxed text-white/35">
              {metodo
                ? `Após finalizar, o pagamento é feito por ${metodo.nome} e a confirmação é automática. Nada é aprovado sem a confirmação do provedor.`
                : "O pedido é registrado com status “aguardando pagamento”. O pagamento é combinado diretamente com a equipe."}
            </p>
          </form>

          <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 lg:sticky lg:top-24">
            <p className="font-heading text-sm font-bold text-white">Resumo do pedido</p>
            <ul className="mt-4 space-y-3">
              {itens.map((item) => (
                <li key={item.produto_id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-white">{item.nome}</p>
                    <p className="text-[11.5px] text-white/40">{Number(item.preco) > 0 ? `${brl(item.preco)} cada` : "Preço pendente — consulte a equipe"}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cart.updateQty(item.produto_id, item.quantidade - 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-white/10 text-white/60 hover:bg-white/10"
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs text-white">{item.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => cart.updateQty(item.produto_id, item.quantidade + 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-white/10 text-white/60 hover:bg-white/10"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cart.remove(item.produto_id)}
                        className="ml-2 text-red-400/70 hover:text-red-400"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold text-white">{Number(item.preco) > 0 ? brl(item.preco * item.quantidade) : "A confirmar"}</p>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-4 text-[12.5px]">
              <Row label="Subtotal" value={itensSemPreco ? "A confirmar" : brl(subtotal)} />
              <Row label="Frete" value={frete === 0 ? "Grátis" : brl(frete)} />
              <div className="flex items-center justify-between pt-1.5">
                <span className="font-semibold text-white">Total</span>
                <span className="font-heading text-lg font-extrabold text-primary">{itensSemPreco ? "A confirmar" : brl(total)}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-white/35">Frete grátis em pedidos acima de R$ 150,00.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-primary/50 focus:outline-none"
      />
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-white/55">
      <span>{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}