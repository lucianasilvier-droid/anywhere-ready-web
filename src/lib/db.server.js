// PostgreSQL connection pool. Works with any Postgres 13+ (local, Docker, managed
// services such as Neon, Supabase, RDS, Railway, Render…) through DATABASE_URL.
import pg from "pg";
import { env } from "@/lib/env.server";

let pool;

function sslOption() {
  const mode = (env("DATABASE_SSL") || "").toLowerCase();
  if (mode === "false" || mode === "disable") return false;
  if (mode === "true" || mode === "require") {
    return { rejectUnauthorized: env("DATABASE_SSL_REJECT_UNAUTHORIZED") !== "false" };
  }
  // Unset: follow `?sslmode=` in the connection string.
  return undefined;
}

export function getPool() {
  if (!pool) {
    const connectionString = env("DATABASE_URL");
    if (!connectionString) {
      throw Object.assign(new Error("Banco de dados não configurado (defina DATABASE_URL)."), { status: 503 });
    }
    pool = new pg.Pool({
      connectionString,
      ssl: sslOption(),
      max: Number(env("DATABASE_POOL_MAX")) || 10,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (error) => console.error("[db] idle client error", error));
  }
  return pool;
}

/** Runs a parameterized query and returns the rows. */
export async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

/**
 * Executes several database statements on one connection and transaction.
 * The callback receives a query function that returns rows like query().
 */
export async function withTransaction(callback) {
  const client = await getPool().connect();
  const txQuery = async (text, params = []) => {
    const result = await client.query(text, params);
    return result.rows;
  };
  try {
    await client.query("BEGIN");
    const result = await callback(txQuery);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[db] transaction rollback failed", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
