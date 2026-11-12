import { describe, expect, it } from "vitest";
import { avaliarCliente, diaNoFuso, prazoDaConfig, validarPrazo } from "@/lib/inatividade";
import { executarArquivamento } from "@/lib/inatividade-motor.server";

const agora = new Date("2026-11-09T12:00:00Z"); // 09/11/2026 em Brasília

describe("prazo de inatividade", () => {
  it("usa 30 dias como padrão quando não há prazo salvo", () => {
    expect(prazoDaConfig(undefined)).toBe(30);
    expect(prazoDaConfig("abc")).toBe(30);
  });
  it("aceita as opções rápidas e outro número inteiro válido", () => {
    for (const n of [7, 15, 20, 30, 45, 60, 90]) expect(validarPrazo(n)).toEqual({ ok: true, valor: n });
  });
  it("recusa prazos inválidos", () => {
    for (const v of [0, -1, 2.5, 366, "abc", ""]) expect(validarPrazo(v).ok).toBe(false);
  });
});

describe("avaliação do cliente", () => {
  it("arquiva quando a última atividade atingiu o prazo, contando dias em Brasília", () => {
    // 11/10 02:30 UTC = 10/10 23:30 em Brasília → 30 dias até 09/11.
    const av = avaliarCliente({ ultimo_contato_em: "2026-10-11T02:30:00Z" }, {}, { prazoDias: 30, agora });
    expect(av.diasInativo).toBe(30);
    expect(av.situacao).toBe("vencido");
  });
  it("não arquiva antes do prazo", () => {
    const av = avaliarCliente({ ultimo_contato_em: "2026-10-20T12:00:00Z" }, {}, { prazoDias: 30, agora });
    expect(av.situacao).not.toBe("vencido");
  });
  it("histórico recente (resposta, tarefa, proposta) conta como atividade", () => {
    const av = avaliarCliente({ ultimo_contato_em: "2026-01-01T12:00:00Z" }, { ultimaInteracaoEm: new Date("2026-11-08T12:00:00Z") }, { prazoDias: 30, agora });
    expect(av.situacao).toBe("ativo");
  });
  it("negociação em andamento não é inatividade", () => {
    const av = avaliarCliente({ etapa: "em_negociacao", ultimo_contato_em: "2026-01-01T12:00:00Z" }, {}, { prazoDias: 30, agora });
    expect(av.situacao).toBe("protegido");
  });
  it("tarefa pendente não é inatividade", () => {
    const av = avaliarCliente({ ultimo_contato_em: "2026-01-01T12:00:00Z" }, { tarefasPendentes: 1 }, { prazoDias: 30, agora });
    expect(av.situacao).toBe("protegido");
  });
  it("retorno agendado para hoje ou depois não é inatividade", () => {
    const av = avaliarCliente({ ultimo_contato_em: "2026-01-01T12:00:00Z", retorno_agendado_em: "2026-11-09" }, {}, { prazoDias: 30, agora });
    expect(av.situacao).toBe("protegido");
  });
  it("sem data de atividade (ou data inválida) nunca é arquivado", () => {
    expect(avaliarCliente({}, {}, { prazoDias: 7, agora }).situacao).toBe("sem_data");
    expect(avaliarCliente({ ultimo_contato_em: "data-ruim" }, {}, { prazoDias: 7, agora }).situacao).toBe("sem_data");
  });
  it("cliente já arquivado não é avaliado de novo", () => {
    expect(avaliarCliente({ arquivado: true, ultimo_contato_em: "2026-01-01T12:00:00Z" }, {}, { agora }).situacao).toBe("arquivado");
  });
  it("data sem horário é tratada como dia do calendário", () => {
    expect(diaNoFuso("2026-11-20")).toBe("2026-11-20");
    expect(diaNoFuso("2026-02-31")).toBeNull();
  });
});

describe("execução do arquivamento", () => {
  it("é idempotente: só registra quando o banco confirma o arquivamento", async () => {
    let jaArquivado = false;
    const query = async (sql: string) => {
      if (sql.includes("data->>'chave' = $1")) return [];
      if (sql.includes("now()::text AS inicio")) return [{ inicio: "2026-11-09 12:00:00+00" }];
      if (sql.includes("LEFT JOIN LATERAL")) {
        return jaArquivado ? [] : [{ id: "l1", data: { empresa: "X", ultimo_contato_em: "2026-01-01T12:00:00Z" }, updated_raw: "x", tarefas_pendentes: 0 }];
      }
      if (sql.includes("WITH alvo")) {
        if (jaArquivado) return [];
        jaArquivado = true;
        return [{ id: "i1" }];
      }
      return [];
    };
    const primeira = await executarArquivamento(query, { agora });
    const segunda = await executarArquivamento(query, { agora });
    expect(primeira.arquivados).toBe(1);
    expect(segunda.arquivados).toBe(0);
  });
});
