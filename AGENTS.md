<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The app is self-hosted first: own login (scrypt + `sid` cookie), PostgreSQL via `DATABASE_URL`, files on disk or S3, `npm start` runs `start.mjs`. Why: it must run on any host without a provider lock-in.
- `vite.config.ts` uses the Lovable config wrapper but disables Nitro outside Lovable unless `NITRO_PRESET`/`VERCEL` is set, so `npm run build` outputs `dist/client` + `dist/server/server.js` for `start.mjs`. Why: one config serves both the Lovable preview and self-hosting.
- Styling is Tailwind v4 loading the legacy `tailwind.config.js` through `@config` in `src/index.css`. Why: the Lovable wrapper always adds the Tailwind v4 plugin.
- Server-only modules are named `*.server.js`; the client dependency scan skips them (see `optimizeDeps` in `vite.config.ts`). Why: `pg`/`nodemailer` cannot be pre-bundled for the browser and broke page loading.
- Keep `@tanstack/react-query` on the same `@tanstack/query-core` version `@tanstack/react-router-ssr-query` needs. Why: a mismatch breaks dependency pre-bundling and the preview hangs.
