// Data layer on PostgreSQL (DATABASE_URL). It keeps the same surface the app used with the
// Base44 SDK (`client.entities.Lead.filter(...)`, `client.asServiceRole`, …) so the
// pages and server functions keep working, but every record lives in the `records`
// table (see db/schema.ts): one row per record, the fields as JSONB in `data`.
import { getSessionUser, inviteAuthUser, setPasswordForEmail } from "@/lib/auth.server";
import { query as dbQuery, withTransaction } from "@/lib/db.server";
import { env } from "@/lib/env.server";
import { ENTITY_NAMES } from "@/lib/entity-names";
import { FUSO_CRM, LIMITE_LEADS_DIA_REPRESENTANTE, LIMITE_SITES_DIA_REPRESENTANTE } from "@/lib/crm-limites";

export { ENTITY_NAMES };

const ENTITY_SET = new Set(ENTITY_NAMES);

// E-mail addresses that are always administrators (comma-separated ADMIN_EMAILS),
// so the owner can reach the panel right after the migration.
const DEFAULT_ADMINS = ["motoboybikercourier@gmail.com"];

const COLUMN_FIELDS = { created_date: "created_date", updated_date: "updated_date", created_by: "created_by", created_by_id: "created_by_id" };
const MAX_LIMIT = 1000;

const norm = (v) => String(v ?? "").trim().toLowerCase();

function leadTemContatoValido(record) {
  const telefones = [record?.telefone, record?.whatsapp].map((v) => String(v || "").replace(/[^0-9]/g, ""));
  const telefoneValido = telefones.some((telefone) =>
    telefone.length === 10 || telefone.length === 11 ||
    (telefone.startsWith("55") && (telefone.length === 12 || telefone.length === 13))
  );
  const emails = [record?.email, record?.email_contato, record?.email_publico].map(norm);
  const emailValido = emails.some((email) =>
    email.length <= 254 &&
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) &&
    !/(^|\.)(example|invalid|localhost|test)$/i.test(email.split("@")[1] || "") &&
    !/^(no[-_.]?reply|noreply|do[-_.]?not[-_.]?reply)@/i.test(email)
  );
  return telefoneValido || emailValido;
}

function exigirContatoLead(record) {
  if (!leadTemContatoValido(record)) {
    throw httpError("Empresa sem contato válido. Informe um WhatsApp/telefone válido ou um e-mail válido; sem um desses contatos, o lead não pode entrar no CRM.", 422);
  }
}

export function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}

const query = (text, params = []) => dbQuery(text, params);

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function toRecord(row) {
  if (!row) return null;
  const iso = (d) => (d instanceof Date ? d.toISOString() : d);
  return {
    ...(row.data || {}),
    id: row.id,
    created_date: iso(row.created_date),
    updated_date: iso(row.updated_date),
    created_by: row.created_by ?? undefined,
    created_by_id: row.created_by_id ?? undefined,
  };
}

function stripSystemFields(data) {
  const { id, created_date, updated_date, created_by, created_by_id, ...rest } = data || {};
  return rest;
}

const safeField = (field) => {
  if (!/^[A-Za-z0-9_]+$/.test(field)) throw httpError(`Campo inválido: ${field}`, 400);
  return field;
};

/** Translates a Base44-style filter object into SQL conditions. */
function buildWhere(entity, filter, params) {
  params.push(entity);
  const conds = [`entity = $${params.length}`];
  for (const [rawKey, value] of Object.entries(filter || {})) {
    if (value === undefined) continue;
    const key = safeField(rawKey);
    const isId = key === "id";
    const column = isId ? "id" : COLUMN_FIELDS[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [op, operand] of Object.entries(value)) {
        conds.push(operatorCondition(key, column, op, operand, params));
      }
      continue;
    }
    if (column) {
      if (value === null) conds.push(`${column} IS NULL`);
      else {
        params.push(String(value));
        conds.push(`${column}${isId ? "" : "::text"} = $${params.length}`);
      }
    } else if (value === null) {
      conds.push(`(data->'${key}' IS NULL OR data->'${key}' = 'null'::jsonb)`);
    } else {
      params.push(JSON.stringify({ [key]: value }));
      conds.push(`data @> $${params.length}::jsonb`);
    }
  }
  if (entity === "Lead") conds.push(VALID_LEAD_CONTACT_SQL);
  return conds;
}

