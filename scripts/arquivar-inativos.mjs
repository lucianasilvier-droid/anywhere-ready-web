#!/usr/bin/env node
// Arquiva os clientes do CRM que passaram do prazo de inatividade (configurado no painel
// em "Clientes inativos"). O painel já faz isso sozinho, no máximo uma vez por hora,
// sempre que um administrador o abre. Use este script para rodar em horário fixo:
//
//   npm run inativos:arquivar
//
// Exemplo de cron diário às 03:00 (horário do servidor):
//   0 3 * * * cd /caminho/do/app && npm run inativos:arquivar >> logs/inativos.log 2>&1
//
// É seguro rodar várias vezes: quem já está arquivado não é tocado.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { executarArquivamento } from "../src/lib/inatividade-motor.server.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(ROOT, ".env")) && typeof process.loadEnvFile === "function") {
  const before = { ...process.env };
  process.loadEnvFile(path.join(ROOT, ".env"));
  Object.assign(process.env, before);
}

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

const pool = new pg.Pool({ connectionString: url, ssl, max: 2 });
const query = async (text, params = []) => (await pool.query(text, params)).rows;

try {
  const r = await executarArquivamento(query, { origem: "agendado" });
  console.log(
    `[${new Date().toISOString()}] prazo ${r.prazoDias} dias · ${r.analisados} cliente(s) analisado(s) · ${r.arquivados} arquivado(s).`,
  );
  for (const c of r.lista) console.log(`  arquivado: ${c.empresa} (${c.id})`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
