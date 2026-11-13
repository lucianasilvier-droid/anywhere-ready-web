import { describe, expect, it } from "vitest";
import { createLeadUnderRepresentativeLimit } from "@/lib/crm-limite-transacao.server";

function fakeTransaction({ usados, limite }) {
  const calls = [];
  const tx = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.includes("pg_advisory_xact_lock")) return [];
    if (sql.includes("count(*)::int AS usados")) return [{ usados, limite }];
    if (sql.includes("INSERT INTO records")) return [{ id: "lead-novo" }];
    throw new Error("SQL inesperado no teste");
  };
  return { tx, calls };
}

describe("limite diário transacional por representante", () => {
  it("obtém o lock do representante antes de consultar a cota e inserir", async () => {
    const { tx, calls } = fakeTransaction({ usados: 4, limite: 5 });
    const result = await createLeadUnderRepresentativeLimit(tx, {
      repId: "rep-123",
      defaultLimit: 20,
      insert: async (transactionQuery) => {
        const rows = await transactionQuery("INSERT INTO records (...) RETURNING *");
        return rows[0];
      },
    });

    expect(result.id).toBe("lead-novo");
    expect(calls).toHaveLength(3);
    expect(calls[0].sql).toContain("pg_advisory_xact_lock");
    expect(calls[1].sql).toContain("America/Sao_Paulo");
    expect(calls[1].params).toEqual(["rep-123", 20]);
    expect(calls[2].sql).toContain("INSERT INTO records");
  });

  it("bloqueia a inclusão quando o representante já atingiu o próprio limite", async () => {
    const { tx, calls } = fakeTransaction({ usados: 7, limite: 7 });
    let tentouInserir = false;

    await expect(
      createLeadUnderRepresentativeLimit(tx, {
        repId: "rep-456",
        defaultLimit: 20,
        insert: async () => {
          tentouInserir = true;
          return { id: "nao-deve-criar" };
        },
      }),
    ).rejects.toMatchObject({ status: 429 });

    expect(tentouInserir).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it("usa o limite individual retornado pelo cadastro, não um limite global", async () => {
    const { tx, calls } = fakeTransaction({ usados: 9, limite: 10 });
    await createLeadUnderRepresentativeLimit(tx, {
      repId: "rep-789",
      defaultLimit: 20,
      insert: async () => ({ ok: true }),
    });

    expect(calls[1].sql).toContain("limite_leads_dia");
    expect(calls[1].params[1]).toBe(20);
  });
});