function operatorCondition(key, column, op, operand, params) {
  const target = column ? `to_jsonb(${column})` : `data->'${key}'`;
  const jsonParam = (v) => {
    params.push(JSON.stringify(v));
    return `$${params.length}::jsonb`;
  };
  switch (op) {
    case "$in":
    case "$nin": {
      const list = Array.isArray(operand) ? operand : [operand];
      if (!list.length) return op === "$in" ? "FALSE" : "TRUE";
      const items = list.map((v) => jsonParam(v)).join(", ");
      return op === "$in" ? `${target} IN (${items})` : `(${target} IS NULL OR ${target} NOT IN (${items}))`;
    }
    case "$ne":
      return `(${target} IS NULL OR ${target} <> ${jsonParam(operand)})`;
    case "$eq":
      return `${target} = ${jsonParam(operand)}`;
    case "$gt":
      return `${target} > ${jsonParam(operand)}`;
    case "$gte":
      return `${target} >= ${jsonParam(operand)}`;
    case "$lt":
      return `${target} < ${jsonParam(operand)}`;
    case "$lte":
      return `${target} <= ${jsonParam(operand)}`;
    case "$exists":
      return operand ? `${target} IS NOT NULL` : `${target} IS NULL`;
    case "$regex": {
      params.push(String(operand));
      return `${column ? `${column}::text` : `data->>'${key}'`} ~* $${params.length}`;
    }
    default:
      throw httpError(`Operador não suportado: ${op}`, 400);
  }
}

function buildOrder(sort) {
  if (!sort || typeof sort !== "string") return "created_date DESC";
  const desc = sort.startsWith("-");
  const field = safeField(sort.replace(/^[-+]/, ""));
  const dir = desc ? "DESC NULLS LAST" : "ASC NULLS LAST";
  if (field === "id") return `id ${dir}`;
  if (COLUMN_FIELDS[field]) return `${COLUMN_FIELDS[field]} ${dir}, id`;
  return `data->'${field}' ${dir}, created_date DESC`;
}

// filter(query, sort, limit, skip) or filter(query, { sort, limit, skip })
function readOptions(sortOrOptions, limit, skip) {
  if (sortOrOptions && typeof sortOrOptions === "object") {
    return { sort: sortOrOptions.sort, limit: sortOrOptions.limit, skip: sortOrOptions.skip ?? sortOrOptions.offset };
  }
  return { sort: sortOrOptions, limit, skip };
}

/* ------------------------------ Access rules ------------------------------ */

// Which fields tie a record to its owner's e-mail, for signed-in non-admin users.
const OWNER_FIELDS = {
  User: ["email"],
  Cliente: ["email", "user_email"],
  Pedido: ["cliente_email"],
  PlacaNFC: ["cliente_email"],
  ServicoCliente: ["cliente_email"],
  ServicoAtualizacao: ["cliente_email"],
  Relatorio: ["cliente_email"],
};
const PUBLIC_READ = new Set(["Produto"]);
// What a customer may change on their own records.
const OWNER_UPDATABLE = {
  Cliente: ["nome", "empresa", "telefone", "whatsapp", "endereco", "cidade", "estado", "cep", "documento", "instagram", "site", "observacoes"],
};
const OWNER_CREATE = new Set(["ServicoAtualizacao"]);

/* ---------------------- Representantes comerciais (CRM) --------------------- */

// An active sales representative works the CRM and the sales funnel, but only with
// the leads they added themselves (`representante_id` on the Lead).
const REP_SCOPED = new Set(["Lead", "LeadInteraction", "AtividadeLog"]);
// Fields a representative can never set or change on a lead.
// The archive fields (inactive-client control) are changed only by administrators.
const REP_PROTECTED_LEAD_FIELDS = [
  "representante_id", "representante_nome", "representante_email",
  "arquivado", "arquivado_em", "arquivado_motivo", "arquivado_origem", "arquivado_por",
  "arquivado_prazo_dias", "arquivado_ultima_atividade_em", "arquivado_etapa",
  "restaurado_em", "restaurado_por", "ultimo_arquivamento",
];

