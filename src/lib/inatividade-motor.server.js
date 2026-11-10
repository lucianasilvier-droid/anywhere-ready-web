// Arquivamento automático de clientes inativos do CRM (entidade Lead na tabela `records`).
// Recebe a função `query(text, params)` para rodar tanto no app quanto no script de cron
// (scripts/arquivar-inativos.mjs). Por isso só usa imports relativos.
//
// Segurança da execução:
// - idempotente: só arquiva quem ainda não está arquivado (UPDATE condicional);
// - sem corrida: o cliente só é arquivado se não mudou desde a leitura e se não recebeu
//   histórico novo durante a execução; arquivamento e registro no histórico são um só comando;
// - nunca exclui: o cliente fica no arquivo com motivo, data e representante preservados;
// - sem data confiável de atividade, o cliente não é arquivado.
import {
  CHAVE_PRAZO,
  CHAVE_ULTIMA_EXECUCAO,
  TIPOS_IGNORADOS,
  avaliarCliente,
  motivoArquivamento,
  prazoDaConfig,
  validarPrazo,
} from "./inatividade.js";

const novoId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

/* ------------------------------- Configuração ------------------------------ */

async function configRegistro(query, chave) {
  const rows = await query(
    `SELECT id, data FROM records WHERE entity = 'Configuracao' AND data->>'chave' = $1 ORDER BY created_date LIMIT 1`,
    [chave],
  );
  return rows[0] || null;
}

export async function lerPrazo(query) {
  const reg = await configRegistro(query, CHAVE_PRAZO);
  return prazoDaConfig(reg?.data?.valor);
}

export async function salvarPrazo(query, valor, autorEmail) {
  const v = validarPrazo(valor);
  if (!v.ok) throw Object.assign(new Error(v.erro), { status: 400 });
  const reg = await configRegistro(query, CHAVE_PRAZO);
  const patch = {
    chave: CHAVE_PRAZO,
    valor: String(v.valor),
    descricao: "Dias sem atividade até o cliente do CRM ser arquivado automaticamente",
    atualizado_por: autorEmail || null,
  };
  if (reg) {
    await query(`UPDATE records SET data = data || $2::jsonb, updated_date = now() WHERE id = $1`, [reg.id, JSON.stringify(patch)]);
  } else {
    await query(
      `INSERT INTO records (id, entity, data, created_by, created_by_id) VALUES ($1, 'Configuracao', $2::jsonb, $3, NULL)`,
      [novoId(), JSON.stringify(patch), autorEmail || null],
    );
  }
  await query(
    `INSERT INTO records (id, entity, data, created_by) VALUES ($1, 'AtividadeLog', $2::jsonb, $3)`,
    [
      novoId(),
      JSON.stringify({ acao: "Prazo de inatividade alterado", entidade: "Configuracao", detalhe: `${CHAVE_PRAZO} = ${v.valor} dias` }),
      autorEmail || null,
    ],
  );
  return v.valor;
}

export async function ultimaExecucao(query) {
  const reg = await configRegistro(query, CHAVE_ULTIMA_EXECUCAO);
  return reg?.data?.em ? { em: reg.data.em, ...(reg.data.resultado || {}) } : null;
}

/**
 * Reserva a próxima execução automática: devolve true para apenas um chamador por
 * intervalo, mesmo com várias requisições ao mesmo tempo.
 */
async function reservarExecucao(query, intervaloMin) {
  let reg = await configRegistro(query, CHAVE_ULTIMA_EXECUCAO);
  if (!reg) {
    await query(
      `INSERT INTO records (id, entity, data) SELECT $1, 'Configuracao', $2::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM records WHERE entity = 'Configuracao' AND data->>'chave' = $3)`,
      [novoId(), JSON.stringify({ chave: CHAVE_ULTIMA_EXECUCAO, valor: "", descricao: "Última execução do arquivamento por inatividade" }), CHAVE_ULTIMA_EXECUCAO],
    );
    reg = await configRegistro(query, CHAVE_ULTIMA_EXECUCAO);
    if (!reg) return false;
  }
  const rows = await query(
    `UPDATE records SET data = data || jsonb_build_object('em', to_jsonb(now())), updated_date = now()
     WHERE id = $1 AND (data->>'em' IS NULL OR data->>'em' = '' OR (data->>'em')::timestamptz < now() - make_interval(mins => $2::int))
     RETURNING id`,
    [reg.id, intervaloMin],
  );
  return rows.length > 0;
}

