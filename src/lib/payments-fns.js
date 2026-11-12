import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  PAYMENT_PROVIDERS,
  loadProvider,
  maskValue,
  mpRefund,
  saveProviderCredentials,
  setProviderEnabled,
  testPaymentProvider,
} from "@/lib/payments.server";
import {
  METODOS_PAGAMENTO,
  applyPaymentStatus,
  baseUrl,
  createPaymentForOrder,
  findPaymentByCode,
  paymentMethodsState,
  publicPaymentView,
  refreshPaymentStatus,
  saveActiveMethod,
  verifyReturn,
} from "@/lib/payments-flow.server";

const TIPOS = ["mercadopago", "infinitepay"];
const METODO_IDS = [...Object.keys(METODOS_PAGAMENTO), "desativado"];

function requireAdmin(context) {
  if (context.user?.role !== "admin") {
    setResponseStatus(403);
    throw Object.assign(new Error("Apenas administradores podem executar esta ação."), { status: 403 });
  }
}

const tipoSchema = z.object({ tipo: z.enum(["mercadopago", "infinitepay"]) });

/* --------------------------------- Painel -------------------------------- */

export const paymentSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const base44 = context.getBase44();
    const base = baseUrl();

    const providers = [];
    for (const tipo of TIPOS) {
      const prov = await loadProvider(base44, tipo);
      providers.push({
        tipo,
        nome: prov.def.nome,
        ativo: prov.ativo,
        pronto: prov.pronto,
        status: prov.status,
        mensagem: prov.mensagem,
        ultimo_teste: prov.ultimo_teste,
        ambiente: prov.ambiente,
        webhook_url: `${base}/api/payments/${tipo === "mercadopago" ? "mercadopago" : "infinitepay"}`,
        campos: Object.entries(prov.def.campos).map(([campo, cfg]) => ({
          campo,
          label: cfg.label,
          obrigatorio: !!cfg.obrigatorio,
          preenchido: !!prov.values[campo],
          origem: prov.origem[campo],
          mascara: maskValue(prov.values[campo]),
        })),
      });
    }

    const estado = await paymentMethodsState(base44);
    return {
      providers,
      metodoSelecionado: estado.metodoSelecionado,
      metodos: estado.metodos,
      ativo: estado.ativo,
    };
  });

export const savePaymentProviderFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      tipo: z.enum(["mercadopago", "infinitepay"]),
      valores: z.record(z.string(), z.string().max(600)).optional().default({}),
      ambiente: z.enum(["teste", "producao"]).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const permitidos = Object.keys(PAYMENT_PROVIDERS[data.tipo].campos);
    const valores = {};
    for (const campo of permitidos) {
      if (campo in (data.valores || {})) valores[campo] = data.valores[campo];
    }
    const resultado = await saveProviderCredentials(base44, data.tipo, valores, {
      ambiente: data.ambiente,
    });
    await base44.entities.AtividadeLog.create({
      acao: "Credenciais de pagamento salvas",
      entidade: "Integracao",
      detalhe: `${PAYMENT_PROVIDERS[data.tipo].nome} · ${resultado.alterados} campo(s) alterado(s)`,
      autor_email: context.user.email,
    });
    return resultado;
  });

export const testPaymentProviderFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(tipoSchema)
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const resultado = await testPaymentProvider(base44, data.tipo);
    const prov = await loadProvider(base44, data.tipo);
    const patch = {
      status: resultado.status,
      mensagem: resultado.mensagem,
      ultimo_teste: new Date().toISOString(),
    };
    if (prov.registro) await base44.entities.Integracao.update(prov.registro.id, patch);
    else
      await base44.entities.Integracao.create({
        ...patch,
        tipo: data.tipo,
        nome: PAYMENT_PROVIDERS[data.tipo].nome,
        ativo: false,
      });
    await base44.entities.AtividadeLog.create({
      acao: `Teste de integração de pagamento: ${data.tipo}`,
      entidade: "Integracao",
      detalhe: `${resultado.status} · ${resultado.mensagem}`,
      autor_email: context.user.email,
    });
    return { ...resultado, ultimo_teste: patch.ultimo_teste };
  });

export const togglePaymentProviderFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ tipo: z.enum(["mercadopago", "infinitepay"]), ativo: z.boolean() }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    return setProviderEnabled(base44, data.tipo, data.ativo);
  });

export const setActivePaymentMethodFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ metodo: z.enum(METODO_IDS) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const resultado = await saveActiveMethod(base44, data.metodo);
    await base44.entities.AtividadeLog.create({
      acao: "Sistema de pagamento ativo alterado",
      entidade: "Configuracao",
      detalhe: data.metodo === "desativado" ? "Pagamento online desativado" : `Método ativo: ${data.metodo}`,
      autor_email: context.user.email,
    });
    return resultado;
  });