function repCondition(entity, repId, params) {
  params.push(String(repId));
  const p = `$${params.length}`;
  if (entity === "Lead" || entity === "AtividadeLog") return `data->>'representante_id' = ${p}`;
  return `data->>'lead_id' IN (SELECT id FROM records WHERE entity = 'Lead' AND data->>'representante_id' = ${p})`;
}

const START_OF_TODAY = `(date_trunc('day', now() AT TIME ZONE '${FUSO_CRM}') AT TIME ZONE '${FUSO_CRM}')`;

const phoneContactSql = (field) => {
  const digits = "regexp_replace(COALESCE(data->>'" + field + "', ''), '[^0-9]', '', 'g')";
  return "(length(" + digits + ") IN (10, 11) OR (left(" + digits + ", 2) = '55' AND length(" + digits + ") IN (12, 13)))";
};
const emailContactSql = (field) => {
  const email = "lower(COALESCE(data->>'" + field + "', ''))";
  return "(" + email + " ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'" +
    " AND " + email + " !~ '^(no[-_.]?reply|noreply|do[-_.]?not[-_.]?reply)@'" +
    " AND split_part(" + email + ", '@', 2) !~ '(^|\\.)(example|invalid|localhost|test)$')";
};
const VALID_LEAD_CONTACT_SQL = "(" + [
  phoneContactSql("telefone"),
  phoneContactSql("whatsapp"),
  emailContactSql("email"),
  emailContactSql("email_contato"),
  emailContactSql("email_publico"),
].join(" OR ") + ")";

/** How many leads the representative added today (Brasília time) and how many are left. */
export async function limiteLeadsHoje(repId) {
  const rows = await query(
    `SELECT count(*)::int AS n FROM records WHERE entity = 'Lead' AND data->>'representante_id' = $1 AND created_date >= ${START_OF_TODAY} AND ${VALID_LEAD_CONTACT_SQL}`,
    [String(repId)],
  );
  const usados = rows[0]?.n ?? 0;
  // O limite é individual e fica salvo no cadastro de cada representante.
  // Mantém o padrão de 20 para cadastros antigos sem limite definido.
  const cadastro = await query(
    `SELECT data->>'limite_leads_dia' AS valor FROM records WHERE entity = 'Representante' AND id = $1 LIMIT 1`,
    [String(repId)],
  );
  const valorConfigurado = Number(cadastro[0]?.valor);
  const limite = Number.isSafeInteger(valorConfigurado) && valorConfigurado > 0
    ? Math.min(valorConfigurado, 10000)
    : LIMITE_LEADS_DIA_REPRESENTANTE;
  return { usados, limite, restantes: Math.max(limite - usados, 0) };
}

/** How many demo sites the representative created today (Brasília time) and how many are left. */
export async function limiteSitesHoje(repId) {
  const rows = await query(
    `SELECT count(*)::int AS n FROM records WHERE entity = 'SiteCliente' AND data->>'criado_por_representante_id' = $1 AND created_date >= ${START_OF_TODAY}`,
    [String(repId)],
  );
  const usados = rows[0]?.n ?? 0;
  const limite = LIMITE_SITES_DIA_REPRESENTANTE;
  return { usados, limite, restantes: Math.max(limite - usados, 0) };
}

async function leadDoRepresentante(leadId, repId) {
  if (!leadId) return false;
  const rows = await query(`SELECT 1 FROM records WHERE entity = 'Lead' AND id = $1 AND data->>'representante_id' = $2`, [
    String(leadId),
    String(repId),
  ]);
  return rows.length > 0;
}

