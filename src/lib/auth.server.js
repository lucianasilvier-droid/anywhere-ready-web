// Self-hosted authentication on the app's own PostgreSQL (tables auth_users,
// auth_sessions, auth_tokens — see db/schema.ts). No external identity service:
//
// - passwords: scrypt (node:crypto) with a random salt per account;
// - sessions: a random token in an httpOnly cookie, stored only as its SHA-256;
// - e-mail links (confirmation, password recovery, invitation): one-time tokens,
//   also stored hashed, sent through src/lib/mailer.server.js;
// - optional "Continuar com Google" (OpenID Connect) when GOOGLE_CLIENT_ID /
//   GOOGLE_CLIENT_SECRET are set.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { query } from "@/lib/db.server";
import { appUrl, env, envFlag } from "@/lib/env.server";
import { linkEmail, sendMail, smtpConfigured } from "@/lib/mailer.server";

const scrypt = promisify(scryptCb);

const SESSION_DAYS = () => Number(env("SESSION_DAYS")) || 30;
const cookieName = () => env("SESSION_COOKIE_NAME") || "sid";
const OAUTH_COOKIE = "oauth_state";
const MIN_PASSWORD = 6;

const HOUR = 60 * 60 * 1000;
const TOKEN_TTL = { confirm: 48 * HOUR, recovery: 2 * HOUR, invite: 7 * 24 * HOUR };

export const norm = (v) => String(v ?? "").trim().toLowerCase();

export function authError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
const newId = () => randomBytes(12).toString("hex");

/* --------------------------------- Settings --------------------------------- */

/** E-mail confirmation is on by default only when e-mail can actually be sent. */
export function confirmationRequired() {
  return envFlag("AUTH_REQUIRE_EMAIL_CONFIRMATION", smtpConfigured());
}

export function googleConfigured() {
  return false; // Login Google desativado: o sistema usa somente a conta administrativa autorizada.
}

export function authSettings() {
  return {
    providers: { email: true, google: googleConfigured() },
    signupDisabled: true,
    confirmationRequired: confirmationRequired(),
  };
}

/* --------------------------------- Passwords -------------------------------- */

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(String(password), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function checkPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    throw authError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`, 422);
  }
  if (password.length > 200) throw authError("Senha muito longa.", 422);
}

function checkEmail(email) {
  const address = norm(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw authError("Informe um e-mail válido.", 422);
  return address;
}

/* ---------------------------------- Users ----------------------------------- */

const toIdentity = (row) =>
  row && {
    id: row.id,
    email: row.email,
    name: row.full_name || "",
    roles: Array.isArray(row.roles) ? row.roles : [],
    emailConfirmed: !!row.email_confirmed_at,
    hasPassword: !!row.password_hash,
    provider: row.provider,
  };

async function findByEmail(email) {
  const [row] = await query(`SELECT * FROM auth_users WHERE email = $1`, [norm(email)]);
  return row || null;
}

/** Creates the account when missing (no password yet). Returns the row. */
async function ensureAuthUser(email, { fullName = "", roles = [], confirmed = false, provider = "email" } = {}) {
  const address = checkEmail(email);
  const [row] = await query(
    `INSERT INTO auth_users (id, email, full_name, roles, provider, email_confirmed_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, CASE WHEN $6 THEN now() ELSE NULL END)
     ON CONFLICT (email) DO UPDATE SET updated_at = auth_users.updated_at
     RETURNING *`,
    [newId(), address, fullName, JSON.stringify(roles), provider, confirmed],
  );
  return row;
}

async function addRoles(userId, roles = []) {
  if (!roles.length) return;
  await query(
    `UPDATE auth_users
        SET roles = (SELECT COALESCE(jsonb_agg(DISTINCT r), '[]'::jsonb) FROM jsonb_array_elements(roles || $2::jsonb) r),
            updated_at = now()
      WHERE id = $1`,
    [userId, JSON.stringify(roles)],
  );
}

/** Sets a password directly (CLI / initial administrator). Creates the account if needed. */
export async function setPasswordForEmail(email, password, { roles = [], confirm = true, fullName = "" } = {}) {
  checkPassword(password);
  const row = await ensureAuthUser(email, { fullName, roles, confirmed: confirm });
  await query(
    `UPDATE auth_users SET password_hash = $2, email_confirmed_at = CASE WHEN $3 THEN COALESCE(email_confirmed_at, now()) ELSE email_confirmed_at END, updated_at = now() WHERE id = $1`,
    [row.id, await hashPassword(password), confirm],
  );
  await addRoles(row.id, roles);
  return toIdentity((await query(`SELECT * FROM auth_users WHERE id = $1`, [row.id]))[0]);
}

/* --------------------------------- Sessions --------------------------------- */

function cookieSecure() {
  const forced = env("COOKIE_SECURE");
  if (forced !== undefined) return envFlag("COOKIE_SECURE");
  try {
    const req = getRequest();
    const proto = req?.headers?.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
    return proto.split(",")[0].trim() === "https";
  } catch {
    return appUrl().startsWith("https://");
  }
}

const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: cookieSecure(),
  path: "/",
  maxAge: SESSION_DAYS() * 24 * 60 * 60,
});

/** Creates a session row and returns the raw token (goes in the cookie). */
async function createSession(userId) {
  const raw = randomToken();
  await query(`DELETE FROM auth_sessions WHERE user_id = $1 AND expires_at < now()`, [userId]);
  await query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`, [
    sha256(raw),
    userId,
    SESSION_DAYS(),
  ]);
  return raw;
}

