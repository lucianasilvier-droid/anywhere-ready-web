#!/usr/bin/env node
// Creates (or updates) an administrator account with a password.
//
//   npm run admin:create -- voce@empresa.com "SenhaForte123" "Seu Nome"
//
// Uses the same scrypt format as src/lib/auth.server.js. Safe to run again: it
// only resets the password and makes sure the account is an administrator.
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(ROOT, ".env")) && typeof process.loadEnvFile === "function") {
  const before = { ...process.env };
  process.loadEnvFile(path.join(ROOT, ".env"));
  Object.assign(process.env, before);
}

const [emailArg, password, ...nameParts] = process.argv.slice(2);
const email = String(emailArg || "").trim().toLowerCase();
const fullName = nameParts.join(" ").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8) {
  console.error('Uso: npm run admin:create -- <email> "<senha com 8+ caracteres>" [nome]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida (veja .env.example).");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;

const sslMode = (process.env.DATABASE_SSL || "").toLowerCase();
const ssl = sslMode === "true" || sslMode === "require" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : sslMode === "false" ? false : undefined;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO auth_users (id, email, password_hash, full_name, roles, email_confirmed_at)
     VALUES ($1, $2, $3, $4, '["admin"]'::jsonb, now())
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), auth_users.full_name),
       roles = (SELECT COALESCE(jsonb_agg(DISTINCT r), '[]'::jsonb) FROM jsonb_array_elements(auth_users.roles || '["admin"]'::jsonb) r),
       email_confirmed_at = COALESCE(auth_users.email_confirmed_at, now()),
       updated_at = now()`,
    [randomBytes(12).toString("hex"), email, passwordHash, fullName],
  );
  const { rows } = await client.query(`SELECT id FROM records WHERE entity = 'User' AND lower(data->>'email') = $1 LIMIT 1`, [email]);
  if (rows[0]) {
    await client.query(
      `UPDATE records SET data = data || $2::jsonb, updated_date = now() WHERE id = $1`,
      [rows[0].id, JSON.stringify({ role: "admin", senha_personalizada: true, ...(fullName ? { full_name: fullName } : {}) })],
    );
  } else {
    await client.query(`INSERT INTO records (id, entity, data) VALUES ($1, 'User', $2::jsonb)`, [
      randomBytes(12).toString("hex"),
      JSON.stringify({ email, full_name: fullName, role: "admin", senha_personalizada: true }),
    ]);
  }
  await client.query("COMMIT");
  console.log(`Administrador pronto: ${email}`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(error.message || error);
  console.error('Dica: rode "npm run db:migrate" antes.');
  process.exitCode = 1;
} finally {
  await client.end();
}