async function repWrite(entity, kind, current, patch, rep, user) {
  if (entity === "Lead" && kind === "create") {
    const limite = await limiteLeadsHoje(rep.id);
    if (limite.restantes <= 0) {
      throw httpError(
        `Você já adicionou ${limite.limite} clientes ao CRM hoje, que é o limite diário. Amanhã você pode adicionar mais.`,
        429,
      );
    }
    if (patch.place_id) {
      const dup = await query(`SELECT data->>'representante_id' AS rep FROM records WHERE entity = 'Lead' AND data->>'place_id' = $1 LIMIT 1`, [
        String(patch.place_id),
      ]);
      if (dup[0]) {
        throw httpError(
          dup[0].rep === rep.id
            ? "Esta empresa já está no seu CRM."
            : "Esta empresa já está no CRM e é atendida por outro representante ou pela equipe.",
          409,
        );
      }
    }
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => !REP_PROTECTED_LEAD_FIELDS.includes(k)));
    return {
      ...clean,
      representante_id: rep.id,
      representante_nome: rep.nome || "",
      representante_email: norm(user.email),
      responsavel: clean.responsavel || rep.nome || user.full_name || user.email,
      responsavel_email: norm(user.email),
    };
  }
  if (entity === "Lead" && kind === "update" && current?.representante_id === rep.id) {
    return Object.fromEntries(Object.entries(patch).filter(([k]) => !REP_PROTECTED_LEAD_FIELDS.includes(k)));
  }
  if (entity === "LeadInteraction" && kind === "create" && (await leadDoRepresentante(patch.lead_id, rep.id))) {
    return {
      ...patch,
      autor_email: norm(user.email),
      representante_nome: rep.nome || "",
      notificacao_lida: false,
    };
  }
  if (entity === "LeadInteraction" && kind === "update" && (await leadDoRepresentante(current?.lead_id, rep.id))) {
    const { lead_id, ...rest } = patch;
    return rest;
  }
  if (entity === "AtividadeLog" && kind === "create") {
    return {
      ...patch,
      representante_id: rep.id,
      representante_nome: rep.nome || "",
      autor: rep.nome || user.full_name || user.email,
      autor_email: norm(user.email),
      lida: false,
    };
  }
  return null;
}

function ownerCondition(entity, email, params) {
  const fields = OWNER_FIELDS[entity];
  if (!fields || !email) return "FALSE";
  params.push(email);
  const p = `$${params.length}`;
  return `(${fields.map((f) => `lower(data->>'${f}') = ${p}`).join(" OR ")})`;
}

const ownsRecord = (entity, record, email) =>
  !!email && (OWNER_FIELDS[entity] || []).some((f) => norm(record?.[f]) === email);

/* ------------------------------ Entity handle ----------------------------- */

