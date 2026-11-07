// Plain config object (no import from "drizzle-kit") so the config loads even
// when drizzle-kit is executed via npx without local node_modules.
// `npm run db:generate` writes new SQL migrations to db/migrations;
// `npm run db:migrate` applies them to DATABASE_URL (see scripts/migrate.mjs).
export default {
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
};
