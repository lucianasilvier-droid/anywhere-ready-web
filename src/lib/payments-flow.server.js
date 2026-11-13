import { getRequest } from "@tanstack/react-start/server";
import { confirmarVendaDoPedido } from "@/lib/representantes.server";
import { appUrl } from "@/lib/env.server";
import {
  ipCreateLink,
  ipPaymentCheck,
  loadProvider,
  mapMercadoPagoStatus,
  mpCreatePix,
  mpCreatePreference,
  mpGetPayment,
} from "@/lib/payments.server";

export const METODOS_PAGAMENTO = {
  pix_mercadopago: {
    id: "pix_mercadopago",
    nome: "PIX via Mercado Pago",
    provedor: "mercadopago",
    modalidade: "pix",
    descricao: "QR Code e código PIX copia e cola, com confirmação automática do Mercado Pago.",
  },
  checkout_mercadopago: {
    id: "checkout_mercadopago",
    nome: "Mercado Pago (cartão e outras modalidades)",
    provedor: "mercadopago",
    modalidade: "checkout",
    descricao: "O cliente é levado ao checkout oficial do Mercado Pago para pagar.",
  },
  checkout_infinitepay: {
    id: "checkout_infinitepay",
    nome: "InfinitePay (PIX e cartão em até 12x)",
    provedor: "infinitepay",
    modalidade: "checkout",
    descricao: "O cliente é levado ao checkout oficial da InfinitePay para pagar.",
  },
};

const CHAVE_CONFIG = "sistema_pagamento_ativo";
const STATUS_FINAIS = ["aprovado", "reembolsado"];

export function baseUrl() {
  try {
    const req = getRequest();
    const host = req?.headers?.get("x-forwarded-host") || req?.headers?.get("host");
    const proto = req?.headers?.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* fora de uma requisição */
  }
  return appUrl();
}

export function makePaymentCode() {
  const raw = (globalThis.crypto?.randomUUID?.() || String(Math.random()))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return `PG${raw.slice(0, 10)}`;
}

/* ----------------------- Método de pagamento ativo ------------------------ */

export async function readActiveMethodId(base44) {
  const svc = base44?.asServiceRole || base44;
  const page = await svc.entities.Configuracao.filter({ chave: CHAVE_CONFIG }, { limit: 1 });
  const registro = (Array.isArray(page) ? page : page?.items || [])[0] || null;
  return { registro, metodo: String(registro?.valor || "").trim() };
}

export async function paymentMethodsState(base44) {
  const svc = base44?.asServiceRole || base44;
  const { metodo } = await readActiveMethodId(svc);
  const cache = {};
  const metodos = [];
  for (const m of Object.values(METODOS_PAGAMENTO)) {
    const prov = cache[m.provedor] || (cache[m.provedor] = await loadProvider(svc, m.provedor));
    metodos.push({
      id: m.id,
      nome: m.nome,
      provedor: m.provedor,
      provedorNome: prov.def.nome,
      modalidade: m.modalidade,
      descricao: m.descricao,
      configurado: prov.pronto,
      habilitado: prov.pronto && prov.ativo,
      selecionado: metodo === m.id,
      ativo: metodo === m.id && prov.pronto && prov.ativo,
    });
  }
  return {
    metodoSelecionado: metodo,
    metodos,
    ativo: metodos.find((m) => m.ativo) || null,
  };
}

export async function saveActiveMethod(base44, metodoId) {
  const svc = base44?.asServiceRole || base44;
  const { registro } = await readActiveMethodId(svc);

  if (metodoId && metodoId !== "desativado") {
    const definido = METODOS_PAGAMENTO[metodoId];
    if (!definido) throw Object.assign(new Error("Método de pagamento inválido."), { status: 400 });
    const prov = await loadProvider(svc, definido.provedor);
    if (!prov.pronto) {
      throw Object.assign(
        new Error(`Configure as credenciais do ${prov.def.nome} antes de ativar esta opção.`),
        { status: 400 },
      );
    }
    if (!prov.ativo) {
      throw Object.assign(
        new Error(`A integração do ${prov.def.nome} está desativada. Ative-a antes de usar.`),
        { status: 400 },
      );
    }
  }

  const valor = metodoId === "desativado" ? "" : metodoId;
  const patch = {
    chave: CHAVE_CONFIG,
    valor,
    descricao: "Método de pagamento usado no checkout da loja",
  };
  if (registro) await svc.entities.Configuracao.update(registro.id, patch);
  else await svc.entities.Configuracao.create(patch);
  return { ok: true, metodo: valor };
}