function entityHandle(entity, access) {
  if (!ENTITY_SET.has(entity)) throw httpError(`Entidade desconhecida: ${entity}`, 400);

  // Returns the extra WHERE condition for reads, or throws when reading is not allowed.
  async function readScope(params) {
    if (await access.isPrivileged()) return null;
    if (PUBLIC_READ.has(entity)) return null;
    const user = await access.user();
    if (!user) throw httpError("Faça login para continuar.", 401);
    if (REP_SCOPED.has(entity)) {
      const rep = await access.representante?.();
      if (rep) return repCondition(entity, rep.id, params);
    }
    if (!OWNER_FIELDS[entity]) throw httpError("Você não tem permissão para acessar estes dados.", 403);
    return ownerCondition(entity, norm(user.email), params);
  }

  async function requireWrite(kind, current, patch) {
    if (await access.isPrivileged()) return patch;
    const user = await access.user();
    if (!user) throw httpError("Faça login para continuar.", 401);
    const email = norm(user.email);
    if (REP_SCOPED.has(entity)) {
      const rep = await access.representante?.();
      if (rep) {
        const allowed = await repWrite(entity, kind, current, patch, rep, user);
        if (allowed) return allowed;
      }
    }
    if (kind === "create" && OWNER_CREATE.has(entity)) {
      return { ...patch, cliente_email: email };
    }
    if (kind === "update" && OWNER_UPDATABLE[entity] && ownsRecord(entity, current, email)) {
      const allowed = OWNER_UPDATABLE[entity];
      return Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    }
    throw httpError("Você não tem permissão para alterar estes dados.", 403);
  }

  async function select(filter, sortOrOptions, limit, skip) {
    const opts = readOptions(sortOrOptions, limit, skip);
    const params = [];
    const conds = buildWhere(entity, filter, params);
    const scope = await readScope(params);
    if (scope) conds.push(scope);
    const lim = Math.min(Math.max(Number(opts.limit) || 200, 1), MAX_LIMIT);
    const off = Math.max(Number(opts.skip) || 0, 0);
    const rows = await query(
      `SELECT * FROM records WHERE ${conds.join(" AND ")} ORDER BY ${buildOrder(opts.sort)} LIMIT ${lim} OFFSET ${off}`,
      params,
    );
    return rows.map(toRecord);
  }

  async function getRaw(id) {
    const rows = await query(`SELECT * FROM records WHERE entity = $1 AND id = $2`, [entity, String(id)]);
    return toRecord(rows[0]);
  }

  return {
    list: (sortOrOptions, limit, skip) => select({}, sortOrOptions, limit, skip),
    filter: (filter, sortOrOptions, limit, skip) => select(filter || {}, sortOrOptions, limit, skip),

    async get(id) {
      const params = [];
      const conds = buildWhere(entity, { id }, params);
      const scope = await readScope(params);
      if (scope) conds.push(scope);
      const rows = await query(`SELECT * FROM records WHERE ${conds.join(" AND ")} LIMIT 1`, params);
      if (!rows[0]) throw httpError("Registro não encontrado.", 404);
      return toRecord(rows[0]);
    },

    async count(filter = {}) {
      const params = [];
      const conds = buildWhere(entity, filter, params);
      const scope = await readScope(params);
      if (scope) conds.push(scope);
      const rows = await query(`SELECT count(*)::int AS n FROM records WHERE ${conds.join(" AND ")}`, params);
      return rows[0]?.n ?? 0;
    },

    async create(input) {
      const entrada = stripSystemFields(input);
      if (entity === "Lead") exigirContatoLead(entrada);
      const data = await requireWrite("create", null, entrada);
      if (entity === "Lead") exigirContatoLead(data);
      const user = await access.user();
      if (entity === "Lead") {
        const placeId = String(data.place_id || "");
        const repId = String(data.representante_id || "");
        const record = await withTransaction(async (tx) => {
          // Cada trava é adquirida em um comando separado. Assim, após aguardar
          // outra transação, a próxima consulta recebe um snapshot atualizado.
          if (placeId) {
            await tx(
              "SELECT pg_advisory_xact_lock(hashtextextended('google-nfc-lead-place:' || $1, 0))",
              [placeId],
            );
          }
          if (repId) {
            await tx(
              `SELECT pg_advisory_xact_lock(hashtextextended(
                'google-nfc-lead-daily:' || $1 || ':' || (now() AT TIME ZONE '${FUSO_CRM}')::date::text, 0
              ))`,
              [repId],
            );
          }

          if (placeId) {
            const duplicado = await tx(
              "SELECT id FROM records WHERE entity = 'Lead' AND data->>'place_id' = $1 LIMIT 1",
              [placeId],
            );
            if (duplicado[0]) {
              throw httpError("Esta empresa já está no CRM. Atualize a lista antes de cadastrar novamente.", 409);
            }
          }

          if (repId) {
            const limites = await tx(
              `SELECT CASE
                 WHEN jsonb_typeof(data->'limite_leads_dia') = 'number'
                   AND (data->>'limite_leads_dia')::numeric BETWEEN 1 AND 10000
                   AND trunc((data->>'limite_leads_dia')::numeric) = (data->>'limite_leads_dia')::numeric
                   THEN (data->>'limite_leads_dia')::int
                 ELSE ${LIMITE_LEADS_DIA_REPRESENTANTE}
               END AS n
                 FROM records
                WHERE entity = 'Representante' AND id = $1
                LIMIT 1`,
              [repId],
            );
            const usados = await tx(
              `SELECT count(*)::int AS n
                 FROM records
                WHERE entity = 'Lead'
                  AND data->>'representante_id' = $1
                  AND created_date >= ${START_OF_TODAY}
                  AND ${VALID_LEAD_CONTACT_SQL}`,
              [repId],
            );
            const limite = Number(limites[0]?.n ?? LIMITE_LEADS_DIA_REPRESENTANTE);
            if (Number(usados[0]?.n || 0) >= limite) {
              throw httpError(
                `Você já adicionou ${limite} clientes ao CRM hoje, que é o limite diário. Amanhã você pode adicionar mais.`,
                429,
              );
            }
          }

          const inseridos = await tx(
            "INSERT INTO records (id, entity, data, created_by, created_by_id) VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING *",
            [newId(), entity, JSON.stringify(data), user?.email ?? null, user?.id ?? null],
          );
          return inseridos[0];
        });
        return toRecord(record);
      }
      const rows = await query(
        `INSERT INTO records (id, entity, data, created_by, created_by_id) VALUES ($1, $2, $3::jsonb, $4, $5) RETURNING *`,
        [newId(), entity, JSON.stringify(data), user?.email ?? null, user?.id ?? null],
      );
      return toRecord(rows[0]);
    },

    async bulkCreate(list = []) {
      const out = [];
      for (const item of list) {
        if (entity === "Lead" && !leadTemContatoValido(stripSystemFields(item))) continue;
        out.push(await this.create(item));
      }
      return out;
    },

    async update(id, patch) {
      const current = await getRaw(id);
      if (!current) throw httpError("Registro não encontrado.", 404);
      const changes = await requireWrite("update", current, stripSystemFields(patch));
      if (entity === "Lead") exigirContatoLead({ ...current, ...changes });
      const rows = await query(
        `UPDATE records SET data = data || $3::jsonb, updated_date = now() WHERE entity = $1 AND id = $2 RETURNING *`,
        [entity, String(id), JSON.stringify(changes)],
      );
      return toRecord(rows[0]);
    },

    async bulkUpdate(list = []) {
      const out = [];
      for (const { id, ...patch } of list) out.push(await this.update(id, patch));
      return out;
    },

    async delete(id) {
      if (!(await access.isPrivileged())) throw httpError("Você não tem permissão para excluir estes dados.", 403);
      await query(`DELETE FROM records WHERE entity = $1 AND id = $2`, [entity, String(id)]);
      return { ok: true };
    },

    async deleteMany(filter = {}) {
      if (!(await access.isPrivileged())) throw httpError("Você não tem permissão para excluir estes dados.", 403);
      const params = [];
      const conds = buildWhere(entity, filter, params);
      const rows = await query(`DELETE FROM records WHERE ${conds.join(" AND ")} RETURNING id`, params);
      return rows.length;
    },

    /** Restores a record with a known id (used by backup restore). */
    async upsertRaw(record) {
      if (!(await access.isPrivileged())) throw httpError("Sem permissão.", 403);
      const { id, created_date, updated_date, created_by, created_by_id } = record;
      await query(
        `INSERT INTO records (id, entity, data, created_date, updated_date, created_by, created_by_id)
         VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()), COALESCE($5::timestamptz, now()), $6, $7)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_date = EXCLUDED.updated_date`,
        [String(id || newId()), entity, JSON.stringify(stripSystemFields(record)), created_date || null, updated_date || null, created_by || null, created_by_id || null],
      );
    },
  };
}

