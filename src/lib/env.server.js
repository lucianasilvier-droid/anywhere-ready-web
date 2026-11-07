// Runtime configuration, read from plain environment variables (a `.env` file in
// development, the container / process manager / panel of the host in production).
// Always call these inside a request or function: never read env at module scope.

/** The value of an environment variable, or undefined when unset or empty. */
export function env(name) {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value === undefined || value === "" ? undefined : value;
}

/** `true` / `false` from an env flag ("1", "true", "yes", "on"), or the fallback. */
export function envFlag(name, fallback = false) {
  const value = env(name);
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

/**
 * Public address of the site, without a trailing slash (links in e-mails, OAuth
 * callbacks, backups). APP_URL wins; the request's own host is the fallback.
 */
export function appUrl() {
  const fixed = env("APP_URL") || env("PUBLIC_URL");
  if (fixed) return fixed.replace(/\/+$/, "");
  return `http://localhost:${env("PORT") || 3000}`;
}
