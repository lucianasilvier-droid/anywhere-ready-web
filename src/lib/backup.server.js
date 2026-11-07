// Backups of the system. Each backup is a ZIP kept in file storage (folder "backups", src/lib/storage.server.js)
// with the project source code, a JSON dump of every entity, the settings in force,
// robots.txt / sitemap.xml and a manifest; the BackupSistema record holds its metadata.
// Integration credentials are never written to a backup file.
import { getStore } from "@/lib/storage.server";
import { appUrl } from "@/lib/env.server";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { ENTITY_NAMES } from "@/lib/entity-names";
import { gerarRobots, gerarSitemap } from "@/lib/seo.server";

export const VERSAO_BACKUP = "3.0";
const STORE = "backups";
const PAGE = 1000;
const EXCLUIDAS = new Set(["BackupSistema"]);
// User records are skipped: restoring them could change roles of existing accounts.
const NAO_RESTAURAR = new Set(["BackupSistema", "User"]);

const store = () => getStore({ name: STORE, consistency: "strong" });

async function todos(base44, entidade) {
  const itens = [];
  for (let skip = 0; ; skip += PAGE) {
    const pagina = await base44.entities[entidade].list({ sort: "created_date", limit: PAGE, skip });
    itens.push(...pagina);
    if (pagina.length < PAGE) return itens;
  }
}

function semCredenciais(entidade, registro) {
  if (entidade !== "Integracao" || !registro.config) return registro;
  const config = Object.fromEntries(Object.keys(registro.config).map((k) => [k, ""]));
  return { ...registro, config };
}

async function codigoFonte() {
  try {
    const mod = await import("virtual:codigo-fonte");
    return mod.default || {};
  } catch (error) {
    console.error("[backup] código-fonte indisponível", error);
    return {};
  }
}

const json = (valor) => strToU8(JSON.stringify(valor, null, 2));

function leiaMe({ agora, user, tipo }) {
  return `BACKUP DO SISTEMA — GOOGLE NFC CONNECT
Gerado em: ${agora.toISOString()}
Responsável: ${user?.full_name || user?.email || "—"}
Tipo: ${tipo}

CONTEÚDO
- sistema/          código do projeto (rotas, páginas, componentes, servidor e configurações)
- banco-de-dados/   exportação JSON de cada entidade do banco
- configuracao/     configurações e integrações em vigor
- estrutura/        lista de entidades e contagens de registros
- seo/              robots.txt e sitemap.xml
- manifest.json     metadados, contagens e versão

COMO RESTAURAR
1. Copie o conteúdo de sistema/ para um projeto (mantendo a estrutura) e rode "npm install".
2. Publique e cadastre as credenciais listadas em credenciais-necessarias.txt.
3. Para os dados, use "Restaurar backup" no painel administrativo.

SEGURANÇA
Este pacote não contém chaves de API, senhas, tokens nem arquivos .env.
Guarde o arquivo em local protegido: ele contém dados de clientes (LGPD).
`;
}

const CREDENCIAIS = `CREDENCIAIS NECESSÁRIAS PARA RESTAURAR O SISTEMA

Nenhum valor de chave, senha ou token é incluído neste backup.
Cadastre os valores novamente no painel (Integrações e APIs / Pagamentos) ou nas
variáveis de ambiente do projeto antes de publicar a cópia restaurada:

1. GOOGLE_MAPS_API_KEY  — Google Places API (prospecção no CRM)
2. GROQ_API_KEY         — Groq (análise de leads e mensagens com IA)
3. WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID — WhatsApp Business Platform
4. Credenciais de pagamento (Mercado Pago / InfinitePay) — salvas no painel,
   na entidade Integracao (exportadas em branco).
5. ADMIN_EMAILS — e-mails dos administradores (opcional).
6. DATABASE_URL, AUTH/SMTP e armazenamento (STORAGE_*) — veja .env.example.
   As senhas não fazem parte do backup: cada pessoa usa "Esqueceu a senha?".
`;

