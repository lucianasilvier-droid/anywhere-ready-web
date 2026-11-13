import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { cloudflare } from "@cloudflare/vite-plugin";
import codigoFonte from "./vite-plugin-codigo-fonte.js";

// Cloudflare Workers build: preserve the project's existing TanStack/React setup
// while adding the official Cloudflare Vite runtime first.
const mode = process.env["NODE_ENV"] === "production" ? "production" : "development";
for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
  if (process.env[key] === undefined) process.env[key] = value;
}

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), codigoFonte()],
  vite: {
    optimizeDeps: {
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
    server: { entry: "server" },
  },
});