/* --------------------------- Transações / status -------------------------- */

export async function findPaymentByCode(base44, codigo) {
  const svc = base44?.asServiceRole || base44;
  const page = await svc.entities.Pagamento.filter({ codigo: String(codigo || "").trim() }, { limit: 1 });
  return (Array.isArray(page) ? page : page?.items || [])[0] || null;
}

export function publicPaymentView(pagamento) {
  if (!pagamento) return { ok: false };
  return {
    ok: true,
    pagamento: {
      codigo: pagamento.codigo,
      status: pagamento.status,
      status_detalhe: pagamento.status_detalhe || "",
      valor: pagamento.valor,
      metodo: pagamento.metodo,
      provedor: pagamento.provedor,
      pedido_numero: pagamento.pedido_numero || "",
      qr_code: pagamento.qr_code || "",
      qr_code_base64: pagamento.qr_code_base64 || "",
      expira_em: pagamento.expira_em || "",
      checkout_url: pagamento.checkout_url || "",
      comprovante_url: pagamento.comprovante_url || "",
      erro: pagamento.erro || "",
    },
  };
}

export async function logNotification(base44, dados) {
  const svc = base44?.asServiceRole || base44;
  try {
    await svc.entities.PagamentoNotificacao.create(dados);
    if (dados.transacao) {
      const page = await svc.entities.Pagamento.filter(
        { provedor_payment_id: dados.transacao },
        { limit: 1 },
      );
      const reg = (Array.isArray(page) ? page : page?.items || [])[0];
      if (reg) {
        await svc.entities.Pagamento.update(reg.id, {
          notificacoes: (Number(reg.notificacoes) || 0) + 1,
        });
      }
    }
  } catch {
    /* o log nunca deve derrubar o webhook */
  }
}

/**
 * Aplica o status vindo do provedor. Idempotente: notificações repetidas não
 * alteram nada depois da primeira confirmação nem liberam produção de novo.
 */
export async function applyPaymentStatus(base44, pagamentoOuCodigo, novoStatus, opcoes = {}) {
  const svc = base44?.asServiceRole || base44;
  const pagamento =
    typeof pagamentoOuCodigo === "string"
      ? await findPaymentByCode(svc, pagamentoOuCodigo)
      : pagamentoOuCodigo;
  if (!pagamento) return { changed: false };

  const atual = pagamento.status || "pendente";
  const jaMesmoStatus = atual === novoStatus;
  if (atual === "reembolsado") return { changed: false, status: atual };
  if (!jaMesmoStatus && STATUS_FINAIS.includes(atual) && !["reembolsado", "reembolso_solicitado"].includes(novoStatus)) {
    return { changed: false, status: atual };
  }

  if (!jaMesmoStatus) {
    const patch = {
      status: novoStatus,
      atualizado_por: opcoes.origem || "sistema",
    };
    if (opcoes.detalhe) patch.status_detalhe = opcoes.detalhe;
    if (opcoes.erro !== undefined) patch.erro = opcoes.erro;
    if (opcoes.extra) Object.assign(patch, opcoes.extra);
    if (novoStatus === "aprovado") {
      patch.confirmado_em = new Date().toISOString();
      patch.erro = "";
    }
    await svc.entities.Pagamento.update(pagamento.id, patch);
  }

  // Reconcilia o pedido mesmo quando a notificação de pagamento é repetida.
  // Se a atualização do pedido falhar, o erro sobe para que a chamada possa ser
  // repetida; o status do pagamento não impede uma nova tentativa de conciliação.
  const pedido = await svc.entities.Pedido.get(pagamento.pedido_id).catch(() => null);
  if (pedido) {
    if (novoStatus === "aprovado" && pedido.status_pagamento !== "pago") {
      await svc.entities.Pedido.update(pedido.id, {
        status_pagamento: "pago",
        status_producao: pedido.status_producao === "aguardando" ? "em_producao" : pedido.status_producao,
        metodo_pagamento: pagamento.metodo,
      });
      await confirmarVendaDoPedido(svc, pedido);
    }
    if (novoStatus === "reembolsado" && pedido.status_pagamento !== "reembolsado") {
      await svc.entities.Pedido.update(pedido.id, { status_pagamento: "reembolsado" });
    }
    if (["recusado", "expirado", "cancelado"].includes(novoStatus) && pedido.status_pagamento === "aguardando") {
      await svc.entities.Pedido.update(pedido.id, { status_pagamento: "cancelado" });
    }
  }

  if (!jaMesmoStatus) {
    try {
      await svc.entities.AtividadeLog.create({
        acao: `Pagamento ${novoStatus}`,
        entidade: "Pagamento",
        registro_id: pagamento.id,
        detalhe: `${pagamento.pedido_numero || pagamento.pedido_id} · ${pagamento.provedor} · ${opcoes.origem || "sistema"}${opcoes.detalhe ? ` · ${opcoes.detalhe}` : ""}`,
        autor_email: "sistema",
      });
    } catch {
      /* log opcional */
    }
  }

  return { changed: !jaMesmoStatus, status: novoStatus };
}

