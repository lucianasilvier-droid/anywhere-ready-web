import { getRequest } from "@tanstack/react-start/server";
import { readSecret } from "@/lib/integrations.server";
import { appUrl } from "@/lib/env.server";

function baseUrl() {
  try {
    const req = getRequest();
    const host = req?.headers?.get("x-forwarded-host") || req?.headers?.get("host");
    if (host) return `${req.headers.get("x-forwarded-proto") || "https"}://${host}`;
  } catch {
    /* fora de uma requisição */
  }
  return appUrl();
}

/**
 * Integrações de pagamento. As credenciais digitadas no painel são guardadas
 * no registro Integracao do provedor (leitura restrita a administradores) e
 * NUNCA são devolvidas ao navegador: o painel recebe apenas máscaras.
 */
export const PAYMENT_PROVIDERS = {
  mercadopago: {
    nome: "Mercado Pago",
    campos: {
      access_token: {
        label: "Access Token",
        obrigatorio: true,
        env: "MERCADOPAGO_ACCESS_TOKEN",
      },
      public_key: {
        label: "Public Key",
        obrigatorio: false,
        env: "MERCADOPAGO_PUBLIC_KEY",
      },
      webhook_secret: {
        label: "Webhook Secret (assinatura)",
        obrigatorio: false,
        env: "MERCADOPAGO_WEBHOOK_SECRET",
      },
    },
  },
  infinitepay: {
    nome: "InfinitePay",
    campos: {
      handle: {
        label: "InfiniteTag (sem o $)",
        obrigatorio: true,
        env: "INFINITEPAY_HANDLE",
      },
      api_key: {
        label: "API Key (opcional)",
        obrigatorio: false,
        env: "INFINITEPAY_API_KEY",
      },
    },
  },
};

const PREFIX = "pag_";

export function maskValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 4) return "••••";
  return `••••••••${text.slice(-4)}`;
}

export function providerReady(tipo, values = {}) {
  const def = PAYMENT_PROVIDERS[tipo];
  if (!def) return false;
  return Object.entries(def.campos)
    .filter(([, cfg]) => cfg.obrigatorio)
    .every(([campo]) => !!String(values[campo] || "").trim());
}

export async function loadProvider(base44, tipo) {
  const def = PAYMENT_PROVIDERS[tipo];
  if (!def) throw Object.assign(new Error("Provedor de pagamento desconhecido."), { status: 400 });
  const svc = base44?.asServiceRole || base44;
  let registro = null;
  try {
    const page = await svc.entities.Integracao.filter({ tipo }, { limit: 1 });
    registro = (Array.isArray(page) ? page : page?.items || [])[0] || null;
  } catch {
    registro = null;
  }
  const stored = registro?.config || {};
  const values = {};
  const origem = {};
  for (const [campo, cfg] of Object.entries(def.campos)) {
    const painel = String(stored[`${PREFIX}${campo}`] || "").trim();
    const ambiente = String(readSecret(cfg.env) || "").trim();
    values[campo] = painel || ambiente;
    origem[campo] = painel ? "painel" : ambiente ? "ambiente" : null;
  }
  return {
    tipo,
    def,
    registro,
    stored,
    values,
    origem,
    ambiente: String(stored[`${PREFIX}ambiente`] || "producao"),
    pronto: providerReady(tipo, values),
    ativo: registro ? registro.ativo !== false : false,
    status: registro?.status || "aguardando_configuracao",
    mensagem: registro?.mensagem || "",
    ultimo_teste: registro?.ultimo_teste || "",
  };
}

