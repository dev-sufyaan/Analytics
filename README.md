# Analytics by Sufyaan Studio

Simple, privacy-first website analytics. No cookies. No fingerprint theatre. A dashboard you actually enjoy opening.

- **Privacy-first**: cookie-less tracker, daily-salted visitor hashes, no raw IP storage.
- **Edge ingest**: Cloudflare Worker collect (`POST /c`) decoupled from the dashboard.
- **Instant dashboard**: Next.js 15 app reading from Supabase Postgres via typed RPCs.
- **Public share links**: read-only dashboards via `share_token`.

## Stack

| Layer | Choice |
|---|---|
| Ingest | Cloudflare Worker + `t.js` (≤1.5 KB, zero deps) |
| Database | Supabase Postgres (migrations in `supabase/migrations`) |
| Auth | Supabase Auth (`@supabase/ssr`), GitHub OAuth |
| App | Next.js 15 (App Router) |
| Monorepo | pnpm workspaces (`@analytics/*`) |

## Packages

- `apps/web` — Next.js dashboard, marketing, docs, public share
- `apps/collect` — Cloudflare Worker (ingest + rollup cron)
- `packages/db` — Supabase clients, typed RPC wrappers
- `packages/ui` — design-system primitives
- `packages/tracker` — `t.js` source + build

## Develop

```bash
pnpm install
pnpm build:tracker   # sync t.js -> apps/web/public + worker bundle
pnpm dev             # web dashboard
pnpm dev:collect     # worker (wrangler)
pnpm test            # tracker + guard + schema tests
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_SITE_URL` (used for canonical/OG/sitemap URLs) before building.
