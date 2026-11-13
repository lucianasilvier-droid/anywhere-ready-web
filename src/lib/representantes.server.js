/**
 * Motor de comissões e pagamentos dos representantes comerciais.
 * Todas as regras (valores, liberação, duplicidade, saldos) são aplicadas aqui,
 * no servidor. Nenhum valor calculado no navegador é aceito.
 */

import { TABELA_COMISSAO } from "@/lib/comissoes";
import { PRECO_SITE } from "@/lib/preco-site";
import { withTransaction } from "@/lib/db.server";

export { TABELA_COMISSAO };

export const TIPO_LABEL = {
  perfil_google: "Perfil no Google",
  mensalidade: "Mensalidade do perfil",
  placa: "Placa NFC",
  site: "Criação de site",
  mensalidade_site: "Mensalidade do site",
};

export const STATUS_VENDA_LABEL = {
  pendente: "Pagamento pendente",
  confirmada: "Pagamento confirmado",
  cancelada: "Cancelada",
};

export const STATUS_COMISSAO_LABEL = {
  aguardando_pagamento: "Aguardando pagamento do cliente",
  disponivel: "Disponível para saque",
  solicitada: "Solicitação em análise",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const STATUS_SOLICITACAO_LABEL = {
  pendente: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  paga: "Paga",
};

const norm = (v) => String(v || "").trim().toLowerCase();
const round = (v) => Math.round((Number(v) || 0) * 100) / 100;

function erro(mensagem, status = 400) {
  return Object.assign(new Error(mensagem), { status });
}

export function novoCodigo(prefixo, tamanho = 6) {
  const raw = (globalThis.crypto?.randomUUID?.() || String(Math.random()))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return `${prefixo}${raw.slice(0, tamanho)}`;
}

export async function listar(base44, entidade, query = {}, limite = 500) {
  const itens = [];
  let cursor;
  for (let i = 0; i < 6; i += 1) {
    const pagina = await base44.entities[entidade].filter(query, {
      limit: Math.min(limite, 200),
      cursor,
      sort: "-created_date",
    });
    const lista = Array.isArray(pagina) ? pagina : pagina?.items || [];
    itens.push(...lista);
    if (!pagina?.has_more || !pagina?.next_cursor || itens.length >= limite) break;
    cursor = pagina.next_cursor;
  }
  return itens;
}

/** Representante vinculado ao login atual (ou null). */
export async function representanteDoUsuario(base44, user) {
  if (!user?.email) return null;
  const itens = await listar(base44, "Representante", { user_email: norm(user.email) }, 5);
  return itens[0] || null;
}

async function registrar(base44, acao, detalhe, autor, registroId = "") {
  await base44.entities.AtividadeLog.create({
    acao,
    entidade: "VendaRepresentante",
    registro_id: registroId,
    detalhe,
    autor_email: autor || "",
  });
}

/** Cálculo das regras comerciais — nunca vem do navegador. */
export function calcularVenda(rep, payload) {
  const tipo = payload.tipo;
  const quantidade = tipo === "placa" ? Math.max(1, Math.min(200, Number(payload.quantidade) || 1)) : 1;
  const cliente = norm(payload.cliente_email) || norm(payload.cliente_nome);
  let valor_venda = 0;
  let comissao_valor = 0;
  let chave = "";
  let competencia = "";

  if (tipo === "perfil_google") {
    valor_venda = TABELA_COMISSAO.perfil_google.valor;
    comissao_valor = Number(rep.comissao_perfil) || TABELA_COMISSAO.perfil_google.comissao;
    chave = `perfil|${rep.id}|${cliente}`;
  } else if (tipo === "mensalidade") {
    competencia = String(payload.competencia || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      throw erro("Informe a competência da mensalidade no formato AAAA-MM.");
    }
    valor_venda = TABELA_COMISSAO.mensalidade.valor;
    comissao_valor = TABELA_COMISSAO.mensalidade.comissao;
    chave = `mensalidade|${rep.id}|${cliente}|${competencia}`;
  } else if (tipo === "site") {
    valor_venda = round(Number(payload.valor_venda) || 0);
    if (valor_venda < PRECO_SITE.minimo || valor_venda > PRECO_SITE.maximo) {
      throw erro(`O valor do site deve ficar entre R$ ${PRECO_SITE.minimo} e R$ ${PRECO_SITE.maximo}.`);
    }
    comissao_valor = round(valor_venda * TABELA_COMISSAO.site.percentual);
    chave = payload.site_id ? `site|${payload.site_id}` : `site|${rep.id}|${cliente}`;
  } else if (tipo === "mensalidade_site") {
    competencia = String(payload.competencia || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      throw erro("Informe a competência da mensalidade no formato AAAA-MM.");
    }
    valor_venda = TABELA_COMISSAO.mensalidade_site.valor;
    comissao_valor = TABELA_COMISSAO.mensalidade_site.comissao;
    chave = `mensalidade_site|${rep.id}|${payload.site_id || cliente}|${competencia}`;
  } else if (tipo === "placa") {
    valor_venda = round(Number(payload.valor_venda) || TABELA_COMISSAO.placa.valorUnidade * quantidade);
    if (valor_venda <= 0) throw erro("Informe o valor da venda da placa.");
    comissao_valor = round(
      (Number(rep.comissao_placa) || TABELA_COMISSAO.placa.comissaoUnidade) * quantidade,
    );
    if (comissao_valor > valor_venda) {
      throw erro("A comissão não pode ser maior que o valor da venda.");
    }
    chave = payload.pedido_id
      ? `placa|${rep.id}|${payload.pedido_id}|${quantidade}`
      : `placa|${rep.id}|${novoCodigo("", 10)}`;
  } else {
    throw erro("Tipo de venda inválido.");
  }

  return {
    tipo,
    quantidade,
    valor_venda: round(valor_venda),
    comissao_valor: round(comissao_valor),
    valor_empresa: round(valor_venda - comissao_valor),
    competencia,
    chave,
  };
}

/** Registra a venda e a comissão correspondente (idempotente pela chave). */
export async function criarVenda(base44, payload, autor) {
  const rep = await base44.entities.Representante.get(payload.representante_id).catch(() => null);
  if (!rep) throw erro("Representante não encontrado.", 404);
  if (rep.status !== "ativo") throw erro("Este representante não está ativo. Reative antes de lançar vendas.");

  const calculo = calcularVenda(rep, payload);

  const existentes = await listar(base44, "VendaRepresentante", { chave: calculo.chave }, 1);
  if (existentes[0]) {
    return { ok: true, duplicada: true, venda: existentes[0] };
  }

  const numero = novoCodigo("VEN-", 6);
  const venda = await base44.entities.VendaRepresentante.create({
    numero,
    chave: calculo.chave,
    representante_id: rep.id,
    representante_nome: rep.nome,
    representante_email: norm(rep.user_email || rep.email),
    cliente_nome: String(payload.cliente_nome || "").trim(),
    cliente_email: norm(payload.cliente_email),
    tipo: calculo.tipo,
    competencia: calculo.competencia,
    quantidade: calculo.quantidade,
    valor_venda: calculo.valor_venda,
    comissao_valor: calculo.comissao_valor,
    valor_empresa: calculo.valor_empresa,
    status: "pendente",
    status_comissao: "aguardando_pagamento",
    data_venda: payload.data_venda || new Date().toISOString(),
    pedido_id: payload.pedido_id || "",
    origem: payload.origem || "painel",
    observacoes: payload.observacoes || "",
    registrado_por: autor || "",
  });

  await registrar(
    base44,
    "Venda de representante registrada",
    `${numero} · ${rep.nome} · ${TIPO_LABEL[calculo.tipo]} · ${calculo.quantidade} un. · comissão ${calculo.comissao_valor}`,
    autor,
    venda.id,
  );

  return { ok: true, duplicada: false, venda };
}

/** Confirma o pagamento do cliente e libera a comissão. */
export async function confirmarPagamentoCliente(base44, vendaId, autor) {
  const venda = await base44.entities.VendaRepresentante.get(vendaId).catch(() => null);
  if (!venda) throw erro("Venda não encontrada.", 404);
  if (venda.status === "cancelada") throw erro("Venda cancelada não pode ser confirmada.");
  if (venda.status_comissao === "paga") return { ok: true, jaConfirmada: true, venda };

  const agora = new Date().toISOString();
  const atualizada = await base44.entities.VendaRepresentante.update(venda.id, {
    status: "confirmada",
    status_comissao: venda.status_comissao === "aguardando_pagamento" ? "disponivel" : venda.status_comissao,
    liberada_em: venda.liberada_em || agora,
  });

  await registrar(
    base44,
    "Pagamento do cliente confirmado",
    `${venda.numero} · ${venda.cliente_nome || "cliente"} · comissão liberada`,
    autor,
    venda.id,
  );
  return { ok: true, jaConfirmada: false, venda: atualizada };
}

export async function cancelarVenda(base44, vendaId, autor) {
  const venda = await base44.entities.VendaRepresentante.get(vendaId).catch(() => null);
  if (!venda) throw erro("Venda não encontrada.", 404);
  if (venda.status_comissao === "paga") throw erro("Comissão já paga não pode ser cancelada.");
  if (venda.status_comissao === "solicitada") {
    throw erro("Esta comissão está em uma solicitação de pagamento. Decida a solicitação antes.");
  }
  if (venda.status_comissao === "cancelada") return { ok: true, venda };

  const atualizada = await base44.entities.VendaRepresentante.update(venda.id, {
    status: "cancelada",
    status_comissao: "cancelada",
  });
  await registrar(base44, "Venda de representante cancelada", `${venda.numero} · comissão cancelada`, autor, venda.id);
  return { ok: true, venda: atualizada };
}

/** Saldo e histórico consolidado de um representante. */
export async function resumoRepresentante(base44, rep) {
  const [vendas, solicitacoes] = await Promise.all([
    listar(base44, "VendaRepresentante", { representante_id: rep.id }, 500),
    listar(base44, "SolicitacaoPagamento", { representante_id: rep.id }, 200),
  ]);

  const ordenadas = vendas.slice().sort((a, b) => String(b.data_venda || "").localeCompare(String(a.data_venda || "")));

  const soma = (lista) => round(lista.reduce((t, v) => t + (Number(v.comissao_valor) || 0), 0));
  const validas = ordenadas.filter((v) => v.status_comissao !== "cancelada");

  const porStatus = (status) => validas.filter((v) => v.status_comissao === status);
  const clientes = new Set(ordenadas.map((v) => norm(v.cliente_email) || norm(v.cliente_nome)).filter(Boolean));

  const servicos = {
    perfil_google: ordenadas.filter((v) => v.tipo === "perfil_google").length,
    mensalidade: ordenadas.filter((v) => v.tipo === "mensalidade").length,
    placa: ordenadas.filter((v) => v.tipo === "placa").reduce((t, v) => t + (Number(v.quantidade) || 1), 0),
    site: ordenadas.filter((v) => v.tipo === "site").length,
    mensalidade_site: ordenadas.filter((v) => v.tipo === "mensalidade_site").length,
  };

  return {
    representante: {
      id: rep.id,
      nome: rep.nome,
      email: rep.email,
      user_email: rep.user_email || "",
      telefone: rep.telefone || "",
      codigo: rep.codigo || "",
      status: rep.status || "ativo",
      comissao_perfil: Number(rep.comissao_perfil) || TABELA_COMISSAO.perfil_google.comissao,
      comissao_mensalidade: TABELA_COMISSAO.mensalidade.comissao,
      comissao_placa: Number(rep.comissao_placa) || TABELA_COMISSAO.placa.comissaoUnidade,
      observacoes: rep.observacoes || "",
    },
    metricas: {
      total_vendas: ordenadas.filter((v) => v.status !== "cancelada").length,
      total_clientes: clientes.size,
      servicos,
      comissao_acumulada: soma(validas),
      comissao_disponivel: soma(porStatus("disponivel")),
      comissao_solicitada: soma(porStatus("solicitada")),
      comissao_paga: soma(porStatus("paga")),
      comissao_aguardando: soma(porStatus("aguardando_pagamento")),
      valor_total_vendido: round(
        ordenadas.filter((v) => v.status !== "cancelada").reduce((t, v) => t + (Number(v.valor_venda) || 0), 0),
      ),
    },
    vendas: ordenadas,
    solicitacoes: solicitacoes.slice().sort((a, b) =>
      String(b.solicitado_em || "").localeCompare(String(a.solicitado_em || "")),
    ),
  };
}

/** Cria a solicitação de pagamento das comissões disponíveis. */
export async function criarSolicitacao(base44, rep, user) {
  if (rep.status === "bloqueado") throw erro("Conta bloqueada. Fale com o administrador.", 403);

  // Serializa solicitações do mesmo representante e reserva as comissões em
  // uma única transação. Evita duas solicitações simultâneas ou saldo duplicado.
  return withTransaction(async (tx) => {
    await tx("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`solicitacao-comissao:${rep.id}`]);

    const pendentes = await tx(
      "SELECT id FROM records WHERE entity = 'SolicitacaoPagamento' AND data->>'representante_id' = $1 AND data->>'status' = 'pendente' LIMIT 1 FOR UPDATE",
      [String(rep.id)],
    );
    if (pendentes[0]) {
      throw erro("Você já tem uma solicitação de pagamento aguardando aprovação.", 409);
    }

    const disponiveis = await tx(
      "SELECT id, data FROM records WHERE entity = 'VendaRepresentante' AND data->>'representante_id' = $1 AND data->>'status_comissao' = 'disponivel' ORDER BY created_date FOR UPDATE",
      [String(rep.id)],
    );
    if (!disponiveis.length) {
      throw erro("Não há comissões disponíveis para solicitar. A comissão é liberada após o pagamento do cliente.");
    }

    const valor = round(disponiveis.reduce((t, v) => t + (Number(v.data?.comissao_valor) || 0), 0));
    const agora = new Date().toISOString();
    const solicitacaoId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const numero = novoCodigo("SOL-", 6);
    const vendaIds = disponiveis.map((v) => v.id);
    const solicitacaoData = {
      numero,
      chave: `sol|${rep.id}|${agora}`,
      representante_id: rep.id,
      representante_nome: rep.nome,
      representante_email: norm(rep.user_email || rep.email),
      valor,
      quantidade_comissoes: disponiveis.length,
      vendas: vendaIds,
      status: "pendente",
      solicitado_em: agora,
    };

    await tx(
      "INSERT INTO records (id, entity, data, created_by, created_by_id) VALUES ($1, 'SolicitacaoPagamento', $2::jsonb, $3, $4)",
      [solicitacaoId, JSON.stringify(solicitacaoData), user?.email || null, user?.id || null],
    );

    for (const venda of disponiveis) {
      await tx(
        "UPDATE records SET data = data || $3::jsonb, updated_date = now() WHERE entity = 'VendaRepresentante' AND id = $1 AND data->>'status_comissao' = 'disponivel' AND data->>'representante_id' = $2",
        [venda.id, String(rep.id), JSON.stringify({ status_comissao: "solicitada", solicitacao_id: solicitacaoId })],
      );
    }

    const logId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    await tx(
      "INSERT INTO records (id, entity, data, created_by, created_by_id) VALUES ($1, 'AtividadeLog', $2::jsonb, $3, $4)",
      [logId, JSON.stringify({
        acao: "Solicitação de pagamento aberta",
        entidade: "VendaRepresentante",
        registro_id: solicitacaoId,
        detalhe: `${numero} · ${rep.nome} · ${valor} em ${disponiveis.length} comissão(ões)`,
        autor_email: norm(user?.email),
      }), user?.email || null, user?.id || null],
    );

    return {
      ok: true,
      solicitacao: {
        ...solicitacaoData,
        id: solicitacaoId,
        created_date: agora,
        updated_date: agora,
        created_by: user?.email || undefined,
        created_by_id: user?.id || undefined,
      },
    };
  });
}

/** Aprova, rejeita ou registra o pagamento de uma solicitação. */
export async function decidirSolicitacao(base44, payload, adminEmail) {
  const solicitacao = await base44.entities.SolicitacaoPagamento.get(payload.id).catch(() => null);
  if (!solicitacao) throw erro("Solicitação não encontrada.", 404);
  if (solicitacao.status === "paga") throw erro("Esta solicitação já foi paga.", 409);

  const agora = new Date().toISOString();
  const vendas = await listar(
    base44,
    "VendaRepresentante",
    { solicitacao_id: solicitacao.id },
    200,
  );

  if (payload.acao === "aprovar") {
    if (solicitacao.status !== "pendente") throw erro("Somente solicitações pendentes podem ser aprovadas.", 409);
    const atualizada = await base44.entities.SolicitacaoPagamento.update(solicitacao.id, {
      status: "aprovada",
      decidido_em: agora,
      decidido_por: norm(adminEmail),
      observacoes: payload.observacoes || solicitacao.observacoes || "",
    });
    await registrar(base44, "Solicitação de pagamento aprovada", `${solicitacao.numero} · ${solicitacao.valor}`, norm(adminEmail), solicitacao.id);
    return { ok: true, solicitacao: atualizada };
  }

  if (payload.acao === "rejeitar") {
    if (!["pendente", "aprovada"].includes(solicitacao.status)) {
      throw erro("Esta solicitação não pode ser rejeitada.", 409);
    }
    const atualizada = await base44.entities.SolicitacaoPagamento.update(solicitacao.id, {
      status: "rejeitada",
      decidido_em: agora,
      decidido_por: norm(adminEmail),
      observacoes: payload.observacoes || "",
    });
    if (vendas.length) {
      await base44.entities.VendaRepresentante.bulkUpdate(
        vendas
          .filter((v) => v.status_comissao === "solicitada")
          .map((v) => ({ id: v.id, status_comissao: "disponivel", solicitacao_id: "" })),
      );
    }
    await registrar(base44, "Solicitação de pagamento rejeitada", `${solicitacao.numero} · ${solicitacao.valor}`, norm(adminEmail), solicitacao.id);
    return { ok: true, solicitacao: atualizada };
  }

  if (payload.acao === "pagar") {
    if (solicitacao.status === "rejeitada") throw erro("Solicitação rejeitada não pode ser paga.", 409);
    const atualizada = await base44.entities.SolicitacaoPagamento.update(solicitacao.id, {
      status: "paga",
      decidido_em: agora,
      decidido_por: norm(adminEmail),
      comprovante: payload.comprovante || solicitacao.comprovante || "",
      observacoes: payload.observacoes || solicitacao.observacoes || "",
    });
    if (vendas.length) {
      await base44.entities.VendaRepresentante.bulkUpdate(
        vendas
          .filter((v) => ["solicitada", "disponivel"].includes(v.status_comissao))
          .map((v) => ({ id: v.id, status_comissao: "paga", paga_em: agora, solicitacao_id: solicitacao.id })),
      );
    }
    await registrar(
      base44,
      "Pagamento de comissão registrado",
      `${solicitacao.numero} · ${solicitacao.representante_nome} · ${solicitacao.valor}${payload.comprovante ? ` · ${payload.comprovante}` : ""}`,
      norm(adminEmail),
      solicitacao.id,
    );
    return { ok: true, solicitacao: atualizada };
  }

  throw erro("Ação inválida.");
}

/** Libera a comissão da venda ligada a um pedido pago pela loja (indicação pela página do representante). */
export async function confirmarVendaDoPedido(base44, pedido) {
  if (!pedido?.representante_venda_id) return null;
  try {
    return await confirmarPagamentoCliente(base44, pedido.representante_venda_id, "pagamento-automatico");
  } catch {
    return null;
  }
}