/** Salva apenas os campos enviados; campo vazio remove a credencial. */
export async function saveProviderCredentials(base44, tipo, valores = {}, meta = {}) {
  const svc = base44?.asServiceRole || base44;
  const atual = await loadProvider(svc, tipo);
  const config = { ...(atual.stored || {}) };
  let alterados = 0;

  for (const campo of Object.keys(atual.def.campos)) {
    if (!(campo in valores)) continue;
    const valor = String(valores[campo] || "").trim();
    const chave = `${PREFIX}${campo}`;
    if (valor && valor !== config[chave]) {
      config[chave] = valor;
      alterados += 1;
    } else if (!valor && config[chave]) {
      delete config[chave];
      alterados += 1;
    }
  }

  if (meta.ambiente && meta.ambiente !== config[`${PREFIX}ambiente`]) {
    config[`${PREFIX}ambiente`] = meta.ambiente === "teste" ? "teste" : "producao";
    alterados += 1;
  }

  if (!alterados) {
    if (atual.registro?.ativo === true) {
      await svc.entities.Integracao.update(atual.registro.id, { ativo: false });
      return { ok: true, alterados: 0, ativo: false };
    }
    return { ok: true, alterados: 0, ativo: false };
  }

  const patch = {
    tipo,
    nome: atual.def.nome,
    config,
    status: "aguardando_configuracao",
    mensagem: "Credenciais salvas. Execute o teste de conexão para confirmar.",
  };
  // Alterar credenciais nunca deve ativar um provedor automaticamente.
  // A ativação exige uma ação administrativa explícita e separada.
  patch.ativo = false;
  if (atual.registro) await svc.entities.Integracao.update(atual.registro.id, patch);
  else await svc.entities.Integracao.create(patch);

  return { ok: true, alterados, ativo: false };
}

export async function setProviderEnabled(base44, tipo, ativo) {
  const svc = base44?.asServiceRole || base44;
  const atual = await loadProvider(svc, tipo);
  if (!atual.registro) throw Object.assign(new Error("Cadastre as credenciais antes de ativar."), { status: 400 });
  if (ativo && !atual.pronto) {
    throw Object.assign(
      new Error("Não é possível ativar sem as credenciais obrigatórias preenchidas."),
      { status: 400 },
    );
  }
  await svc.entities.Integracao.update(atual.registro.id, { ativo: !!ativo });
  return { ok: true, ativo: !!ativo };
}

