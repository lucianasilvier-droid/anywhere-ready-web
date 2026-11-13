import { createFileRoute } from "@tanstack/react-router";
import { loadProvider, mpGetPayment, verifyMercadoPagoSignature } from "@/lib/payments.server";
import { logNotification, syncMercadoPagoPayment } from "@/lib/payments-flow.server";

/**
 * Webhook oficial do Mercado Pago (tópico payment).
 * A confirmação nunca vem do corpo da notificação: consultamos a API do
 * provedor antes de liberar o pedido. Notificações repetidas são idempotentes.
 */
export const Route = createFileRoute("/api/payments/mercadopago")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, integracao: "mercadopago" }),
      POST: async ({ request, context }) => {
        const base44 = context.getBase44().asServiceRole;
        const url = new URL(request.url);
        const body = await request.json().catch(() => ({}));

        const tipo = url.searchParams.get("type") || url.searchParams.get("topic") || body?.type || "";
        const dataId =
          url.searchParams.get("data.id") || body?.data?.id || url.searchParams.get("id") || "";

        const prov = await loadProvider(base44, "mercadopago");
        const assinatura = await verifyMercadoPagoSignature({
          header: request.headers.get("x-signature"),
          requestId: request.headers.get("x-request-id"),
          dataId,
          secret: prov.values.webhook_secret,
        });

        const log = {
          provedor: "mercadopago",
          evento: String(tipo || "notificacao"),
          transacao: String(dataId || ""),
          assinatura_valida: assinatura.valido,
          payload: body,
        };

        if (!assinatura.valido) {
          await logNotification(base44, {
            ...log,
            erro: `Assinatura rejeitada: ${assinatura.motivo}. Cadastre o Webhook Secret no painel e conferir a URL.`,
          });
          return Response.json({ ok: false, erro: "assinatura_invalida" }, { status: 401 });
        }

        if (tipo !== "payment" || !dataId) {
          await logNotification(base44, { ...log, processado: true, status_aplicado: "ignorado" });
          return Response.json({ ok: true, ignorado: true });
        }

        if (!prov.pronto) {
          await logNotification(base44, {
            ...log,
            erro: "O Access Token do Mercado Pago não está configurado no painel.",
          });
          return Response.json({ ok: false }, { status: 503 });
        }

        const consulta = await mpGetPayment(prov.values, dataId);
        if (!consulta.ok) {
          await logNotification(base44, { ...log, erro: consulta.error });
          return Response.json({ ok: false, erro: consulta.error }, { status: 502 });
        }

        const referencia = consulta.payment.external_reference;

        let pagamento = null;
        const porTransacao = await base44.entities.Pagamento.filter(
          { provedor: "mercadopago", provedor_payment_id: String(dataId) },
          { limit: 1 },
        );
        pagamento = (Array.isArray(porTransacao) ? porTransacao : porTransacao?.items || [])[0] || null;

        if (!pagamento && referencia) {
          const porPedido = await base44.entities.Pagamento.filter(
            { provedor: "mercadopago", pedido_numero: String(referencia) },
            { sort: "-created_date", limit: 1 },
          );
          pagamento = (Array.isArray(porPedido) ? porPedido : porPedido?.items || [])[0] || null;
        }

        if (!pagamento) {
          await logNotification(base44, {
            ...log,
            referencia: referencia || "",
            erro: "Nenhuma transação do sistema corresponde a esta notificação.",
          });
          return Response.json({ ok: true, ignorado: true });
        }

        const resultado = await syncMercadoPagoPayment(base44, pagamento, consulta.payment, "webhook");

        await logNotification(base44, {
          ...log,
          referencia: pagamento.pedido_numero || "",
          transacao: String(dataId),
          processado: true,
          status_aplicado: resultado.status || pagamento.status,
        });

        return Response.json({ ok: true, alterado: !!resultado.changed });
      },
    },
  },
});