export async function syncMercadoPagoPayment(base44, pagamento, mpPayment, origem) {
  if (!pagamento || !mpPayment) return { changed: false };
  const status = mapMercadoPagoStatus(mpPayment.status, mpPayment.status_detail);
  const valorPago = Number(mpPayment.transaction_amount || 0);

  if (status === "aprovado" && Math.abs(valorPago - Number(pagamento.valor || 0)) > 0.01) {
    await (base44?.asServiceRole || base44).entities.Pagamento.update(pagamento.id, {
      erro: `Valor confirmado (${valorPago}) diferente do valor do pedido (${pagamento.valor}). Pagamento não liberado.`,
      status_detalhe: "valor_divergente",
    });
    return { changed: false, status: pagamento.status };
  }

  return applyPaymentStatus(base44, pagamento, status, {
    origem,
    detalhe: mpPayment.status_detail || "",
    extra: {
      provedor_payment_id: mpPayment.id || pagamento.provedor_payment_id,
      qr_code: mpPayment.qr_code || pagamento.qr_code,
      qr_code_base64: mpPayment.qr_code_base64 || pagamento.qr_code_base64,
      expira_em: mpPayment.expira_em || pagamento.expira_em,
      comprovante_url: mpPayment.ticket_url || pagamento.comprovante_url,
      bruto: mpPayment.bruto || pagamento.bruto,
      erro: status === "aprovado" ? "" : pagamento.erro,
    },
  });
}

export async function syncInfinitepayPayment(base44, pagamento, check, origem, extras = {}) {
  if (!pagamento || !check?.ok) return { changed: false };
  const valorCentavos = Number(check.paid_amount || check.amount || 0);
  const valorReais = valorCentavos / 100;

  if (check.paid && valorReais + 0.01 < Number(pagamento.valor || 0)) {
    await (base44?.asServiceRole || base44).entities.Pagamento.update(pagamento.id, {
      erro: `Valor pago (${valorReais}) menor que o valor do pedido (${pagamento.valor}). Pagamento não liberado.`,
      status_detalhe: "valor_divergente",
    });
    return { changed: false, status: pagamento.status };
  }

  return applyPaymentStatus(base44, pagamento, check.paid ? "aprovado" : "pendente", {
    origem,
    detalhe: check.capture_method ? `Método: ${check.capture_method}` : "",
    extra: {
      provedor_transacao: extras.transactionNsu || pagamento.provedor_transacao || "",
      provedor_slug: extras.slug || pagamento.provedor_slug || "",
      comprovante_url: extras.receiptUrl || pagamento.comprovante_url || "",
      bruto: check.bruto || pagamento.bruto,
    },
  });
}

