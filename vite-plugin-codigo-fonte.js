// Makes the project's source code available to the server as `virtual:codigo-fonte`,
// so the admin backup can ship a copy of the system. Only text files from the
// folders below are included; secrets (.env), dependencies and build output never are.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PASTAS = ["src", "db", "scripts", "deploy", "public"];
const ARQUIVOS_RAIZ = [
  "package.json",
  "server.mjs",
  "Dockerfile",
  ".dockerignore",
  "docker-compose.yml",
  "ecosystem.config.cjs",
  "vercel.json",
  ".env.example",
  "README.md",
  "vite.config.ts",
  "eslint.config.js",
  "vite-plugin-codigo-fonte.js",
  "drizzle.config.ts",
  "tailwind.config.js",
  "components.json",
];
const EXTENSOES = /\.(js|jsx|ts|tsx|mjs|cjs|css|json|sql|html|md|txt|xml|svg|toml|conf|yml|yaml|service)$/i;
const IGNORAR = /(^|\/)(node_modules|dist|storage|\.git)(\/|$)|(^|\/)\.env(?!\.example$)/;
const MAX_ARQUIVO = 512 * 1024;
const ID = "virtual:codigo-fonte";
const RESOLVIDO = "\0" + ID;

function listar(raiz, pasta, saida) {
  let nomes;
  try {
    nomes = readdirSync(join(raiz, pasta));
  } catch {
    return;
  }
  for (const nome of nomes) {
    const caminho = join(pasta, nome);
    const rel = relative(raiz, join(raiz, caminho)).split(sep).join("/");
    if (IGNORAR.test(rel)) continue;
    const info = statSync(join(raiz, caminho));
    if (info.isDirectory()) listar(raiz, caminho, saida);
    else if (EXTENSOES.test(nome) && info.size <= MAX_ARQUIVO) saida.push(rel);
  }
}

export default function codigoFonte() {
  let raiz = process.cwd();
  return {
    name: "codigo-fonte",
    configResolved(config) {
      raiz = config.root;
    },
    resolveId(id) {
      if (id === ID) return RESOLVIDO;
    },
    load(id) {
      if (id !== RESOLVIDO) return;
      const caminhos = [];
      for (const pasta of PASTAS) listar(raiz, pasta, caminhos);
      for (const arquivo of ARQUIVOS_RAIZ) {
        try {
          if (statSync(join(raiz, arquivo)).isFile()) caminhos.push(arquivo);
        } catch {
          // optional file
        }
      }
      const arquivos = Object.fromEntries(caminhos.map((c) => [c, readFileSync(join(raiz, c), "utf8")]));
      return `export default ${JSON.stringify(arquivos)};`;
    },
  };
}