export const paymentTransactionsFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;

    const page = await base44.entities.Pagamento.list({ sort: "-created_date", limit: 200 });
    const pagamentos = Array.isArray(page) ? page : page?.items || [];

    const notificacoesPage = await base44.entities.PagamentoNotificacao.list({
      sort: "-created_date",
      limit: 100,
    });
    const notificacoes = Array.isArray(notificacoesPage)
      ? notificacoesPage
      : notificacoesPage?.items || [];

    return {
      pagamentos: pagamentos.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        pedido_numero: p.pedido_numero,
        pedido_id: p.pedido_id,
        provedor: p.provedor,
        metodo: p.metodo,
        valor: p.valor,
        status: p.status,
        status_detalhe: p.status_detalhe,
        provedor_payment_id: p.provedor_payment_id || p.provedor_transacao || "",
        erro: p.erro || "",
        criado_em: p.created_date,
        confirmado_em: p.confirmado_em || "",
        atualizado_por: p.atualizado_por || "",
        expira_em: p.expira_em || "",
        notificacoes: Number(p.notificacoes) || 0,
      })),
      notificacoes: notificacoes.map((n) => ({
        id: n.id,
        provedor: n.provedor,
        evento: n.evento || "",
        referencia: n.referencia || "",
        transacao: n.transacao || "",
        status_aplicado: n.status_aplicado || "",
        processado: !!n.processado,
        assinatura_valida: n.assinatura_valida !== false,
        erro: n.erro || "",
        criado_em: n.created_date,
      })),
    };
  });

/* ------------------------------- Checkout -------------------------------- */

export const refundPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      codigo: z.string().min(4).max(40),
      acao: z.enum(["solicitar", "concluir"]),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const svc = context.getBase44().asServiceRole;
    const pagamento = await findPaymentByCode(svc, data.codigo);
    if (!pagamento) throw Object.assign(new Error("Transação não encontrada."), { status: 404 });
    if (!["aprovado", "reembolso_solicitado"].includes(pagamento.status)) {
      throw Object.assign(
        new Error("Somente pagamentos aprovados podem ser reembolsados."),
        { status: 400 },
      );
    }

    if (data.acao === "solicitar") {
      await applyPaymentStatus(svc, pagamento, "reembolso_solicitado", {
        origem: "painel",
        detalhe: "Reembolso solicitado pelo administrador",
      });
      return { ok: true, status: "reembolso_solicitado" };
    }

    // Nunca marque como reembolsado sem confirmação do provedor.
    // A API de estorno atualmente cobre apenas pagamentos MP com ID numérico.
    if (pagamento.provedor !== "mercadopago" || !/^\d+$/.test(String(pagamento.provedor_payment_id || ""))) {
      throw Object.assign(
        new Error("O estorno automático ainda não está disponível para esta modalidade. O pagamento permanece como reembolso solicitado; conclua o estorno diretamente no provedor e atualize o registro após confirmar."),
        { status: 400 },
      );
    }

    const prov = await loadProvider(svc, "mercadopago");
    if (!prov.pronto) throw Object.assign(new Error("Mercado Pago não está configurado."), { status: 400 });
    const res = await mpRefund(prov.values, pagamento.provedor_payment_id);
    if (!res.ok) {
      await svc.entities.Pagamento.update(pagamento.id, { erro: `Reembolso recusado: ${res.error}` });
      throw Object.assign(new Error(res.error), { status: 400 });
    }

    await applyPaymentStatus(svc, pagamento, "reembolsado", {
      origem: "painel",
      detalhe: "Reembolso confirmado pelo Mercado Pago",
    });
    return { ok: true, status: "reembolsado" };
  });

export const checkoutPaymentInfoFn = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const estado = await paymentMethodsState(context.getBase44());
  return {
    ativo: estado.ativo
      ? {
          id: estado.ativo.id,
          nome: estado.ativo.nome,
          modalidade: estado.ativo.modalidade,
          descricao: estado.ativo.descricao,
        }
      : null,
  };
});

export const createCheckoutPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pedido_id: z.string().min(1).max(64),
      documento: z.string().max(24).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    return createPaymentForOrder(context.getBase44(), data.pedido_id, {
      documento: data.documento,
    });
  });

export const getPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      codigo: z.string().min(4).max(40),
      verificar: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const atual = await findPaymentByCode(base44, data.codigo);
    if (!atual) return { ok: false };

    const idade = Date.now() - new Date(atual.updated_date || 0).getTime();
    if (atual.status === "pendente" && (data.verificar || idade > 8000)) {
      const atualizado = await refreshPaymentStatus(base44, data.codigo);
      return publicPaymentView(atualizado);
    }
    return publicPaymentView(atual);
  });

export const verifyPaymentReturnFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      codigo: z.string().min(4).max(40),
      params: z.record(z.string(), z.string().max(400)).optional().default({}),
    }),
  )
  .handler(async ({ data, context }) => {
    return verifyReturn(context.getBase44().asServiceRole, data.codigo, data.params || {});
  });