/** Consulta o provedor e devolve o registro atualizado (nunca confia no navegador). */
export async function refreshPaymentStatus(base44, codigo) {
  const svc = base44?.asServiceRole || base44;
  const pagamento = await findPaymentByCode(svc, codigo);
  if (!pagamento || pagamento.status !== "pendente") return pagamento;

  const prov = await loadProvider(svc, pagamento.provedor);
  if (!prov.pronto) return pagamento;

  if (pagamento.provedor === "mercadopago" && pagamento.provedor_payment_id) {
    const res = await mpGetPayment(prov.values, pagamento.provedor_payment_id);
    if (res.ok) await syncMercadoPagoPayment(svc, pagamento, res.payment, "consulta");
  }

  if (pagamento.provedor === "infinitepay" && pagamento.provedor_transacao && pagamento.provedor_slug) {
    const res = await ipPaymentCheck(prov.values, {
      orderNsu: pagamento.provedor_referencia,
      transactionNsu: pagamento.provedor_transacao,
      slug: pagamento.provedor_slug,
    });
    if (res.ok) {
      await syncInfinitepayPayment(svc, pagamento, res, "consulta", {
        transactionNsu: pagamento.provedor_transacao,
        slug: pagamento.provedor_slug,
      });
    }
  }

  return findPaymentByCode(svc, codigo);
}

/* ------------------------------- Criação --------------------------------- */

async function reutilizavel(svc, pagamento) {
  if (!pagamento || pagamento.status !== "pendente") return false;
  if (pagamento.metodo === "pix_mercadopago") {
    if (pagamento.expira_em && new Date(pagamento.expira_em).getTime() < Date.now()) return false;
    return !!pagamento.qr_code;
  }
  return !!pagamento.checkout_url;
}

