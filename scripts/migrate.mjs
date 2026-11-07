#!/usr/bin/env node
// Applies the SQL migrations in db/migrations/<timestamp>_<name>/migration.sql to
// DATABASE_URL, in order, each one once (tracked in the `_migrations` table).
//
//   npm run db:migrate                       apply pending migrations
//   npm run db:migrate -- --status           list applied / pending
//   npm run db:migrate -- --baseline=<name>  mark everything up to <name> as applied
//                                            without running it (database restored
//                                            from a dump that already has those tables)
//
// A database that already has the `records` table but no `_migrations` history
// (e.g. a pg_dump of the previous host) is baselined automatically up to the
// data-import migration, so existing data is never inserted twice.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "db", "migrations");
if (existsSync(path.join(ROOT, ".env")) && typeof process.loadEnvFile === "function") {
  const before = { ...process.env };
  process.loadEnvFile(path.join(ROOT, ".env"));
  Object.assign(process.env, before);
}

const args = process.argv.slice(2);
const baselineArg = args.find((a) => a.startsWith("--baseline="))?.split("=")[1];
const statusOnly = args.includes("--status");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida (veja .env.example).");
  process.exit(1);
}
const sslMode = (process.env.DATABASE_SSL || "").toLowerCase();
const ssl =
  sslMode === "true" || sslMode === "require"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : sslMode === "false"
      ? false
      : undefined;

const migrations = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(DIR, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort();

const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Set((await client.query(`SELECT name FROM _migrations`)).rows.map((r) => r.name));

  let baseline = baselineArg;
  if (!baseline && applied.size === 0) {
    const { rows } = await client.query(`SELECT to_regclass('public.records') IS NOT NULL AS exists`);
    if (rows[0].exists) {
      baseline = migrations.filter((m) => /create_records_table|import_base44_backup_data/.test(m)).pop();
      if (baseline) console.log(`Tabela "records" já existe: marcando migrações até ${baseline} como aplicadas.`);
    }
  }
  if (baseline) {
    if (!migrations.includes(baseline)) throw new Error(`Migração desconhecida em --baseline: ${baseline}`);
    for (const m of migrations) {
      if (applied.has(m)) continue;
      await client.query(`INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [m]);
      applied.add(m);
      console.log(`  baseline  ${m}`);
      if (m === baseline) break;
    }
  }

  if (statusOnly) {
    for (const m of migrations) console.log(`${applied.has(m) ? "  aplicada " : "  pendente "} ${m}`);
  } else {
    let count = 0;
    for (const m of migrations) {
      if (applied.has(m)) continue;
      const sql = readFileSync(path.join(DIR, m, "migration.sql"), "utf8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      process.stdout.write(`  aplicando ${m} (${statements.length} comando(s))… `);
      await client.query("BEGIN");
      try {
        for (const statement of statements) await client.query(statement);
        await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [m]);
        await client.query("COMMIT");
        console.log("ok");
        count++;
      } catch (error) {
        await client.query("ROLLBACK");
        console.log("ERRO");
        throw error;
      }
    }
    console.log(count ? `${count} migração(ões) aplicada(s).` : "Banco de dados já está atualizado.");
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await client.end();
}
