// Controle de tempo dos clientes inativos do CRM (entidade Lead).
// Regras puras, sem acesso ao banco: usadas pelo servidor, pelo script de cron e pelos testes.
// Este arquivo só usa imports relativos para poder rodar também em `node scripts/...`.
import { FUSO_CRM } from "./crm-limites.js";

export const PRAZO_PADRAO_DIAS = 30;
export const PRAZO_MIN_DIAS = 1;
export const PRAZO_MAX_DIAS = 365;
export const PRAZOS_RAPIDOS = [7, 15, 20, 30, 45, 60];

// Chaves dos registros de Configuracao usados pelo controle.
export const CHAVE_PRAZO = "inatividade_dias";
export const CHAVE_ULTIMA_EXECUCAO = "inatividade_ultima_execucao";

// Etapas do funil em que há negociação em andamento: nunca contam como inatividade.
export const ETAPAS_EM_NEGOCIACAO = ["em_negociacao", "proposta_enviada"];
// Cliente já convertido não sai do CRM por falta de contato comercial.
export const ETAPAS_NUNCA_ARQUIVAR = ["cliente_convertido"];

// Tipos de histórico (LeadInteraction) que NÃO são atividade do cliente.
export const TIPOS_IGNORADOS = ["arquivamento"];

/** Valida um prazo em dias: número inteiro entre 1 e 365. */
export function validarPrazo(valor) {
  const texto = typeof valor === "string" ? valor.trim() : valor;
  if (texto === "" || texto === null || texto === undefined) {
    return { ok: false, erro: "Informe o prazo em dias." };
  }
  const n = Number(texto);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, erro: "O prazo precisa ser um número inteiro de dias." };
  }
  if (n < PRAZO_MIN_DIAS || n > PRAZO_MAX_DIAS) {
    return { ok: false, erro: `O prazo precisa ficar entre ${PRAZO_MIN_DIAS} e ${PRAZO_MAX_DIAS} dias.` };
  }
  return { ok: true, valor: n };
}

/** Prazo salvo na configuração; se estiver ausente ou inválido, usa o padrão (30 dias). */
export function prazoDaConfig(valorSalvo) {
  const v = validarPrazo(valorSalvo);
  return v.ok ? v.valor : PRAZO_PADRAO_DIAS;
}

/** Quantos dias antes do prazo o cliente aparece como "próximo do prazo". */
export function janelaAviso(prazoDias) {
  return Math.min(7, Math.max(1, Math.round(prazoDias / 4)));
}

const formatadores = new Map();
function formatador(fuso) {
  if (!formatadores.has(fuso)) {
    formatadores.set(
      fuso,
      new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }),
    );
  }
  return formatadores.get(fuso);
}

const DIA_SIMPLES = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Dia do calendário (AAAA-MM-DD) no fuso do CRM. Datas sem horário ("2026-11-20") já são
 * um dia do calendário e não são convertidas. Datas inválidas ou vazias devolvem null.
 */
export function diaNoFuso(valor, fuso = FUSO_CRM) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "string") {
    const m = DIA_SIMPLES.exec(valor.trim());
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
      return valor.trim();
    }
  }
  if (typeof valor !== "string" && !(valor instanceof Date)) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  const ano = data.getUTCFullYear();
  if (ano < 2000 || ano > 2200) return null;
  return formatador(fuso).format(data);
}

