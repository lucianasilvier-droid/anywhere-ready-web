import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getPaymentFn, verifyPaymentReturnFn } from "@/lib/payments-fns";
import PaymentPanel from "@/components/store/PaymentPanel";

export const Route = createFileRoute("/_site/pagamento/$codigo")({
  validateSearch: (search) => search || {},
  head: () => ({ meta: [{ title: "Acompanhar pagamento — Google NFC Connect" }] }),
  component: PagamentoPage,
});

function PagamentoPage() {
  const { codigo } = Route.useParams();
  const search = Route.useSearch();
  const consultar = useServerFn(getPaymentFn);
  const verificarRetorno = useServerFn(verifyPaymentReturnFn);
  const [inicial, setInicial] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const params = Object.fromEntries(
      Object.entries(search || {}).filter(([, valor]) => typeof valor === "string"),
    );
    const temRetorno = Object.keys(params).length > 0;

    async function carregar() {
      try {
        const resposta = temRetorno
          ? await verificarRetorno({ data: { codigo, params } })
          : await consultar({ data: { codigo, verificar: true } });
        if (!cancelado && resposta?.ok) setInicial(resposta.pagamento);
      } catch {
        /* o painel abaixo tenta novamente */
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link to="/loja" className="text-[11.5px] font-semibold text-white/40 hover:text-white">
        ← Voltar para a loja
      </Link>
      <h1 className="mt-3 font-heading text-2xl font-extrabold text-white">Acompanhar pagamento</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-white/50">
        Esta página consulta o status direto no provedor de pagamento. Guarde este link para
        acompanhar a confirmação.
      </p>

      <div className="mt-5">
        {carregando && !inicial ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando o provedor...
          </div>
        ) : (
          <PaymentPanel codigo={codigo} inicial={inicial} />
        )}
      </div>
    </div>
  );
}