/** Signs the user in for the current request (server functions). */
export async function startSession(userId) {
  const raw = await createSession(userId);
  setCookie(cookieName(), raw, sessionCookieOptions());
}

/** Same, but returns a Set-Cookie header value (server routes that build their own Response). */
export async function startSessionHeader(userId) {
  const raw = await createSession(userId);
  return serializeCookie(cookieName(), raw, sessionCookieOptions());
}

export function serializeCookie(name, value, { httpOnly, sameSite, secure, path = "/", maxAge } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (sameSite) parts.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
  return parts.join("; ");
}

/** The signed-in account for the current request, or null. */
export async function getSessionUser() {
  let raw;
  try {
    raw = getCookie(cookieName());
  } catch {
    return null; // outside a request
  }
  if (!raw) return null;
  const [row] = await query(
    `SELECT u.* FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(raw)],
  );
  return toIdentity(row);
}

export async function endSession() {
  const raw = getCookie(cookieName());
  if (raw) await query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [sha256(raw)]);
  deleteCookie(cookieName(), { path: "/" });
}

/* ------------------------------ One-time tokens ----------------------------- */

async function createToken(userId, kind) {
  const raw = randomToken();
  await query(`DELETE FROM auth_tokens WHERE user_id = $1 AND kind = $2`, [userId, kind]);
  await query(`INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 millisecond')`, [
    sha256(raw),
    userId,
    kind,
    TOKEN_TTL[kind],
  ]);
  return raw;
}