/* --------------------------------- Leitura --------------------------------- */

/** Clientes não arquivados com o resumo do histórico de cada um. */
async function carregarAtivos(query) {
  const rows = await query(
    `SELECT l.id, l.data, l.updated_date::text AS updated_raw,
            h.ultima_interacao, h.ultima_conclusao, COALESCE(h.tarefas_pendentes, 0)::int AS tarefas_pendentes
       FROM records l
       LEFT JOIN LATERAL (
         SELECT max(r.created_date) AS ultima_interacao,
                max(r.data->>'concluida_em') AS ultima_conclusao,
                count(*) FILTER (WHERE r.data->>'tipo' = 'tarefa' AND COALESCE(r.data->>'concluida', 'false') <> 'true') AS tarefas_pendentes
           FROM records r
          WHERE r.entity = 'LeadInteraction' AND r.data->>'lead_id' = l.id
            AND COALESCE(r.data->>'tipo', '') <> ALL($1::text[])
       ) h ON TRUE
      WHERE l.entity = 'Lead' AND COALESCE(l.data->>'arquivado', 'false') <> 'true'`,
    [TIPOS_IGNORADOS],
  );
  return rows.map((r) => ({
    id: r.id,
    lead: r.data || {},
    updatedRaw: r.updated_raw,
    historico: {
      ultimaInteracaoEm: r.ultima_interacao,
      ultimaConclusaoEm: r.ultima_conclusao,
      tarefasPendentes: r.tarefas_pendentes,
    },
  }));
}

const resumoCliente = (item, av) => ({
  id: item.id,
  empresa: item.lead.empresa || "Sem nome",
  cidade: item.lead.cidade || "",
  etapa: item.lead.etapa || "novo_lead",
  representante_id: item.lead.representante_id || null,
  representante_nome: item.lead.representante_nome || "",
  ultima_atividade_dia: av.ultima?.dia || null,
  ultima_atividade_fonte: av.ultima?.fonte || null,
  dias_inativo: av.diasInativo,
  dias_restantes: av.diasRestantes,
  motivos: av.motivos,
});