export async function criarBackup(base44, { tipo = "completo", user } = {}) {
  const agora = new Date();
  const nome = `backup-${tipo}-${agora.toISOString().replace(/[:.]/g, "-")}.zip`;
  const backup = await base44.entities.BackupSistema.create({
    nome,
    tipo,
    status: "gerando",
    responsavel_email: user?.email || "",
    responsavel_nome: user?.full_name || "",
  });

  try {
    const arquivos = {};
    const dados = {};
    const registros = {};
    for (const entidade of ENTITY_NAMES) {
      if (EXCLUIDAS.has(entidade)) continue;
      const itens = (await todos(base44, entidade)).map((r) => semCredenciais(entidade, r));
      dados[entidade] = itens;
      registros[entidade] = itens.length;
      arquivos[`banco-de-dados/${entidade}.json`] = json(itens);
    }

    arquivos["configuracao/configuracao.json"] = json(dados.Configuracao || []);
    arquivos["configuracao/integracoes.json"] = json(dados.Integracao || []);
    arquivos["estrutura/entidades.json"] = json(
      ENTITY_NAMES.filter((e) => !EXCLUIDAS.has(e)).map((e) => ({ entidade: e, registros: registros[e] || 0 })),
    );

    arquivos["seo/robots.txt"] = strToU8(gerarRobots(appUrl()));
    try {
      arquivos["seo/sitemap.xml"] = strToU8(await gerarSitemap(base44, appUrl()));
    } catch (error) {
      console.error("[backup] sitemap", error);
    }

    const codigo = await codigoFonte();
    for (const [caminho, conteudo] of Object.entries(codigo)) arquivos[`sistema/${caminho}`] = strToU8(conteudo);

    arquivos["manifest.json"] = json({
      sistema: "Google NFC Connect",
      versao_backup: VERSAO_BACKUP,
      gerado_em: agora.toISOString(),
      tipo,
      responsavel: { email: user?.email || "", nome: user?.full_name || "" },
      origem_publica: appUrl(),
      arquivos_de_codigo: Object.keys(codigo).length,
      registros,
    });
    arquivos["leia-me.txt"] = strToU8(leiaMe({ agora, user, tipo }));
    arquivos["credenciais-necessarias.txt"] = strToU8(CREDENCIAIS);

    const zip = zipSync(arquivos, { level: 6, mtime: agora });
    const chave = `${backup.id}.zip`;
    await store().set(chave, zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
    const atualizado = await base44.entities.BackupSistema.update(backup.id, {
      status: "concluido",
      arquivo_uri: chave,
      tamanho: zip.byteLength,
      registros,
    });
    return { backup: atualizado, tamanho: zip.byteLength, arquivos: Object.keys(arquivos).length };
  } catch (error) {
    console.error("[backup] falha ao gerar", error);
    await base44.entities.BackupSistema.update(backup.id, { status: "erro", erro: error?.message || "Falha ao gerar" });
    throw error;
  }
}

/** A same-site download link; the route checks that the caller is an administrator. */
export async function assinarArquivo(_base44, chave, nome) {
  if (!chave) return null;
  const params = new URLSearchParams({ arquivo: chave });
  if (nome) params.set("nome", nome);
  return `/api/backups/download?${params}`;
}

/** The backup file's bytes, or null when it doesn't exist. */
export async function lerArquivo(chave) {
  const buffer = await store().get(chave, { type: "arrayBuffer" });
  return buffer ? new Uint8Array(buffer) : null;
}

export async function excluirArquivo(chave) {
  if (chave) await store().delete(chave);
}

/** The records in a backup file: { Entidade: [registros] }. Reads ZIP and the older JSON format. */
function lerDados(chave, bytes) {
  if (chave.endsWith(".json")) return JSON.parse(strFromU8(bytes)).dados || {};
  const porNome = new Map(ENTITY_NAMES.map((e) => [e.toLowerCase(), e]));
  const dados = {};
  for (const [caminho, conteudo] of Object.entries(
    unzipSync(bytes, { filter: (f) => f.name.startsWith("banco-de-dados/") && f.name.endsWith(".json") }),
  )) {
    const entidade = porNome.get(caminho.slice("banco-de-dados/".length, -".json".length).toLowerCase());
    if (!entidade) continue;
    const itens = JSON.parse(strFromU8(conteudo));
    if (Array.isArray(itens)) dados[entidade] = itens;
  }
  return dados;
}

export async function restaurarBackup(base44, { id, user }) {
  const backup = await base44.entities.BackupSistema.get(id);
  if (!backup?.arquivo_uri) throw Object.assign(new Error("Este backup não possui arquivo."), { status: 400 });
  const bytes = await lerArquivo(backup.arquivo_uri);
  if (!bytes) throw Object.assign(new Error("O arquivo do backup não foi encontrado."), { status: 404 });
  let dados;
  try {
    dados = lerDados(backup.arquivo_uri, bytes);
  } catch {
    throw Object.assign(new Error("O arquivo do backup está corrompido."), { status: 400 });
  }

  // A safety copy of the current state comes first.
  const seguranca = await criarBackup(base44, { tipo: "seguranca", user });

  let total = 0;
  for (const [entidade, itens] of Object.entries(dados)) {
    if (!ENTITY_NAMES.includes(entidade) || NAO_RESTAURAR.has(entidade)) continue;
    for (const registro of itens) {
      if (!registro || typeof registro !== "object") continue;
      // Credentials are not in backups: keep the ones saved now.
      if (entidade === "Integracao") {
        const atual = registro.id ? await base44.entities.Integracao.get(registro.id).catch(() => null) : null;
        if (atual) registro.config = atual.config;
      }
      await base44.entities[entidade].upsertRaw(registro);
      total += 1;
    }
  }

  await base44.entities.BackupSistema.update(id, { restaurado_em: new Date().toISOString() });
  await base44.entities.AtividadeLog.create({
    acao: "Backup restaurado",
    entidade: "BackupSistema",
    registro_id: id,
    detalhe: `${backup.nome} · ${total} registro(s)`,
    autor_email: user?.email || "",
  });
  return { ok: true, total, seguranca: seguranca.backup.nome };
}

// Recebe um ZIP gerado pelo próprio sistema, valida e guarda como um novo backup.
// A restauração em si continua sendo feita por restaurarBackup() (com backup de segurança antes).
const LIMITE_ZIP = 5 * 1024 * 1024; // mantém o upload abaixo do limite do servidor (MAX_BODY_MB)
const LIMITE_DESCOMPACTADO = 40 * 1024 * 1024; // proteção contra "zip bomb"

export function validarZipBackup(bytes) {
  if (!bytes?.byteLength) throw Object.assign(new Error("Arquivo vazio."), { status: 400 });
  if (bytes.byteLength > LIMITE_ZIP)
    throw Object.assign(new Error("ZIP maior que 5 MB. Envie apenas banco-de-dados/ + manifest.json."), { status: 413 });
  // Assinatura "PK" de um arquivo ZIP
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw Object.assign(new Error("Isso não é um arquivo ZIP."), { status: 400 });

  let total = 0;
  let achados;
  try {
    achados = unzipSync(bytes, {
      filter: (f) => {
        const nome = f.name;
        if (nome.includes("..") || nome.startsWith("/")) return false;
        const util = nome === "manifest.json" || (nome.startsWith("banco-de-dados/") && nome.endsWith(".json"));
        if (util) total += f.originalSize;
        return util && total <= LIMITE_DESCOMPACTADO;
      },
    });
  } catch {
    throw Object.assign(new Error("ZIP corrompido ou ilegível."), { status: 400 });
  }
  if (total > LIMITE_DESCOMPACTADO) throw Object.assign(new Error("Conteúdo do ZIP grande demais."), { status: 413 });
  if (!achados["manifest.json"]) throw Object.assign(new Error("manifest.json ausente: não é um backup deste sistema."), { status: 400 });

  let manifest;
  try {
    manifest = JSON.parse(strFromU8(achados["manifest.json"]));
  } catch {
    throw Object.assign(new Error("manifest.json inválido."), { status: 400 });
  }
  if (manifest.sistema !== "Google NFC Connect")
    throw Object.assign(new Error("Este ZIP pertence a outro sistema."), { status: 400 });
  if (String(manifest.versao_backup).split(".")[0] !== VERSAO_BACKUP.split(".")[0])
    throw Object.assign(new Error(`Versão de backup incompatível (${manifest.versao_backup}).`), { status: 400 });

  const porNome = new Map(ENTITY_NAMES.map((e) => [e.toLowerCase(), e]));
  const registros = {};
  for (const [caminho, conteudo] of Object.entries(achados)) {
    if (caminho === "manifest.json") continue;
    const entidade = porNome.get(caminho.slice("banco-de-dados/".length, -".json".length).toLowerCase());
    if (!entidade || NAO_RESTAURAR.has(entidade)) continue;
    let itens;
    try {
      itens = JSON.parse(strFromU8(conteudo));
    } catch {
      throw Object.assign(new Error(`${caminho} não é um JSON válido.`), { status: 400 });
    }
    if (!Array.isArray(itens) || itens.some((r) => !r || typeof r !== "object" || Array.isArray(r)))
      throw Object.assign(new Error(`${caminho} tem formato inesperado.`), { status: 400 });
    registros[entidade] = itens.length;
  }
  return { manifest, registros };
}

export async function importarBackupEnviado(base44, { bytes, user }) {
  const { manifest, registros } = validarZipBackup(bytes);
  const nome = `backup-enviado-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  const backup = await base44.entities.BackupSistema.create({
    nome,
    tipo: "enviado",
    status: "gerando",
    responsavel_email: user?.email || "",
    responsavel_nome: user?.full_name || "",
  });
  const chave = `${backup.id}.zip`;
  await store().set(chave, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const atualizado = await base44.entities.BackupSistema.update(backup.id, {
    status: "concluido",
    arquivo_uri: chave,
    tamanho: bytes.byteLength,
    registros,
  });
  await base44.entities.AtividadeLog.create({
    acao: "Backup enviado",
    entidade: "BackupSistema",
    registro_id: backup.id,
    detalhe: `${nome} · gerado originalmente em ${manifest.gerado_em}`,
    autor_email: user?.email || "",
  });
  return { backup: atualizado, registros, gerado_em: manifest.gerado_em };
}
