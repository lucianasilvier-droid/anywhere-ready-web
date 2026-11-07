// File storage (representative photos, backup ZIPs). Two interchangeable drivers:
//
//   STORAGE_DRIVER=local (default)  files on disk under STORAGE_DIR (default ./storage).
//                                   Mount it as a volume in Docker so files survive deploys.
//   STORAGE_DRIVER=s3               any S3-compatible bucket (AWS S3, Cloudflare R2,
//                                   Backblaze B2, MinIO, DigitalOcean Spaces, Wasabi…).
//
// `getStore({ name })` returns { set, get, getWithMetadata, delete }, the shape the
// rest of the app already uses; `name` becomes a folder / key prefix.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { env } from "@/lib/env.server";

const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

function checkName(value, what) {
  if (!SAFE.test(value || "") || value.includes("..")) {
    throw Object.assign(new Error(`Nome de ${what} inválido: ${value}`), { status: 400 });
  }
  return value;
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(String(data ?? ""));
}

function asType(buffer, type) {
  if (type === "text") return buffer.toString("utf8");
  if (type === "json") return JSON.parse(buffer.toString("utf8"));
  // "arrayBuffer" (default): an ArrayBuffer of exactly the file's bytes.
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/* --------------------------------- Local disk -------------------------------- */

function localStore(name) {
  const dir = path.resolve(env("STORAGE_DIR") || "./storage", checkName(name, "pasta"));
  const file = (key) => path.join(dir, checkName(key, "arquivo"));
  const meta = (key) => `${file(key)}.meta.json`;
  const missing = (error) => error?.code === "ENOENT";

  return {
    async set(key, data, { metadata } = {}) {
      await mkdir(dir, { recursive: true });
      await writeFile(file(key), toBuffer(data));
      if (metadata) await writeFile(meta(key), JSON.stringify(metadata));
    },
    async get(key, { type } = {}) {
      try {
        return asType(await readFile(file(key)), type);
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    async getWithMetadata(key, { type } = {}) {
      const data = await this.get(key, { type });
      if (data === null) return null;
      const metadata = await readFile(meta(key), "utf8").then(JSON.parse, () => ({}));
      return { data, metadata };
    },
    async delete(key) {
      await rm(file(key), { force: true });
      await rm(meta(key), { force: true });
    },
  };
}

/* ------------------------------- S3-compatible ------------------------------- */

function s3Store(name) {
  const bucket = env("S3_BUCKET");
  const accessKeyId = env("S3_ACCESS_KEY_ID");
  const secretAccessKey = env("S3_SECRET_ACCESS_KEY");
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw Object.assign(new Error("Armazenamento S3 incompleto: defina S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY."), {
      status: 503,
    });
  }
  const region = env("S3_REGION") || "us-east-1";
  const endpoint = (env("S3_ENDPOINT") || `https://s3.${region}.amazonaws.com`).replace(/\/+$/, "");
  const prefix = (env("S3_PREFIX") || "").replace(/^\/+|\/+$/g, "");
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  const folder = checkName(name, "pasta");
  const url = (key) =>
    `${endpoint}/${bucket}/${[prefix, folder, checkName(key, "arquivo")].filter(Boolean).map(encodeURIComponent).join("/")}`;

  async function fetchObject(key) {
    const res = await client.fetch(url(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 GET ${key}: ${res.status}`);
    return res;
  }

  return {
    async set(key, data, { metadata } = {}) {
      const headers = { "content-type": metadata?.contentType || "application/octet-stream" };
      if (metadata) headers["x-amz-meta-data"] = Buffer.from(JSON.stringify(metadata)).toString("base64");
      const res = await client.fetch(url(key), { method: "PUT", body: toBuffer(data), headers });
      if (!res.ok) throw new Error(`S3 PUT ${key}: ${res.status} ${await res.text().catch(() => "")}`);
    },
    async get(key, { type } = {}) {
      const res = await fetchObject(key);
      return res ? asType(Buffer.from(await res.arrayBuffer()), type) : null;
    },
    async getWithMetadata(key, { type } = {}) {
      const res = await fetchObject(key);
      if (!res) return null;
      let metadata = {};
      try {
        const raw = res.headers.get("x-amz-meta-data");
        if (raw) metadata = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      } catch {
        metadata = {};
      }
      if (!metadata.contentType) metadata.contentType = res.headers.get("content-type") || undefined;
      return { data: asType(Buffer.from(await res.arrayBuffer()), type), metadata };
    },
    async delete(key) {
      const res = await client.fetch(url(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`S3 DELETE ${key}: ${res.status}`);
    },
  };
}

export function getStore({ name }) {
  const driver = (env("STORAGE_DRIVER") || "local").toLowerCase();
  if (driver === "s3") return s3Store(name);
  if (driver === "local") return localStore(name);
  throw Object.assign(new Error(`STORAGE_DRIVER desconhecido: ${driver} (use "local" ou "s3").`), { status: 503 });
}