function entitiesProxy(access) {
  const cache = new Map();
  return new Proxy(
    {},
    {
      get(_, name) {
        if (typeof name !== "string" || name === "then") return undefined;
        if (!cache.has(name)) cache.set(name, entityHandle(name, access));
        return cache.get(name);
      },
    },
  );
}

/* ------------------------------ Current user ------------------------------ */

function adminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || "").split(",").map(norm).filter(Boolean);
  return new Set([...DEFAULT_ADMINS, ...fromEnv]);
}

const serviceAccess = { isPrivileged: async () => true, user: async () => null };
const service = entitiesProxy(serviceAccess);

/**
 * The visitor as the app knows it: the signed-in account (src/lib/auth.server.js)
 * merged with its `User` record (role, funcao, …). Creates the record on first sign-in.
 */
export async function resolveCurrentUser() {
  const identity = await getSessionUser();
  if (!identity?.email) return null;

  const email = norm(identity.email);
  const [existing] = await service.User.filter({ email }, { limit: 1 });
  const identityAdmin = (identity.roles || []).includes("admin") || adminEmails().has(email);
  const fullName = identity.name || existing?.full_name || "";

  let record = existing;
  if (!record) {
    record = await service.User.create({
      email,
      full_name: fullName,
      role: identityAdmin ? "admin" : "user",
      identity_id: identity.id,
    });
  } else if (record.identity_id !== identity.id || (identityAdmin && record.role !== "admin")) {
    record = await service.User.update(record.id, {
      identity_id: identity.id,
      ...(identityAdmin ? { role: "admin" } : {}),
      ...(!record.full_name && fullName ? { full_name: fullName } : {}),
    });
  }
  return { ...record, email, full_name: record.full_name || fullName, role: identityAdmin ? "admin" : record.role || "user" };
}

