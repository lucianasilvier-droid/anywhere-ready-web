# Google NFC Connect

Site, loja e painel (CRM, representantes, pagamentos, backups) em **TanStack Start + React**,
com servidor Node.js próprio e **PostgreSQL**. Não depende de nenhum provedor de hospedagem:
roda em VPS, Docker, servidor tradicional com Nginx, Render, Railway, Fly.io ou Vercel.

## Requisitos

- Node.js **20.12+** (recomendado 22 LTS)
- PostgreSQL **13+** (local, Docker ou gerenciado: Neon, Supabase, RDS, Railway…)

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento em http://localhost:3000 (recarrega ao salvar) |
| `npm run build` | Build de produção em `dist/` (`dist/client` estático + `dist/server/server.js`) |
| `npm start` | Servidor de produção autônomo (`server.mjs`) |
| `npm run preview` | Build + start, para testar a produção localmente |
| `npm run db:migrate` | Aplica as migrações pendentes do banco |
| `npm run db:status` | Lista migrações aplicadas e pendentes |
| `npm run db:generate` | Gera uma nova migração a partir de `db/schema.ts` (drizzle-kit) |
| `npm run admin:create -- email "senha" "Nome"` | Cria/atualiza um administrador |

## Primeira execução (local)

```bash
cp .env.example .env          # ajuste DATABASE_URL e APP_URL
npm ci
npm run db:migrate
npm run admin:create -- voce@empresa.com "SenhaForte123" "Seu Nome"
npm run dev                   # ou: npm run build && npm start
```

## Estrutura

```text
server.mjs                 servidor Node de produção (estáticos + SSR + API, gzip/brotli, /healthz)
src/
  routes/                  páginas e rotas de API (src/routes/api/*)
  components/  hooks/      interface
  lib/
    env.server.js          leitura de variáveis de ambiente
    db.server.js           pool PostgreSQL (DATABASE_URL)
    auth.server.js         login próprio: senhas scrypt, sessões em cookie httpOnly, links por e-mail, Google
    mailer.server.js       e-mail via SMTP (sem SMTP, os links aparecem no log)
    storage.server.js      arquivos: disco local ou bucket S3 compatível
    entities.server.js     camada de dados e regras de acesso
db/
  schema.ts                esquema (drizzle)
  migrations/              migrações SQL versionadas
scripts/                   migrate.mjs, create-admin.mjs
public/                    arquivos estáticos servidos na raiz do site (veja "Recursos estáticos")
deploy/                    nginx.conf, unidade systemd
Dockerfile  docker-compose.yml  ecosystem.config.cjs (pm2)  vercel.json
```

## Recursos estáticos (imagens, fontes, ícones)

Tudo que o site exibe está dentro do projeto — nenhuma imagem, fonte ou ícone
vem de CDN da Netlify, Base44, Wix ou Google Fonts.

```text
public/
  favicon.svg  apple-touch-icon.png   ícones do site
  images/site/                        fotos usadas nas páginas (WebP otimizado, 900 px)
  images/divulgacao/                  artes originais em alta resolução (material de divulgação)
  images/sem-imagem.svg               imagem de reserva quando uma foto não carrega
src/fonts.css                         fontes Inter, Sora e Fraunces (pacotes @fontsource)
```

- Arquivos de `public/` são copiados como estão para `dist/client/` e servidos
  na raiz: `public/images/site/x.webp` vira `/images/site/x.webp` (cache de 1 hora).
- CSS, JS e fontes importados pelo código vão para `dist/client/assets/` com
  hash no nome (cache permanente — `immutable`).
- Os caminhos sempre começam com `/`, então funcionam iguais em Node, Docker,
  Nginx, Vercel ou qualquer domínio.
- Fotos enviadas pelos usuários (logos, fotos de representantes) e backups não
  ficam em `public/`: vão para `STORAGE_DIR` (disco) ou para o bucket S3.

Para trocar uma foto da página inicial, substitua o arquivo em
`public/images/site/` mantendo o nome (ou altere o caminho em
`src/lib/site-content.js`).

## Configuração

Todas as opções estão comentadas em [`.env.example`](.env.example). As principais:

