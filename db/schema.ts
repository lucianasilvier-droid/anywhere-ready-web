import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Every app entity (Cliente, Lead, Pedido, …) is stored as a JSON document in one
// table, mirroring the document model the app was built on. `entity` names the
// collection; the fields live in `data`.
export const records = pgTable(
  "records",
  {
    id: text().primaryKey(),
    entity: text().notNull(),
    data: jsonb().notNull().default({}),
    createdDate: timestamp("created_date", { withTimezone: true }).notNull().defaultNow(),
    updatedDate: timestamp("updated_date", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
    createdById: text("created_by_id"),
  },
  (t) => [
    index("records_entity_created_idx").on(t.entity, t.createdDate),
    index("records_data_gin_idx").using("gin", t.data),
  ],
);

/* ------------------------------ Authentication ------------------------------ */
// Self-hosted accounts (replaces the hosting provider's identity service).
// Passwords are stored as scrypt hashes; sessions and one-time tokens only as
// SHA-256 hashes, so a database dump never contains a usable credential.

export const authUsers = pgTable("auth_users", {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  roles: jsonb().notNull().default([]),
  provider: text().notNull().default("email"),
  emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    kind: text().notNull(), // "confirm" | "recovery" | "invite"
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId)],
);