/** Sends an invitation e-mail and records the role the person gets. */
async function inviteUser(email, role = "user") {
  const address = norm(email);
  if (!address) throw httpError("Informe um e-mail.", 400);
  const [existing] = await service.User.filter({ email: address }, { limit: 1 });
  if (existing) await service.User.update(existing.id, { role: role === "admin" ? "admin" : existing.role || "user" });
  else await service.User.create({ email: address, role: role === "admin" ? "admin" : "user", convidado_em: new Date().toISOString() });
  return inviteAuthUser(address, { roles: role === "admin" ? ["admin"] : [] });
}

/**
 * A client acting as the visitor (access rules apply), with `asServiceRole` for
 * trusted server code. The visitor is resolved lazily, once per request.
 */
export function createServerClient() {
  let userPromise;
  const user = () => (userPromise ??= resolveCurrentUser().catch(() => null));
  let repPromise;
  // The visitor's active sales-representative record, or null.
  const representante = () =>
    (repPromise ??= user()
      .then(async (u) => {
        if (!u?.email) return null;
        const [rep] = await service.Representante.filter({ user_email: norm(u.email) }, { limit: 1 });
        return rep && (rep.status || "ativo") === "ativo" ? rep : null;
      })
      .catch(() => null));
  const visitorAccess = {
    user,
    representante,
    isPrivileged: async () => (await user())?.role === "admin",
  };
  const requireAdmin = async () => {
    if (!(await visitorAccess.isPrivileged())) throw httpError("Apenas administradores podem executar esta ação.", 403);
  };

  return {
    entities: entitiesProxy(visitorAccess),
    representante,
    auth: {
      me: async () => {
        const u = await user();
        if (!u) throw httpError("Unauthorized", 401);
        return u;
      },
    },
    users: {
      inviteUser: async (email, role) => {
        await requireAdmin();
        return inviteUser(email, role);
      },
    },
    asServiceRole: {
      entities: service,
      users: { inviteUser },
    },
  };
}

/* ------------------------- Administrator first access ------------------------ */

/**
 * Sends an administrator (DEFAULT_ADMINS / ADMIN_EMAILS) a link to set their
 * password: an invitation when the account has no password yet, a recovery link
 * otherwise. Every link goes to the administrator's own mailbox, so nobody else
 * gains access. Other e-mails are silently ignored (the caller always shows the
 * same message).
 */
export async function sendAdminAccessLink(email) {
  const address = norm(email);
  if (!address || !adminEmails().has(address)) return { ok: true };
  await inviteAuthUser(address, { roles: ["admin"] });
  return { ok: true };
}

/* ---------------------- Administrator initial password ---------------------- */

// Optional starting password for the owner, configured on the server
// (INITIAL_ADMIN_EMAIL + INITIAL_ADMIN_PASSWORD). It only works until the
// administrator sets their own password in the panel (Configurações → Alterar
// senha); after that it is refused. Unset INITIAL_ADMIN_PASSWORD disables it.
// Prefer `npm run admin:create` for the first access.

/**
 * Called by the login page after a failed sign-in. When the owner signs in with the
 * starting password and hasn't chosen their own yet, makes sure their account
 * exists, is confirmed and has that password, so the next attempt works.
 */
export async function prepareInitialAdminLogin(email, password) {
  const initialEmail = norm(env("INITIAL_ADMIN_EMAIL") || DEFAULT_ADMINS[0]);
  const initialPassword = env("INITIAL_ADMIN_PASSWORD");
  const address = norm(email);
  if (!initialPassword || address !== initialEmail || password !== initialPassword) return { ok: false };

  const [record] = await service.User.filter({ email: address }, { limit: 1 });
  if (record?.senha_personalizada) return { ok: false };

  await setPasswordForEmail(address, password, { roles: ["admin"], confirm: true });
  if (record) await service.User.update(record.id, { role: "admin" });
  else await service.User.create({ email: address, role: "admin" });
  return { ok: true };
}

/** Records that the signed-in user chose their own password (retires the starting one). */
export async function markPasswordChanged(userId) {
  await service.User.update(userId, { senha_personalizada: true, senha_alterada_em: new Date().toISOString() });
  return { ok: true };
}
