#!/usr/bin/env node
// Standalone production server (Node.js 20+, no extra dependencies).
//
//   npm run build && npm start
//
// - serves the static build (dist/client) with long-lived caching for hashed assets;
// - hands every other request to the app's fetch handler (dist/server/server.js):
//   pages (SSR), server functions and API routes;
// - gzip/brotli for text responses, graceful shutdown, /healthz for probes.
//
// Runs as-is on a VPS (pm2/systemd), in Docker, behind Nginx/Caddy/Traefik, or on
// any Node host (Render, Railway, Fly.io, Heroku, cPanel "Node.js app", …).
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { Readable, pipeline } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Load .env when present (Node's built-in loader; real env vars always win).
if (existsSync(path.join(ROOT, ".env")) && typeof process.loadEnvFile === "function") {
  const before = { ...process.env };
  process.loadEnvFile(path.join(ROOT, ".env"));
  Object.assign(process.env, before);
}
process.env.NODE_ENV ||= "production";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_DIR = path.join(ROOT, "dist", "client");
const SERVER_ENTRY = path.join(ROOT, "dist", "server", "server.js");
const MAX_BODY = (Number(process.env.MAX_BODY_MB) || 10) * 1024 * 1024;
const TRUST_PROXY = process.env.TRUST_PROXY !== "false";
const COMPRESS = process.env.COMPRESSION !== "false";

if (!existsSync(SERVER_ENTRY)) {
  console.error(`Build não encontrado em ${SERVER_ENTRY}. Rode "npm run build" antes de "npm start".`);
  process.exit(1);
}
const app = (await import(pathToFileURL(SERVER_ENTRY).href)).default;
const handler = typeof app === "function" ? app : app.fetch.bind(app);

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json",
};

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;

/** Picks br/gzip when the client accepts it and the type is worth compressing. */
function encoder(req, contentType, length) {
  if (!COMPRESS || !COMPRESSIBLE.test(contentType || "")) return null;
  if (length !== undefined && length < 1024) return null;
  const accept = String(req.headers["accept-encoding"] || "");
  if (/\bbr\b/.test(accept)) return { name: "br", stream: () => zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }) };
  if (/\bgzip\b/.test(accept)) return { name: "gzip", stream: () => zlib.createGzip({ level: 6 }) };
  return null;
}

/* ---------------------------------- Static ---------------------------------- */

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (decoded.includes("\0")) return false;
  const file = path.join(CLIENT_DIR, path.normalize(decoded));
  if (!file.startsWith(CLIENT_DIR + path.sep)) return false;
  let info;
  try {
    info = await stat(file);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  res.setHeader("content-type", type);
  res.setHeader("etag", etag);
  res.setHeader("last-modified", info.mtime.toUTCString());
  res.setHeader(
    "cache-control",
    decoded.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  );
  res.setHeader("vary", "accept-encoding");
  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return true;
  }
  const enc = encoder(req, type, info.size);
  if (enc) res.setHeader("content-encoding", enc.name);
  else res.setHeader("content-length", info.size);
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  const source = createReadStream(file);
  if (enc) pipeline(source, enc.stream(), res, () => {});
  else pipeline(source, res, () => {});
  return true;
}

/* ----------------------------------- App ------------------------------------ */

async function* limited(req) {
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Payload too large"), { status: 413 });
    yield chunk;
  }
}

function toRequest(req, controller) {
  const first = (v) => String(v || "").split(",")[0].trim();
  const proto = (TRUST_PROXY && first(req.headers["x-forwarded-proto"])) || (req.socket.encrypted ? "https" : "http");
  const host = (TRUST_PROXY && first(req.headers["x-forwarded-host"])) || req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url || "/", `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || key.startsWith(":")) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else headers.set(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? ReadableStream.from(limited(req)) : undefined,
    duplex: hasBody ? "half" : undefined,
    signal: controller.signal,
  });
}

async function sendResponse(req, res, response) {
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") continue;
    res.setHeader(key, value);
  }
  if (cookies.length) res.setHeader("set-cookie", cookies);

  if (!response.body || req.method === "HEAD" || response.status === 204 || response.status === 304) {
    res.end();
    return;
  }
  const length = Number(response.headers.get("content-length")) || undefined;
  const enc = !response.headers.has("content-encoding") && encoder(req, response.headers.get("content-type"), length);
  const body = Readable.fromWeb(response.body);
  if (enc) {
    res.removeHeader("content-length");
    res.setHeader("content-encoding", enc.name);
    res.setHeader("vary", "accept-encoding");
    pipeline(body, enc.stream(), res, () => {});
  } else {
    pipeline(body, res, () => {});
  }
}

const server = createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  try {
    if (pathname === "/healthz") {
      res.setHeader("content-type", "application/json");
      res.end('{"ok":true}');
      return;
    }
    if (Number(req.headers["content-length"]) > MAX_BODY) {
      res.statusCode = 413;
      res.end("Payload too large");
      return;
    }
    if (await serveStatic(req, res, pathname)) return;

    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) controller.abort();
    });
    const response = await handler(toRequest(req, controller));
    await sendResponse(req, res, response);
  } catch (error) {
    if (error?.name === "AbortError" || req.destroyed) {
      res.destroy();
      return; // client went away mid-request
    }
    console.error("[server]", req.method, req.url, error);
    if (!res.headersSent) {
      res.statusCode = Number(error?.status) || 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end(res.statusCode === 413 ? "Payload too large" : "Internal Server Error");
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.listen(PORT, HOST, () => {
  console.log(`Servidor pronto em http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} recebido, encerrando…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