/** Estorno total pela API oficial do Mercado Pago. */
export async function mpRefund(values, paymentId) {
  const res = await mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}/refunds`, values, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) return res;
  return { ok: true, refund: res.data };
}

/* ------------------------------ Mercado Pago ------------------------------ */

async function mpRequest(path, values, init = {}) {
  const token = String(values.access_token || "").trim();
  if (!token) {
    return { ok: false, error: "O Access Token do Mercado Pago não está configurado." };
  }
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const causa =
      payload?.message ||
      payload?.error ||
      payload?.cause?.[0]?.description ||
      `O Mercado Pago respondeu ${res.status}.`;
    return { ok: false, status: res.status, error: String(causa), payload };
  }
  return { ok: true, data: payload };
}

export async function mpAccount(values) {
  const res = await mpRequest("/users/me", values, { method: "GET" });
  if (!res.ok) return res;
  const u = res.data || {};
  return {
    ok: true,
    conta: {
      id: u.id,
      nickname: u.nickname || "",
      email: u.email || "",
      site: u.site_id || "",
    },
  };
}

export async function mpCreatePix(values, { valor, descricao, referencia, notificationUrl, idempotencyKey, payer }) {
  const [first, ...rest] = String(payer?.nome || "Cliente").trim().split(/\s+/);
  const body = {
    transaction_amount: Math.round(Number(valor) * 100) / 100,
    description: descricao,
    payment_method_id: "pix",
    external_reference: referencia,
    notification_url: notificationUrl,
    payer: {
      email: payer?.email || "",
      first_name: first || "Cliente",
      last_name: rest.join(" ") || "NFC Connect",
    },
  };
  const doc = String(payer?.documento || "").replace(/\D/g, "");
  if (doc.length === 11 || doc.length === 14) {
    body.payer.identification = { type: doc.length === 11 ? "CPF" : "CNPJ", number: doc };
  }

  const res = await mpRequest("/v1/payments", values, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) return res;

  const p = res.data || {};
  const tx = p.point_of_interaction?.transaction_data || {};
  return {
    ok: true,
    payment: {
      id: String(p.id || ""),
      status: p.status || "",
      status_detail: p.status_detail || "",
      qr_code: tx.qr_code || "",
      qr_code_base64: tx.qr_code_base64 || "",
      ticket_url: tx.ticket_url || p.transaction_details?.external_resource_url || "",
      expira_em: p.date_of_expiration || "",
      bruto: p,
    },
  };
}

export async function mpCreatePreference(
  values,
  { valor, descricao, referencia, notificationUrl, backUrl },
) {
  const body = {
    items: [
      {
        title: descricao,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Math.round(Number(valor) * 100) / 100,
      },
    ],
    external_reference: referencia,
    notification_url: notificationUrl,
    back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
    auto_return: "approved",
  };
  const res = await mpRequest("/checkout/preferences", values, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) return res;
  const p = res.data || {};
  const url = p.init_point || p.sandbox_init_point || "";
  if (!url) return { ok: false, error: "O Mercado Pago não retornou o link do checkout." };
  return { ok: true, checkout_url: url, preference_id: String(p.id || ""), bruto: p };
}

export async function mpGetPayment(values, paymentId) {
  const res = await mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, values, { method: "GET" });
  if (!res.ok) return res;
  const p = res.data || {};
  const tx = p.point_of_interaction?.transaction_data || {};
  return {
    ok: true,
    payment: {
      id: String(p.id || ""),
      status: p.status || "",
      status_detail: p.status_detail || "",
      external_reference: String(p.external_reference || ""),
      transaction_amount: Number(p.transaction_amount || 0),
      qr_code: tx.qr_code || "",
      qr_code_base64: tx.qr_code_base64 || "",
      ticket_url: tx.ticket_url || "",
      expira_em: p.date_of_expiration || "",
      bruto: p,
    },
  };
}

const MP_STATUS = {
  approved: "aprovado",
  pending: "pendente",
  in_process: "pendente",
  in_mediation: "pendente",
  authorized: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  charged_back: "reembolsado",
};

export function mapMercadoPagoStatus(status, detail) {
  const s = String(status || "").toLowerCase();
  const d = String(detail || "").toLowerCase();
  if (d.includes("expir")) return "expirado";
  return MP_STATUS[s] || "pendente";
}

/** Assinatura oficial: manifest id:<data.id>;request-id:<x-request-id>;ts:<ts>; com HMAC-SHA256. */
export async function verifyMercadoPagoSignature({ header, requestId, dataId, secret }) {
  // Falha fechada: sem segredo não existe forma segura de autenticar o webhook.
  if (!secret) return { valido: false, motivo: "secret_nao_configurado" };
  if (!header) return { valido: false, motivo: "assinatura_ausente" };
  if (!requestId || !dataId) return { valido: false, motivo: "identificadores_ausentes" };
  const parts = {};
  for (const pedaco of String(header).split(",")) {
    const [k, v] = pedaco.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  if (!parts.ts || !/^[a-f0-9]{64}$/i.test(parts.v1 || "")) {
    return { valido: false, motivo: "assinatura_invalida" };
  }
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
  const hex = [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
  let diferenca = 0;
  for (let i = 0; i < hex.length; i += 1) {
    diferenca |= hex.charCodeAt(i) ^ parts.v1.toLowerCase().charCodeAt(i);
  }
  const valido = diferenca === 0;
  return { valido, motivo: valido ? "ok" : "assinatura_nao_confere" };
}

/* ------------------------------- InfinitePay ------------------------------ */

function ipHeaders() {
  // A API pública do Checkout Integrado identifica a conta apenas pelo handle.
  return { "Content-Type": "application/json" };
}

function ipCleanHandle(values) {
  return String(values.handle || "").replace(/^\$/, "").trim();
}

function ipPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `+${d}`;
  return "";
}

export async function ipCreateLink(values, { pedido, orderNsu, redirectUrl, webhookUrl }) {
  const handle = ipCleanHandle(values);
  if (!handle) {
    return { ok: false, error: "Informe a InfiniteTag (handle) da InfinitePay, sem o $." };
  }

  const items = (pedido.itens || [])
    .map((i) => ({
      quantity: Math.max(1, parseInt(i.quantidade, 10) || 1),
      price: Math.round((Number(i.preco) || 0) * 100),
      description: String(i.nome || "Item").slice(0, 120),
    }))
    .filter((i) => i.price > 0);
  if (Number(pedido.frete) > 0) {
    items.push({
      quantity: 1,
      price: Math.round(Number(pedido.frete) * 100),
      description: "Frete",
    });
  }
  if (!items.length) return { ok: false, error: "O pedido não possui itens para cobrança." };

  // Corpo conforme a documentação oficial: handle, items, order_nsu,
  // redirect_url, webhook_url (texto, não objeto) e customer (opcional).
  const body = { handle, order_nsu: String(orderNsu), items };
  if (redirectUrl) body.redirect_url = redirectUrl;
  if (webhookUrl) body.webhook_url = webhookUrl;

  const customer = {};
  if (pedido.cliente_nome) customer.name = String(pedido.cliente_nome).trim();
  if (pedido.cliente_email) customer.email = String(pedido.cliente_email).trim();
  const phone = ipPhone(pedido.cliente_telefone);
  if (phone) customer.phone_number = phone;
  if (Object.keys(customer).length) body.customer = customer;

  const res = await fetch("https://api.checkout.infinitepay.io/links", {
    method: "POST",
    headers: ipHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        payload?.message ||
        payload?.error ||
        `A InfinitePay respondeu ${res.status}. Confira a InfiniteTag e se o Checkout Integrado está habilitado na conta.`,
      bruto: payload,
    };
  }
  const url = payload.url || payload.checkout_url || payload.link || payload?.data?.url || "";
  if (!url) {
    return {
      ok: false,
      error: "A InfinitePay não retornou a URL do checkout. Confira a resposta registrada no histórico.",
      bruto: payload,
    };
  }
  return { ok: true, checkout_url: url, bruto: payload };
}

export async function ipPaymentCheck(values, { orderNsu, transactionNsu, slug }) {
  const handle = ipCleanHandle(values);
  const res = await fetch("https://api.checkout.infinitepay.io/payment_check", {
    method: "POST",
    headers: ipHeaders(),
    body: JSON.stringify({
      handle,
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        payload?.message ||
        payload?.error ||
        `A InfinitePay respondeu ${res.status} na consulta de status.`,
      bruto: payload,
    };
  }
  return {
    ok: true,
    paid: payload.paid === true,
    amount: Number(payload.amount || 0),
    paid_amount: Number(payload.paid_amount || 0),
    capture_method: payload.capture_method || "",
    bruto: payload,
  };
}

/* --------------------------------- Testes -------------------------------- */

export async function testPaymentProvider(base44, tipo) {
  const provider = await loadProvider(base44, tipo);

  if (!provider.pronto) {
    return {
      status: "aguardando_configuracao",
      mensagem: `Aguardando configuração: ${Object.entries(provider.def.campos)
        .filter(([, c]) => c.obrigatorio)
        .map(([, c]) => c.label)
        .join(" e ")}.`,
    };
  }

  if (tipo === "mercadopago") {
    const conta = await mpAccount(provider.values);
    if (!conta.ok) return { status: "erro", mensagem: conta.error };
    const c = conta.conta || {};
    return {
      status: "conectado",
      mensagem: `Conexão bem-sucedida com o Mercado Pago: ${c.nickname || c.email || c.id} (${c.site || "site não informado"}).`,
    };
  }

  if (tipo === "infinitepay") {
    // A InfinitePay não possui endpoint de ping: o teste cria um link real de
    // R$ 1,00 (sem cobrança, pois ninguém o paga) para validar as credenciais.
    const teste = await ipCreateLink(provider.values, {
      pedido: {
        itens: [{ nome: "Teste de conexão InfinitePay", preco: 1, quantidade: 1 }],
        frete: 0,
      },
      orderNsu: `teste-${Date.now()}`,
      redirectUrl: baseUrl(),
      webhookUrl: `${baseUrl()}/api/payments/infinitepay`,
    });
    if (!teste.ok) return { status: "erro", mensagem: teste.error };
    return {
      status: "conectado",
      mensagem:
        "Conexão bem-sucedida com a InfinitePay. O teste gerou um link de R$ 1,00 sem cobrança apenas para validar as credenciais.",
    };
  }

  return { status: "erro", mensagem: "Provedor desconhecido." };
}