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