const serial = (dia) => {
  const [y, m, d] = dia.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Dias do calendário entre dois dias AAAA-MM-DD (b - a). */
export function diasEntre(diaA, diaB) {
  return serial(diaB) - serial(diaA);
}

/** Formata AAAA-MM-DD como DD/MM/AAAA. */
export function diaBR(dia) {
  if (!dia) return "—";
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Data da última atividade real do cliente. Considera mensagens enviadas e recebidas,
 * respostas de autorização, restauração, retorno agendado já ocorrido e todo o histórico
 * (tarefas, propostas, mudanças de etapa…). A data de cadastro não conta como atividade.
 * `historico` = { ultimaInteracaoEm, ultimaConclusaoEm, tarefasPendentes }.
 */
export function ultimaAtividade(lead, historico = {}, { agora = new Date(), fuso = FUSO_CRM } = {}) {
  const hoje = diaNoFuso(agora, fuso);
  const retornoDia = diaNoFuso(lead?.retorno_agendado_em, fuso);
  const fontes = [
    [lead?.ultimo_contato_em, "Último contato"],
    [lead?.consent_solicitado_em, "Mensagem enviada"],
    [lead?.consent_autorizado_em, "Resposta recebida"],
    [lead?.consent_revogado_em, "Resposta recebida"],
    [lead?.restaurado_em, "Restauração do arquivo"],
    [retornoDia && hoje && retornoDia <= hoje ? lead.retorno_agendado_em : null, "Retorno agendado"],
    [historico?.ultimaInteracaoEm, "Histórico do cliente"],
    [historico?.ultimaConclusaoEm, "Tarefa concluída"],
  ];
  let melhor = null;
  for (const [valor, fonte] of fontes) {
    const dia = diaNoFuso(valor, fuso);
    if (!dia) continue;
    // Datas no futuro (relógio adiantado) contam como hoje.
    const efetivo = hoje && dia > hoje ? hoje : dia;
    if (!melhor || efetivo > melhor.dia) melhor = { dia: efetivo, fonte, valor };
  }
  return melhor;
}

/**
 * Situação do cliente diante do prazo:
 * - "arquivado": já está no arquivo;
 * - "protegido": negociação em andamento, tarefa pendente, retorno agendado ou cliente convertido;
 * - "sem_data": sem nenhuma data de atividade confiável — nunca é arquivado;
 * - "ativo" | "proximo" | "vencido": conforme os dias sem atividade.
 */
export function avaliarCliente(lead, historico = {}, { prazoDias = PRAZO_PADRAO_DIAS, agora = new Date(), fuso = FUSO_CRM } = {}) {
  const prazo = prazoDaConfig(prazoDias);
  const base = { prazoDias: prazo, motivos: [], ultima: null, diasInativo: null, diasRestantes: null };
  if (lead?.arquivado === true || lead?.arquivado === "true") return { ...base, situacao: "arquivado" };

  const hoje = diaNoFuso(agora, fuso);
  const ultima = ultimaAtividade(lead, historico, { agora, fuso });
  const diasInativo = ultima && hoje ? Math.max(0, diasEntre(ultima.dia, hoje)) : null;
  const info = {
    ...base,
    ultima,
    diasInativo,
    diasRestantes: diasInativo === null ? null : prazo - diasInativo,
  };

  const motivos = [];
  if (ETAPAS_EM_NEGOCIACAO.includes(lead?.etapa)) motivos.push("Negociação em andamento");
  if (ETAPAS_NUNCA_ARQUIVAR.includes(lead?.etapa)) motivos.push("Cliente convertido");
  if (Number(historico?.tarefasPendentes) > 0) motivos.push("Tarefa pendente");
  const retornoDia = diaNoFuso(lead?.retorno_agendado_em, fuso);
  if (retornoDia && hoje && retornoDia >= hoje) motivos.push(`Retorno agendado para ${diaBR(retornoDia)}`);
  if (motivos.length) return { ...info, situacao: "protegido", motivos };

  if (!hoje || !ultima) return { ...info, situacao: "sem_data" };
  if (info.diasRestantes <= 0) return { ...info, situacao: "vencido" };
  if (info.diasRestantes <= janelaAviso(prazo)) return { ...info, situacao: "proximo" };
  return { ...info, situacao: "ativo" };
}

/** Texto do motivo gravado no cliente arquivado. */
export function motivoArquivamento(avaliacao) {
  return `Sem atividade há ${avaliacao.diasInativo} dias (prazo configurado: ${avaliacao.prazoDias} dias). Última atividade em ${diaBR(avaliacao.ultima?.dia)} (${avaliacao.ultima?.fonte || "histórico"}).`;
}