- `APP_URL` – endereço público (links de e-mail, login Google, sitemap).
- `DATABASE_URL` – conexão PostgreSQL. Use `DATABASE_SSL=true` (ou `?sslmode=require`) em bancos gerenciados.
- `SMTP_*` – envio de e-mails (confirmação, recuperação de senha, convites).
- `STORAGE_DRIVER` – `local` (pasta `STORAGE_DIR`) ou `s3` (AWS S3, Cloudflare R2, MinIO, B2, Spaces…).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – botão "Continuar com Google" (opcional).
  URI de redirecionamento autorizado: `<APP_URL>/api/auth/google-callback`.
- `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GROQ_API_KEY`, `WHATSAPP_*` – integrações.

## Hospedagem

### Docker (qualquer servidor)

```bash
cp .env.example .env
docker compose up -d --build          # app + PostgreSQL, migrações automáticas
docker compose exec app node scripts/create-admin.mjs voce@empresa.com "SenhaForte123"
```

Só a imagem: `docker build -t google-nfc-connect .` e
`docker run --env-file .env -p 3000:3000 -v nfc-storage:/app/storage google-nfc-connect`.

### VPS / servidor tradicional (Node + Nginx)

```bash
git clone … /var/www/google-nfc-connect && cd /var/www/google-nfc-connect
cp .env.example .env && nano .env
npm ci && npm run build && npm run db:migrate
pm2 start ecosystem.config.cjs && pm2 save        # ou: deploy/google-nfc-connect.service (systemd)
sudo cp deploy/nginx.conf /etc/nginx/sites-available/google-nfc-connect   # ajuste o domínio
sudo ln -s /etc/nginx/sites-available/google-nfc-connect /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx && sudo certbot --nginx -d seu-dominio.com.br
```

Para atualizar: `git pull && npm ci && npm run build && npm run db:migrate && pm2 restart google-nfc-connect`.

### Render, Railway, Fly.io, Heroku, painéis com "Node.js app"

- Build: `npm ci && npm run build`
- Start: `npm run db:migrate && npm start`
- Variáveis: as do `.env.example`. O servidor usa a porta da variável `PORT`.
- Disco efêmero? Use `STORAGE_DRIVER=s3` ou monte um volume em `STORAGE_DIR`.

### Vercel

`vercel.json` já gera o formato da Vercel (via Nitro, `NITRO_PRESET=vercel`). Configure as variáveis
no painel e use obrigatoriamente `STORAGE_DRIVER=s3` (o disco das funções não é persistente) e um
PostgreSQL gerenciado. Outros provedores serverless: `NITRO_PRESET=<preset> npm run build`.

> Hospedagem **apenas estática** (só Nginx sem Node, GitHub Pages, S3 estático) não é suficiente:
> as páginas, o login, os pagamentos e o painel dependem do servidor Node e do banco de dados.

## Migrando da Netlify

1. **Banco de dados** – exporte o banco antigo e importe no novo PostgreSQL:
   `pg_dump "<url-antiga>" --no-owner --no-acl -t records > dados.sql` e `psql "$DATABASE_URL" < dados.sql`.
   Depois rode `npm run db:migrate`: ele detecta a tabela `records` existente, não reimporta os dados
   e cria só as tabelas novas de login. Alternativa: no painel antigo, gere um backup (ZIP) e use
   "Enviar ZIP" → "Restaurar" no novo painel.
2. **Contas** – senhas da Netlify Identity não podem ser exportadas. Crie o administrador com
   `npm run admin:create`; clientes e equipe usam "Esqueceu a senha?" (o e-mail cadastrado recebe o
   link) ou recebem um convite pelo painel.
3. **Fotos e backups antigos** (Netlify Blobs) – baixe pelo painel antigo e envie de novo, se precisar.
4. **Variáveis** – copie as chaves de integração para o `.env` / painel do novo servidor.
5. **Domínio** – aponte o DNS para o novo servidor e ajuste `APP_URL`, as URLs de webhook de
   pagamento (`/api/payments/mercadopago`, `/api/payments/infinitepay`) e do WhatsApp (`/api/whatsapp/webhook`).

## Saúde e logs

- `GET /healthz` – o processo está de pé (sem consultar o banco).
- `GET /api/health` – app + banco de dados.
- Erros vão para a saída padrão: `docker compose logs -f app`, `pm2 logs`, `journalctl -u google-nfc-connect`.
