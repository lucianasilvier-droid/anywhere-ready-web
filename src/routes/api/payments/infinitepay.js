import { createFileRoute } from "@tanstack/react-router";
import { ipPaymentCheck, loadProvider } from "@/lib/payments.server";
import {
  logNotification,
  syncInfinitepayPayment,
} from "@/lib/payments-flow.server";

/**
 * Webhook oficial do Checkout Integrado da InfinitePay.
 * A InfinitePay não assina o webhook: por isso o evento NUNCA é aceito como
 * prova de pagamento — consultamos o endpoint payment_check com as nossas
 * credenciais antes de liberar o pedido.
 */
export const Route = createFileRoute("/api/payments/infinitepay")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, integracao: "infinitepay" }),
      POST: async ({ request, context }) => {
        const base44 = context.getBase44().asServiceRole;
        const body = await request.json().catch(() => ({}));

        const orderNsu = String(body.order_nsu || "");
        const transactionNsu = String(body.transaction_nsu || "");
        const slug = String(body.invoice_slug || body.slug || "");
        const evento = String(body.event || body.status || "").toLowerCase();

        const log = {
          provedor: "infinitepay",
          evento: evento || "notificacao",
          referencia: orderNsu,
          transacao: transactionNsu,
          payload: body,
        };

        if (!orderNsu) {
          await logNotification(base44, { ...log, erro: "Notificação sem order_nsu." });
          return Response.json({ ok: false, erro: "order_nsu ausente" }, { status: 400 });
        }

        const busca = await base44.entities.Pagamento.filter(
          { provedor_referencia: orderNsu },
          { sort: "-created_date", limit: 1 },
        );
        const pagamento = (Array.isArray(busca) ? busca : busca?.items || [])[0] || null;

        if (!pagamento) {
          await logNotification(base44, {
            ...log,
            erro: "Nenhuma transação do sistema corresponde a este order_nsu.",
          });
          return Response.json({ ok: true, ignorado: true });
        }

        const prov = await loadProvider(base44, "infinitepay");
        if (!prov.pronto) {
          await logNotification(base44, {
            ...log,
            erro: "Credenciais da InfinitePay não estão configuradas no painel.",
          });
          return Response.json({ ok: false }, { status: 503 });
        }

        const check = await ipPaymentCheck(prov.values, {
          orderNsu,
          transactionNsu: transactionNsu || pagamento.provedor_transacao,
          slug: slug || pagamento.provedor_slug,
        });

        if (!check.ok) {
          await logNotification(base44, { ...log, erro: check.error });
          return Response.json({ ok: false, erro: check.error }, { status: 400 });
        }

        if (check.paid) {
          const resultado = await syncInfinitepayPayment(base44, pagamento, check, "webhook", {
            transactionNsu,
            slug,
            receiptUrl: body.receipt_url || "",
          });
          await logNotification(base44, {
            ...log,
            assinatura_valida: true,
            processado: true,
            status_aplicado: resultado.status || "aprovado",
          });
          return Response.json({ ok: true, alterado: !!resultado.changed });
        }

        // A notificação da InfinitePay não é assinada. payment_check confirma
        // pagamento, mas não comprova estorno/cancelamento. Nunca altere status
        // final apenas com base no texto do evento recebido.
        await logNotification(base44, {
          ...log,
          assinatura_valida: true,
          processado: true,
          status_aplicado: "pendente",
        });
        return Response.json({ ok: true, pago: false });
      },
    },
  },
});