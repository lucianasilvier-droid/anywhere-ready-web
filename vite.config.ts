// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind,
// the @ alias and the Lovable preview helpers — do NOT add them again here.
//
// Default build (outside Lovable): dist/client (static files) + dist/server/server.js
// (a standard fetch handler) served by `npm start` (server.mjs) on any Node.js host.
// Serverless targets (Vercel, Netlify, Cloudflare…) are opt-in through Nitro:
//   NITRO_PRESET=vercel npm run build
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import codigoFonte from "./vite-plugin-codigo-fonte.js";

// Make .env available to server code as process.env in `npm run dev`
// (real environment variables always win).
const mode = process.env["NODE_ENV"] === "production" ? "production" : "development";
for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const insideLovable = process.env["LOVABLE_SANDBOX"] === "1" || !!process.env["DEV_SERVER__PROJECT_PATH"];
const wantsNitro = !!(process.env["NITRO_PRESET"] || process.env["VERCEL"]);

export default defineConfig({
  plugins: [codigoFonte()],
  vite: {
    optimizeDeps: {
      // The browser dependency scan must skip server-only code (*.server.js and the
      // virtual source-code module): pg, nodemailer… cannot be bundled for the browser,
      // and the bundler strips these imports from client code anyway.
      exclude: ["pg", "nodemailer", "@anthropic-ai/sdk"],
      rolldownOptions: {
        plugins: [
          {
            name: "skip-server-only-in-scan",
            resolveId(id: string) {
              if (id === "virtual:codigo-fonte" || /\.server(\.[cm]?[jt]sx?)?$/.test(id)) {
                return { id, external: true };
              }
              return null;
            },
          },
        ],
      },
    },
  },
  tanstackStart: {
    // src/server.js: the server entry (logs loader errors).
    server: { entry: "server" },
  },
  // Lovable publishing uses Nitro; a self-hosted build skips it unless a preset is asked for.
  ...(insideLovable || wantsNitro ? {} : { nitro: false as const }),
});