/** Números do painel e a lista de clientes próximos do prazo. */
export async function resumoInatividade(query, { agora = new Date() } = {}) {
  const prazoDias = await lerPrazo(query);
  const itens = await carregarAtivos(query);
  const contagem = { ativo: 0, proximo: 0, vencido: 0, protegido: 0, sem_data: 0 };
  const proximos = [];
  for (const item of itens) {
    const av = avaliarCliente(item.lead, item.historico, { prazoDias, agora });
    contagem[av.situacao] = (contagem[av.situacao] || 0) + 1;
    if (av.situacao === "proximo" || av.situacao === "vencido") proximos.push(resumoCliente(item, av));
  }
  proximos.sort((a, b) => a.dias_restantes - b.dias_restantes);
  const [arq] = await query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE (data->>'arquivado_em') >= to_char((now() - interval '30 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD'))::int AS ultimos_30
       FROM records WHERE entity = 'Lead' AND data->>'arquivado' = 'true'`,
  );
  return {
    prazoDias,
    contagem,
    proximosDoPrazo: contagem.proximo,
    aguardandoArquivamento: contagem.vencido,
    arquivados: arq?.total ?? 0,
    arquivadosUltimos30: arq?.ultimos_30 ?? 0,
    proximos: proximos.slice(0, 50),
    ultimaExecucao: await ultimaExecucao(query),
  };
}

/* ------------------------------- Arquivamento ------------------------------ */

/**
 * Arquiva os clientes que atingiram o prazo. Pode ser chamada quantas vezes quiser:
 * quem já está arquivado ou mudou durante a execução não é tocado.
 */
export async function executarArquivamento(query, { agora = new Date(), origem = "automatico", autorEmail = null } = {}) {
  const prazoDias = await lerPrazo(query);
  const [{ inicio }] = await query(`SELECT now()::text AS inicio`);
  const itens = await carregarAtivos(query);
  const agoraIso = agora.toISOString();
  let arquivados = 0;
  let vencidos = 0;
  const lista = [];

  for (const item of itens) {
    const av = avaliarCliente(item.lead, item.historico, { prazoDias, agora });
    if (av.situacao !== "vencido") continue;
    vencidos++;
    const motivo = motivoArquivamento(av);
    const patch = {
      arquivado: true,
      arquivado_em: agoraIso,
      arquivado_motivo: motivo,
      arquivado_origem: origem,
      arquivado_por: autorEmail || "sistema",
      arquivado_prazo_dias: prazoDias,
      arquivado_ultima_atividade_em: av.ultima.dia,
      arquivado_etapa: item.lead.etapa || null,
    };
    const historico = {
      lead_id: item.id,
      empresa: item.lead.empresa || "",
      tipo: "arquivamento",
      mensagem: "Cliente arquivado por inatividade",
      detalhe: motivo,
      autor: origem === "manual" ? `Administrador (${autorEmail || "painel"})` : "Sistema",
      representante_id: item.lead.representante_id || null,
      representante_nome: item.lead.representante_nome || null,
    };
    const rows = await query(
      `WITH alvo AS (
         UPDATE records SET data = data || $3::jsonb, updated_date = now()
          WHERE entity = 'Lead' AND id = $1
            AND COALESCE(data->>'arquivado', 'false') <> 'true'
            AND updated_date = $2::timestamptz
            AND NOT EXISTS (
              SELECT 1 FROM records i
               WHERE i.entity = 'LeadInteraction' AND i.data->>'lead_id' = $1 AND i.created_date >= $4::timestamptz
            )
          RETURNING id
       )
       INSERT INTO records (id, entity, data, created_by, created_by_id)
       SELECT $5, 'LeadInteraction', $6::jsonb, $7, 'sistema' FROM alvo
       RETURNING id`,
      [item.id, item.updatedRaw, JSON.stringify(patch), inicio, novoId(), JSON.stringify(historico), autorEmail],
    );
    if (rows.length) {
      arquivados++;
      lista.push({ id: item.id, empresa: historico.empresa });
    }
  }

  const resultado = { arquivados, vencidos, analisados: itens.length, prazoDias, origem };
  const reg = await configRegistro(query, CHAVE_ULTIMA_EXECUCAO);
  const dados = { chave: CHAVE_ULTIMA_EXECUCAO, valor: agoraIso, em: agoraIso, resultado };
  if (reg) await query(`UPDATE records SET data = data || $2::jsonb, updated_date = now() WHERE id = $1`, [reg.id, JSON.stringify(dados)]);
  else await query(`INSERT INTO records (id, entity, data) VALUES ($1, 'Configuracao', $2::jsonb)`, [novoId(), JSON.stringify(dados)]);

  if (arquivados > 0 || origem === "manual") {
    await query(`INSERT INTO records (id, entity, data, created_by) VALUES ($1, 'AtividadeLog', $2::jsonb, $3)`, [
      novoId(),
      JSON.stringify({
        acao: "Arquivamento por inatividade",
        entidade: "Lead",
        detalhe: `${arquivados} cliente(s) arquivado(s) · prazo ${prazoDias} dias · ${origem === "manual" ? "execução manual" : "execução automática"}`,
      }),
      autorEmail,
    ]);
  }
  return { ...resultado, lista };
}

/** Execução automática, no máximo uma vez por intervalo (padrão: 60 minutos). */
export async function executarSeNecessario(query, { intervaloMin = 60, agora } = {}) {
  if (!(await reservarExecucao(query, intervaloMin))) return null;
  return executarArquivamento(query, { agora, origem: "automatico" });
}

/* ------------------------------ Área de arquivo ----------------------------- */

const escaparLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listarArquivados(query, { busca = "", representanteId = "", limite = 200 } = {}) {
  const params = [];
  const conds = [`entity = 'Lead'`, `data->>'arquivado' = 'true'`];
  const termo = String(busca || "").trim();
  if (termo) {
    params.push(`%${escaparLike(termo)}%`);
    const p = `$${params.length}`;
    conds.push(
      `(data->>'empresa' ILIKE ${p} OR data->>'cidade' ILIKE ${p} OR data->>'telefone' ILIKE ${p} OR data->>'representante_nome' ILIKE ${p} OR data->>'arquivado_motivo' ILIKE ${p})`,
    );
  }
  if (representanteId === "__equipe__") conds.push(`COALESCE(data->>'representante_id', '') = ''`);
  else if (representanteId) {
    params.push(String(representanteId));
    conds.push(`data->>'representante_id' = $${params.length}`);
  }
  const lim = Math.min(Math.max(Number(limite) || 200, 1), 500);
  const rows = await query(
    `SELECT id, data, created_date FROM records WHERE ${conds.join(" AND ")} ORDER BY data->>'arquivado_em' DESC NULLS LAST LIMIT ${lim}`,
    params,
  );
  const reps = await query(
    `SELECT DISTINCT data->>'representante_id' AS id, data->>'representante_nome' AS nome
       FROM records WHERE entity = 'Lead' AND data->>'arquivado' = 'true' AND COALESCE(data->>'representante_id', '') <> ''
      ORDER BY 2`,
  );
  return {
    itens: rows.map((r) => ({
      id: r.id,
      empresa: r.data.empresa || "Sem nome",
      cidade: r.data.cidade || "",
      telefone: r.data.telefone || "",
      etapa: r.data.arquivado_etapa || r.data.etapa || "",
      representante_id: r.data.representante_id || null,
      representante_nome: r.data.representante_nome || "",
      arquivado_em: r.data.arquivado_em || null,
      arquivado_motivo: r.data.arquivado_motivo || "",
      arquivado_origem: r.data.arquivado_origem || "",
      arquivado_ultima_atividade_em: r.data.arquivado_ultima_atividade_em || null,
    })),
    representantes: reps.map((r) => ({ id: r.id, nome: r.nome || "Representante" })),
  };
}

/** Restaura um cliente arquivado. Chamar de novo não muda nada (idempotente). */
export async function restaurarCliente(query, { leadId, autorEmail }) {
  const [atual] = await query(`SELECT data FROM records WHERE entity = 'Lead' AND id = $1`, [String(leadId)]);
  if (!atual) throw Object.assign(new Error("Cliente não encontrado."), { status: 404 });
  if (atual.data?.arquivado !== true && atual.data?.arquivado !== "true") return { restaurado: false, jaAtivo: true };
  const agoraIso = new Date().toISOString();
  const d = atual.data;
  const patch = {
    arquivado: false,
    arquivado_em: null,
    arquivado_motivo: null,
    arquivado_origem: null,
    arquivado_por: null,
    arquivado_prazo_dias: null,
    arquivado_ultima_atividade_em: null,
    arquivado_etapa: null,
    restaurado_em: agoraIso,
    restaurado_por: autorEmail || null,
    ultimo_arquivamento: { em: d.arquivado_em || null, motivo: d.arquivado_motivo || null, origem: d.arquivado_origem || null },
  };
  const historico = {
    lead_id: String(leadId),
    empresa: d.empresa || "",
    tipo: "restauracao",
    mensagem: "Cliente restaurado do arquivo",
    detalhe: `Arquivado em ${d.arquivado_em ? new Date(d.arquivado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "data não registrada"}. Motivo: ${d.arquivado_motivo || "não registrado"}`,
    autor: `Administrador (${autorEmail || "painel"})`,
    representante_id: d.representante_id || null,
    representante_nome: d.representante_nome || null,
  };
  const rows = await query(
    `WITH alvo AS (
       UPDATE records SET data = data || $2::jsonb, updated_date = now()
        WHERE entity = 'Lead' AND id = $1 AND data->>'arquivado' = 'true'
        RETURNING id
     )
     INSERT INTO records (id, entity, data, created_by) SELECT $3, 'LeadInteraction', $4::jsonb, $5 FROM alvo RETURNING id`,
    [String(leadId), JSON.stringify(patch), novoId(), JSON.stringify(historico), autorEmail || null],
  );
  return { restaurado: rows.length > 0, jaAtivo: rows.length === 0 };
}