async function consumeToken(raw, kinds) {
  if (!raw || typeof raw !== "string") return null;
  const [row] = await query(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() AND kind = ANY($2::text[])
      RETURNING user_id, kind`,
    [sha256(raw), kinds],
  );
  return row || null;
}

async function sendLink(email, kind, raw) {
  const base = appUrl();
  const messages = {
    confirm: {
      subject: "Confirme seu e-mail",
      title: "Confirme seu e-mail",
      intro: "Clique no botão abaixo para ativar sua conta.",
      cta: "Confirmar e-mail",
      url: `${base}/api/auth/confirm?token=${raw}`,
    },
    recovery: {
      subject: "Redefinição de senha",
      title: "Redefinir sua senha",
      intro: "Recebemos um pedido para redefinir a senha da sua conta. O link vale por 2 horas.",
      cta: "Escolher nova senha",
      url: `${base}/reset-password?token=${raw}`,
    },
    invite: {
      subject: "Você foi convidado",
      title: "Seu acesso está pronto",
      intro: "Você recebeu um convite para acessar o sistema. Escolha uma senha para entrar. O link vale por 7 dias.",
      cta: "Ativar minha conta",
      url: `${base}/reset-password?token=${raw}&invite=1`,
    },
  };
  const m = messages[kind];
  const { text, html } = linkEmail(m);
  return sendMail({ to: email, subject: m.subject, text, html });
}

/* -------------------------------- Public API -------------------------------- */

export async function signup({ email, password, fullName = "" }) {
  throw authError("Cadastros públicos estão desativados. O acesso é exclusivo do administrador.", 403);
  const address = checkEmail(email);
  checkPassword(password);
  const existing = await findByEmail(address);
  if (existing?.password_hash) throw authError("Já existe uma conta com este e-mail. Entre ou use “Esqueceu a senha?”.", 422);
  if (existing) throw authError("Este e-mail já foi convidado. Use “Esqueceu a senha?” para definir sua senha.", 422);

  const needsConfirm = confirmationRequired();
  const row = await ensureAuthUser(address, { fullName: String(fullName || "").trim(), confirmed: !needsConfirm });
  await query(`UPDATE auth_users SET password_hash = $2, updated_at = now() WHERE id = $1`, [row.id, await hashPassword(password)]);

  if (needsConfirm) {
    await sendLink(address, "confirm", await createToken(row.id, "confirm"));
    return { emailVerified: false };
  }
  await startSession(row.id);
  return { emailVerified: true };
}

export async function login(email, password) {
  const row = await findByEmail(email);
  const ok = row?.password_hash ? await verifyPassword(password, row.password_hash) : false;
  if (!ok) throw authError("E-mail ou senha inválidos.", 401);
  if (!row.email_confirmed_at && confirmationRequired()) {
    throw authError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).", 403);
  }
  await startSession(row.id);
  return { ok: true };
}

export async function logout() {
  await endSession();
  return { ok: true };
}

/**
 * Sends a password recovery link. Accounts that only exist as a `User` record
 * (e.g. imported from the previous platform) get an auth account on the fly, so
 * every existing customer can set a password. Never reveals whether the e-mail exists.
 */
export async function requestPasswordRecovery(email) {
  let address;
  try {
    address = checkEmail(email);
  } catch {
    return { ok: true };
  }
  let row = await findByEmail(address);
  if (!row) {
    const [known] = await query(`SELECT data->>'full_name' AS name FROM records WHERE entity = 'User' AND lower(data->>'email') = $1 LIMIT 1`, [
      address,
    ]);
    if (known) row = await ensureAuthUser(address, { fullName: known.name || "" });
  }
  if (row) await sendLink(address, "recovery", await createToken(row.id, "recovery"));
  return { ok: true };
}

/** Recovery or invitation link → new password, e-mail confirmed, signed in. */
export async function resetPasswordWithToken(token, password) {
  checkPassword(password);
  const found = await consumeToken(token, ["recovery", "invite"]);
  if (!found) throw authError("Este link expirou ou já foi usado. Peça um novo.", 410);
  await query(
    `UPDATE auth_users SET password_hash = $2, email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = $1`,
    [found.user_id, await hashPassword(password)],
  );
  await query(`DELETE FROM auth_sessions WHERE user_id = $1`, [found.user_id]);
  await startSession(found.user_id);
  return { ok: true };
}

/** Signed-in user changes their password (checks the current one when they have it). */
export async function changePassword(currentPassword, newPassword) {
  const me = await getSessionUser();
  if (!me) throw authError("Faça login para continuar.", 401);
  checkPassword(newPassword);
  const [row] = await query(`SELECT * FROM auth_users WHERE id = $1`, [me.id]);
  if (row.password_hash && !(await verifyPassword(currentPassword ?? "", row.password_hash))) {
    throw authError("Senha atual incorreta.", 401);
  }
  await query(`UPDATE auth_users SET password_hash = $2, updated_at = now() WHERE id = $1`, [me.id, await hashPassword(newPassword)]);
  // Other devices are signed out; this one gets a fresh session.
  await query(`DELETE FROM auth_sessions WHERE user_id = $1`, [me.id]);
  await startSession(me.id);
  return { ok: true };
}

/** Confirmation link from the sign-up e-mail. Returns the user id (caller signs in). */
export async function confirmEmailToken(token) {
  const found = await consumeToken(token, ["confirm"]);
  if (!found) return null;
  await query(`UPDATE auth_users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = $1`, [
    found.user_id,
  ]);
  return found.user_id;
}

/** Invitation e-mail (team members, administrators). */
export async function inviteAuthUser(email, { roles = [] } = {}) {
  const row = await ensureAuthUser(email, { roles });
  await addRoles(row.id, roles);
  const delivery = await sendLink(row.email, row.password_hash ? "recovery" : "invite", await createToken(row.id, row.password_hash ? "recovery" : "invite"));
  return { ok: true, delivered: delivery.delivered };
}

/* ------------------------------ Google sign-in ------------------------------ */

const googleRedirectUri = () => `${appUrl()}/api/auth/google-callback`;

/** The Google consent URL plus the Set-Cookie that pins the OAuth state. */
export function googleAuthStart(returnTo = "/") {
  if (!googleConfigured()) throw authError("Login com Google não está configurado.", 404);
  const state = randomToken();
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const value = `${state}.${Buffer.from(returnTo || "/").toString("base64url")}`;
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    cookie: serializeCookie(OAUTH_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: cookieSecure(), maxAge: 600 }),
  };
}

/** Handles Google's redirect. Returns { returnTo, cookies } on success. */
export async function googleAuthFinish(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const [savedState, savedReturn] = String(getCookie(OAUTH_COOKIE) || "").split(".");
  if (!code || !state || !savedState || state !== savedState) throw authError("Sessão de login expirada. Tente de novo.", 400);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.access_token) throw authError("O Google recusou o login.", 401);

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  const info = await infoRes.json().catch(() => ({}));
  if (!info.email || info.email_verified === false) throw authError("A conta Google não tem e-mail verificado.", 401);

  const row = await ensureAuthUser(info.email, { fullName: info.name || "", confirmed: true, provider: "google" });
  await query(`UPDATE auth_users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), full_name = COALESCE(NULLIF(full_name, ''), $2) WHERE id = $1`, [
    row.id,
    info.name || "",
  ]);
  let returnTo = "/";
  try {
    returnTo = Buffer.from(savedReturn || "", "base64url").toString("utf8") || "/";
  } catch {
    returnTo = "/";
  }
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\")) returnTo = "/";
  return {
    userId: row.id,
    returnTo,
    cookies: [await startSessionHeader(row.id), serializeCookie(OAUTH_COOKIE, "", { path: "/", maxAge: 0 })],
  };
}