export async function createPaymentForOrder(base44, pedidoId, { documento } = {}) {
  const svc = base44?.asServiceRole || base44;
  const pedido = await svc.entities.Pedido.get(pedidoId);

  if (pedido.status_pagamento === "pago") {
    return { ok: true, jaPago: true, pedidoNumero: pedido.numero };
  }

  const estado = await paymentMethodsState(svc);
  const metodo = estado.ativo;
  if (!metodo) {
    return {
      ok: false,
      semProvedor: true,
      erro:
        "Nenhum meio de pagamento online está ativo no momento. O pedido foi registrado e a equipe combinará o pagamento com você.",
    };
  }

  const definicao = METODOS_PAGAMENTO[metodo.id];
  const prov = await loadProvider(svc, definicao.provedor);

  const anteriores = await svc.entities.Pagamento.filter(
    { pedido_id: pedido.id, metodo: metodo.id },
    { sort: "-created_date", limit: 5 },
  );
  const lista = Array.isArray(anteriores) ? anteriores : anteriores?.items || [];
  for (const item of lista) {
    if (await reutilizavel(svc, item)) {
      return { ok: true, ...publicPaymentView(item) };
    }
  }

  const codigo = makePaymentCode();
  const base = baseUrl();
  const registro = await svc.entities.Pagamento.create({
    codigo,
    pedido_id: pedido.id,
    pedido_numero: pedido.numero || "",
    cliente_email: pedido.cliente_email || "",
    provedor: definicao.provedor,
    metodo: metodo.id,
    valor: Number(pedido.total) || 0,
    status: "pendente",
    status_detalhe: "aguardando_pagamento",
    provedor_referencia: pedido.numero || codigo,
    atualizado_por: "sistema",
  });

  const falha = async (mensagem) => {
    await svc.entities.Pagamento.update(registro.id, {
      erro: mensagem,
      status_detalhe: "erro_ao_criar",
    });
    return { ok: false, erro: mensagem, codigo };
  };

  if (metodo.id === "pix_mercadopago") {
    const res = await mpCreatePix(prov.values, {
      valor: pedido.total,
      descricao: `Pedido ${pedido.numero}`,
      referencia: pedido.numero,
      notificationUrl: `${base}/api/payments/mercadopago`,
      idempotencyKey: codigo,
      payer: {
        nome: pedido.cliente_nome,
        email: pedido.cliente_email,
        documento,
      },
    });
    if (!res.ok) return falha(res.error);

    await svc.entities.Pagamento.update(registro.id, {
      provedor_payment_id: res.payment.id,
      status: "pendente",
      status_detalhe: res.payment.status_detail || "aguardando_pagamento",
      qr_code: res.payment.qr_code,
      qr_code_base64: res.payment.qr_code_base64,
      expira_em: res.payment.expira_em,
      comprovante_url: res.payment.ticket_url,
      bruto: res.payment.bruto,
      erro: "",
    });
    await applyPaymentStatus(svc, codigo, mapMercadoPagoStatus(res.payment.status, res.payment.status_detail), {
      origem: "criacao",
      detalhe: res.payment.status_detail || "",
    });
    const atualizado = await findPaymentByCode(svc, codigo);
    return { ok: true, ...publicPaymentView(atualizado) };
  }

  if (metodo.id === "checkout_mercadopago") {
    const res = await mpCreatePreference(prov.values, {
      valor: pedido.total,
      descricao: `Pedido ${pedido.numero}`,
      referencia: pedido.numero,
      notificationUrl: `${base}/api/payments/mercadopago`,
      backUrl: `${base}/pagamento/${codigo}`,
    });
    if (!res.ok) return falha(res.error);

    await svc.entities.Pagamento.update(registro.id, {
      checkout_url: res.checkout_url,
      provedor_payment_id: res.preference_id ? `pref:${res.preference_id}` : "",
      bruto: res.bruto,
      erro: "",
    });
    return { ok: true, ...(await publicPaymentView(await findPaymentByCode(svc, codigo))) };
  }

  if (metodo.id === "checkout_infinitepay") {
    const orderNsu = `${pedido.numero}-${codigo}`;
    const res = await ipCreateLink(prov.values, {
      pedido,
      orderNsu,
      redirectUrl: `${base}/pagamento/${codigo}`,
      webhookUrl: `${base}/api/payments/infinitepay`,
    });
    if (!res.ok) return falha(res.error);

    await svc.entities.Pagamento.update(registro.id, {
      checkout_url: res.checkout_url,
      provedor_referencia: orderNsu,
      bruto: res.bruto,
      erro: "",
    });
    return { ok: true, ...(await publicPaymentView(await findPaymentByCode(svc, codigo))) };
  }

  return falha("Método de pagamento não suportado.");
}

/** Confirmação pelo retorno do navegador: sempre consulta o provedor antes. */
export async function verifyReturn(base44, codigo, params = {}) {
  const svc = base44?.asServiceRole || base44;
  const pagamento = await findPaymentByCode(svc, codigo);
  if (!pagamento) return { ok: false };

  if (pagamento.provedor === "infinitepay" && params.transaction_nsu && params.slug) {
    const prov = await loadProvider(svc, "infinitepay");
    if (prov.pronto) {
      const check = await ipPaymentCheck(prov.values, {
        orderNsu: params.order_nsu || pagamento.provedor_referencia,
        transactionNsu: params.transaction_nsu,
        slug: params.slug,
      });
      if (check.ok) {
        await syncInfinitepayPayment(svc, pagamento, check, "retorno", {
          transactionNsu: params.transaction_nsu,
          slug: params.slug,
          receiptUrl: params.receipt_url || "",
        });
      }
    }
  }

  if (pagamento.provedor === "mercadopago" && (params.payment_id || params.collection_id)) {
    const prov = await loadProvider(svc, "mercadopago");
    if (prov.pronto) {
      const res = await mpGetPayment(prov.values, params.payment_id || params.collection_id);
      if (res.ok) await syncMercadoPagoPayment(svc, pagamento, res.payment, "retorno");
    }
  }

  return { ok: true, ...publicPaymentView(await findPaymentByCode(svc, codigo)) };
}