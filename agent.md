# AGENT.md

You are the implementation agent for a **privacy-first website analytics product**.
You write production code, not slides. You follow this file over any prior habit
(shadcn defaults, Inter-on-white SaaS clichés, Umami’s UI, PostHog’s density,
and the earlier “Supabase Edition” draft).

If a request conflicts with this file, **this file wins**. If something is
unspecified, infer from the design system and the product principles below —
do not invent a new palette, type scale, radius, or shadow.

---

## 0. One-sentence product

A cookie-less, Umami-class analytics product: tiny tracker, edge ingest,
instant dashboard, public share links. Separate brand from form2lead.
Built for $0 (domain excepted). Not a Umami fork. Not a PostHog clone.

Product name: **Analytics by Sufyaan Studio** (wordmark: "analytics"; studio: "Sufyaan Studio").
Package / repo: `analytics`. Workspace scope: `@analytics/*`. Tracker global: `window.analytics`. Script: `t.js`.
Collect path: `POST /c` on the **Cloudflare Worker** (first-party route).
Optional alias `/stats.js` for the script only. Public share id: `share_token`.

---

## 1. Mission

Build a **suite of separate products** that share a customer, not a monolith
that tries to be every SaaS category.

| Status | Product | Notes |
|---|---|---|
| Live | form2lead.com | Forms. Do not merge codebases. Cross-sell later. |
| **NOW** | Analytics (this repo) | Privacy-first pageviews + events |
| Later | Uptime, feedback widget, consent banner | Only after analytics has paying users |
| Never at $0 | Email marketing, AI chatbot, session replay | Cost explodes |

**Buyer:** indie hackers, agencies, the same people who paste a form snippet.
**Install moment:** one `<script>` tag. Same motion as form2lead.
**Promise:** fast, private, easy to operate, charts that feel instant.
**Anti-promise:** we are not a product-analytics suite.

Positioning sentence (marketing + empty states):

> Simple privacy-first analytics. No cookies. No fingerprint theatre. A
> dashboard you actually enjoy opening.

---

## 2. Non-goals (do not build)

- Forking or reskinning Umami / Plausible / PostHog
- Session replay, heatmaps, source maps, error tracking
- Feature flags, A/B, user-level identity graphs
- Teams / SSO / orgs (until someone pays)
- Email marketing, AI chatbot, deliverability
- ClickHouse / Tinybird / Redis on day one
- Prisma, Clerk, Auth0, Better Auth, Neon, PlanetScale, AWS, K8s, a VPS “to save money”
- `pg_cron` (not available on Supabase Free — do not put it in migrations)
- Dark-mode toggle as a v1 feature (surfaces already alternate by band)
- A second accent colour “just for charts”
- Full-pill primary buttons, soft card shadows, purple-indigo Tailwind kits
- Storing raw IP addresses
- Spending money. Domain is the only allowed cost.
- Proxying collect through Next.js / Vercel (re-couples ingest to the dashboard)

---

## 3. Architecture (Umami ideas, our code, Supabase Free)

```
Visitor
  → t.js (≤1.5 KB gzip, no cookies, sendBeacon)
  → Cloudflare Worker  POST /c          # ingest ≠ dashboard
       size cap, bot filter, CF geo, hash visitor, 30-min session,
       domain allowlist via KV, drop IP, 2 KB props cap
  → ctx.waitUntil → Supabase REST RPC ingest_event (service_role)
  → Cloudflare Cron (00:15 UTC) → RPC run_daily_rollup
  → Next.js 15 dashboard reads via user-scoped RPCs / RLS
       past complete days: daily_stats
       today + realtime + breakdowns: raw events inside retention
```

Copy from Umami **as ideas only**:
tiny tracker · collect/session/event model · query-layer abstraction ·
share links · privacy by design · collect stays up if the UI is down.

Do **not** copy: their Next monolith for ingest, Prisma, their pixels, their
CSS, their component names.

### Why this is not the previous Supabase draft

| Previous draft | This file |
|---|---|
| `pg_cron` in the migration | Cloudflare Cron → RPC. Free-safe. |
| Dashboard RPCs are `SECURITY DEFINER` with no `auth.uid()` check (IDOR) | Every user-facing RPC checks ownership. Ingest RPCs are `service_role` only. |
| `get_*` reads raw `website_events` forever | Overview for past days reads `daily_stats`. Breakdowns only inside retention. |
| `pageview_count + 1` on custom events | Increment pageviews only when `event_name IS NULL`. |
| Duration `+=` full elapsed on every hide | Tracker sends **delta**. RPC adds clamped delta. |
| Daily-salted hash used as the session key | `visitor_hash` is daily-salted. Sessions are 30-min idle, Umami-class. |
| Rollup `SUM(duration)` after joining events (fan-out) | Roll up from `sessions`, not from the join. |
| Next.js rewrite `/api/collect` → Worker | Browser posts **straight to the Worker** on a first-party CF route. |
| KV listed, never used | Worker caches `site:{uuid}` in KV. |
| “Guarantees <500 MB forever” | False. Retention + free-tier event caps keep us honest. |
| Design system truncated | Full Together system restored. `--color-body` split for WCAG. |

### Stack (locked)

| Layer | Choice | Free reality |
|---|---|---|
| Domain / DNS / SSL / CDN | Cloudflare | Free. Pay only the domain. |
| Ingest + `t.js` host | Cloudflare Worker + **route** `https://{domain}/c` and `https://{domain}/t.js` | 100k req/day class. Ingest must not touch Vercel. |
| Site cache | Cloudflare KV `site:{uuid}` | Required on the collect path |
| Rollup cron | Cloudflare Cron Trigger on the same Worker (`POST /internal/rollup`) | Free |
| Database | Supabase Postgres | 500 MB. Projects **pause after 7 idle days**. |
| Auth | Headless Supabase Auth + `@supabase/ssr` | 50k MAU. Prefer **GitHub OAuth**. Built-in SMTP is tiny on Free. |
| Keep-alive | GitHub Action every 3 days | Mandatory on Free or the DB pauses and **events silently drop** |
| App | Next.js 15 App Router | Cloudflare Pages preferred, Vercel Hobby OK |
| Email | Resend if we leave GitHub-only auth | 3k/mo |
| UI | Tailwind + this design system (not default shadcn theme) | — |
| Charts | **uPlot** only | No Chart.js, no Recharts |
| Tracker | Vanilla JS, zero deps | ≤1.5 KB gzip |
| Package manager | pnpm monorepo | — |

Do **not** add Drizzle “because the first AGENT.md said so.” Supabase + SQL
migrations + generated types are the data layer. All dashboard reads go through
`packages/db` helpers so the UI never inlines SQL or guesses RPC names.

Monorepo:

```
apps/web          Next.js marketing + app + public share
apps/collect      Cloudflare Worker (ingest + cron rollup)
packages/db       Supabase clients, typed RPC wrappers, website KV shape
packages/tracker  t.js source
packages/ui       design-system primitives ONLY
supabase/         migrations (SQL files, not the SQL editor as source of truth)
```

### $0 economics (customer + infra)

Customer free: 1 site, 10k–25k events/mo, **30-day** raw retention, no CSV.
Paid later (~$8–12): more events, 90-day or 1–2 year raw, more sites.
`data_retention_days` default is **30**, not 90. Rollup rows are kept longer.

Engineering:
- Block ingest when the site is over quota (still return 204)
- Drop bots, preview hosts unless allowed (`*.vercel.app`, `localhost` unless `data-dev`)
- Dedupe same visitor + path within 1s (best-effort in RPC)
- Delete raw events + idle sessions past retention in `run_daily_rollup`
- Keep `daily_stats` (they are tiny)
- **Never** put `SUPABASE_SERVICE_ROLE_KEY` in Next.js `NEXT_PUBLIC_*` or the client bundle. Worker secret + CF Cron secret only.
- Keep-alive Action is not optional on Free.

Honest metric language:
- **Visitors** = distinct `visitor_hash` in range. Hash rotates daily, so a
  30-day “visitors” number is *not* 30-day unique people. UI label is fine as
  “Visitors”; docs say “daily-salted, privacy-preserving.”
- **Sessions** = 30-minute idle timeout, same visitor.
- **Bounce** = session with `pageview_count = 1`.
- **Duration** = sum of heartbeat deltas on the session, clamped.

---

## 4. Data model & RPC rules

Source of truth: `supabase/migrations/*.sql`. The SQL Editor is for emergencies.

### 4.1 Tables

```sql
-- supabase/migrations/0001_init.sql
create extension if not exists "pgcrypto";

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null,
  allowed_domains text[] not null default '{}',
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_public boolean not null default false,
  timezone text not null default 'UTC',
  data_retention_days int not null default 30,
  monthly_event_quota int not null default 25000,
  events_this_month int not null default 0,
  quota_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  visitor_hash text not null,
  hostname text,
  browser text,
  os text,
  device text,
  screen text,
  language text,
  country text,
  entry_path text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  pageview_count int not null default 0,
  event_count int not null default 0,
  total_duration_seconds int not null default 0
);

create table public.website_events (
  id bigint generated always as identity primary key,
  website_id uuid not null references public.websites(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  url_path text not null,
  url_query text,
  title text,
  referrer_domain text,
  event_name text,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create table public.daily_stats (
  website_id uuid not null references public.websites(id) on delete cascade,
  day date not null,
  pageviews bigint not null default 0,
  unique_visitors bigint not null default 0,
  sessions bigint not null default 0,
  bounces bigint not null default 0,
  total_duration_seconds bigint not null default 0,
  primary key (website_id, day)
);

create index idx_websites_user on public.websites (user_id);
create index idx_sessions_visitor on public.sessions (website_id, visitor_hash, last_seen desc);
create index idx_sessions_site_seen on public.sessions (website_id, last_seen desc);
create index idx_events_site_created on public.website_events (website_id, created_at desc);
create index idx_events_session on public.website_events (session_id);
create index idx_events_path on public.website_events (website_id, url_path);
create index idx_events_referrer on public.website_events (website_id, referrer_domain);
create index idx_events_name on public.website_events (website_id, event_name) where event_name is not null;
create index idx_events_country on public.sessions (website_id, country);
```

No raw IP column. No fingerprint column. No `UNIQUE (website_id, visitor_hash)`.

### 4.2 RLS

```sql
alter table public.websites enable row level security;
alter table public.sessions enable row level security;
alter table public.website_events enable row level security;
alter table public.daily_stats enable row level security;

create policy websites_owner on public.websites
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sessions_owner_select on public.sessions
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = sessions.website_id and w.user_id = auth.uid()
  ));

create policy events_owner_select on public.website_events
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_events.website_id and w.user_id = auth.uid()
  ));

create policy daily_owner_select on public.daily_stats
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = daily_stats.website_id and w.user_id = auth.uid()
  ));
```

Anon has **no** table grants. Public dashboards use `get_public_*` only.

### 4.3 RPC security (non-negotiable)

Default Postgres `EXECUTE` is `PUBLIC`. Every function must end with:

```sql
revoke all on function public.<fn>(...) from public;
```

Then grant:

| Function | Grant |
|---|---|
| `ingest_event`, `ingest_heartbeat`, `run_daily_rollup` | `service_role` only |
| `get_website_stats`, `get_top_pages`, `get_top_referrers`, `get_top_countries`, `get_top_devices`, `get_top_events`, `get_realtime_visitors`, `get_timeseries` | `authenticated` — body **must** `raise` unless `websites.user_id = auth.uid()` |
| `get_public_website_stats`, `get_public_timeseries`, `get_public_top_pages`, … | `anon`, `authenticated` — body looks up `share_token` + `is_public` |

Never call ingest RPCs from the browser. Never use the service role in `apps/web`.

### 4.4 `ingest_event` (correctness)

Worker sends a **visitor_hash** it computed (daily salt + site id + ip + ua).
RPC does **not** trust a client session id.

Logic:

1. Load website. If missing, or `events_this_month >= monthly_event_quota`, return.
2. Reset `events_this_month` if `quota_month` is a prior month.
3. Find latest session for `(website_id, visitor_hash)` where `last_seen > now() - interval '30 minutes'`.
4. If none, insert session (`pageview_count = 0`, `entry_path = path`).
5. If `p_event_name is null` (pageview): `pageview_count = pageview_count + 1`.
   Else: `event_count = event_count + 1`.
6. Always `last_seen = now()`.
7. Insert event. Cap `event_data` with `left(p_event_data::text, 2048)::jsonb` in a
   `begin … exception` or reject if `pg_column_size(p_event_data) > 2048`.
8. `update websites set events_this_month = events_this_month + 1`.

Best-effort 1s dedupe: if the last event for this session has the same
`url_path`, null `event_name`, and `created_at > now() - interval '1 second'`,
skip the insert (still return).

### 4.5 `ingest_heartbeat`

```
update sessions
   set total_duration_seconds = total_duration_seconds
         + least(greatest(p_delta_seconds, 0), 120),
       last_seen = now()
 where website_id = p_website_id
   and visitor_hash = p_visitor_hash
   and last_seen > now() - interval '30 minutes';
```

Tracker sends **delta since last beat**, not time-on-page. Clamp 120s per beat
so a dumped tab cannot add 1800 twice.

### 4.6 `get_website_stats` (reads rollups)

For each complete UTC day in `(start, end)` except today: read `daily_stats`.
For **today** (and any range that includes now): aggregate raw events/sessions.

Do **not** join `website_events` × `sessions` and `sum(sessions.total_duration_seconds)`
— that fans out duration. Duration and bounce come from `sessions` filtered by
`first_seen` / `last_seen` overlap with the range, or from `daily_stats`.

`get_top_*` and drill-downs query **raw events inside retention only**.
If the user picks a range older than retention, return empty breakdowns and
still show KPI tiles from `daily_stats`. Empty-state copy:

> Breakdowns are available for the last {n} days. Totals older than that are
> kept as daily summaries.

### 4.7 `run_daily_rollup`

- Upsert yesterday (UTC) into `daily_stats` from **sessions + events**, no fan-out:
  - pageviews = count of events where `event_name is null`
  - unique_visitors = distinct `visitor_hash` with activity that day
  - sessions = sessions whose `first_seen` day = yesterday (or whose activity
    landed yesterday — pick one, document it, stay consistent)
  - bounces = those sessions with `pageview_count = 1`
  - duration = `sum(sessions.total_duration_seconds)` for sessions attributed
    to that day, **without** joining events
- Delete `website_events` older than each site’s `data_retention_days`
- Delete sessions with `last_seen` older than retention and no remaining events
- Idempotent (`on conflict do update`)
- Invoked **only** by the Worker cron with service role. Do not `cron.schedule`
  in SQL.

### 4.8 Public share

`get_public_website_stats(p_share_token, start, end)` resolves token +
`is_public = true`, then calls the same internals as `get_website_stats`.
It must **not** take a website UUID from the client.

---

## 5. Ingestion Worker (`apps/collect`)

Zero (or near-zero) npm deps. `wrangler`. Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROLLUP_SECRET` (cron → `/internal/rollup`)

Routes on the product domain (Cloudflare DNS):

- `https://{domain}/c` → Worker
- `https://{domain}/t.js` → Worker (or Pages static with long cache)
- `https://{domain}/t.v2.js` → immutable hash file

Do **not** send browser traffic through `apps/web` rewrites.

### Worker responsibilities, in order

1. `OPTIONS` → CORS. Allow `POST`. Echo `Origin` if you must; `*` is acceptable
   for collect.
2. `POST /internal/rollup` → header `x-rollup-secret` must match. Then RPC
   `run_daily_rollup`. Not from browsers.
3. Else only `POST /c`. Anything else → `204`.
4. Body cap **16 KB**. Over → `204`.
5. Parse JSON. Require `w` UUID.
6. KV `site:{w}`. Miss → fetch website `{id, allowed_domains, domain}` with
   service role (select those columns only), cache 5 minutes. Unknown → `204`.
7. Origin / referrer host must match `allowed_domains` or `domain`. Fail → `204`.
   Skip this check when `data-dev` equivalent is a signed dev flag — not a
   public query param.
8. Drop bots (UA list). Drop empty UA.
9. `cf.country`, `cf-connecting-ip` once, then throw the IP away.
10. `visitor_hash = sha256(website_id + ip + ua + UTC-date)`.
11. Parse UA on the server (tiny function, not a 200 KB lib).
12. Normalize path (trim, default `/`, strip `gclid`/`fbclid`/`utm_*` from the
    stored path; you may keep UTMs in `url_query` later — not v1 required).
13. Self-referrals: if referrer host is the site domain, store `null`.
14. Heartbeat if `d` is a number and `n` is absent/`heartbeat`.
15. Else `ingest_event`. `n === 'pageview'` or missing → `event_name null`.
16. `ctx.waitUntil(fetch rpc)`. Return `204` immediately.
17. Never leak existence. Never 500 to the browser.

KV write happens from the dashboard on site create/update (Pages Function or
a small authenticated Worker route), **or** the collect Worker fills KV lazily
on miss. Lazy is enough for Slice 1.

### Tracker (`packages/tracker/src/t.js`)

```html
<script defer src="https://{domain}/t.js" data-web="{WEBSITE_UUID}"></script>
```

Optional: `data-dev="true"` (allow localhost), `data-respect-dnt="true"`.

Behaviour:

- Auto pageview on load
- Patch `pushState` **and** `replaceState`; listen `popstate`
- `window.analytics.track(name, props)`
- `sendBeacon` to `https://{domain}/c` (absolute, baked at build or
  `data-host` override). `fetch` + `keepalive` fallback
- Queue 100–300 ms; one request when possible
- Ignore localhost / `127.0.0.1` unless `data-dev`
- UA is **not** parsed in the browser
- Title may be sent (`t`); Worker stores it
- Duration: on `visibilitychange=hidden` / `pagehide`, send **delta seconds
  since last beat or pageview**, then reset the cursor. Do not send both
  events (use a `sent` guard for the same hidden moment)
- No cookies. No localStorage identity.

Payload:

```json
{ "w": "uuid", "n": "pageview", "u": "/pricing", "q": "", "r": "https://google.com/",
  "t": "Pricing", "s": "1920x1080", "l": "en-US", "d": null, "p": null }
```

Keep gzip ≤ 1.5 KB. No dependencies. No `console.log`.

---

## 6. Auth & app data access

- `@supabase/ssr` cookie session in `apps/web`
- Middleware refreshes the session
- Server Components use the **user** server client (RLS applies)
- Browser uses the anon key + user JWT only
- Sign-in: GitHub OAuth first. Email OTP only if Resend SMTP is configured
- After login → `/app`. No site → `/app/sites/new`
- Creating a website (server action): insert via RLS, seed `allowed_domains`
  with the registrable domain, then optional KV put

Login UI is `auth-form-card` on `canvas`, or a `hero-band-dark` split with the
form card on white. Not a generic “custom dark dashboard login.”

---

## 7. Design system — locked

The visual system is the **Together AI** marketing language, **adapted to a
product dashboard**. It is not a suggestion. It is the brand.

There is no illustration system. The three-stop gradient is the brand.
Type contrast is the second voice. Surfaces alternate. Cards do not float.

### 7.1 Personality

- Serious enough for a monospace label.
- Modern enough that headlines stay sentence-case display sans.
- One black rectangle-CTA per viewport for the real action.
- Hairlines and band contrast do elevation. Shadows almost never.
- Technical things (table headers, buttons, eyebrows, metric labels) are
  uppercase mono. Narrative things (page titles, empty-state copy, docs,
  onboarding) are display sans.

The dashboard is **not** a grey enterprise admin. It is the Together surface
applied to data: dark hero/shell bands, white work surface, mint stat tiles,
black CTAs, mono labels.

“Pill” in Together copy means the **4px rounded rectangle**. `rounded-full`
is forbidden on buttons.

### 7.2 Tokens

Put these in `packages/ui/tokens.css` (CSS variables) and the Tailwind theme.
Do not hard-code hex in random components after tokens exist.

#### Color

```
/* Brand & accent */
--color-primary:            #000000;   /* THE only primary CTA fill */
--color-accent-orange:      #fc4c02;   /* gradient stop 1 — never a UI fill */
--color-accent-magenta:     #ef2cc1;   /* gradient stop 2 — never a UI fill */
--color-accent-periwinkle:  #bdbbff;   /* gradient stop 3; soft stat tile ok */
--color-accent-mint:        #c8f6f9;   /* hero secondary + stats-card-tinted */

/* Surface */
--color-canvas:             #ffffff;
--color-hairline:           #ebebeb;   /* table headers, rails, 1px borders */
--color-canvas-dark:        #010120;   /* hero, app rail, research bands */
--color-surface-dark-soft:  #26263a;   /* on-dark hairline / badge / card border */
--color-surface-dark-fill:  #313641;   /* on-dark card fill (slightly lighter) */

/* Text */
--color-ink:                #000000;
--color-body:               #71717a;   /* readable secondary UI (WCAG exception) */
--color-body-muted:         #999999;   /* Together native mute: eyebrows ok, not body copy */
--color-on-dark:            #ffffff;
--color-on-primary:         #ffffff;

/* Semantic — brand has none. Use these sparingly and only in product chrome */
--color-danger:             #000000;
--color-danger-soft:        #ebebeb;
```

`--color-body` is a **documented Together exception**. Their marketing mute is
`#999999` (~2.8:1 on white). That fails AA for sentences. Use `#71717a` for
captions the user must read. Use `#999999` (`body-muted`) for uppercase mono
eyebrows and decorative secondary. Do not “fix” this by adding green/red/indigo.

Brand gradient (fixed object — do not reorder, crop to one stop, or add a fourth):

```
linear-gradient(90deg, #fc4c02 0%, #ef2cc1 50%, #bdbbff 100%)
```

Use at **hero / marketing / empty-state graphic scale only**. Never as a
16px icon fill. Never as a button background. Never as a chart line.

Chart series (product necessity — not a fifth brand accent):
one series = ink. Two = ink + periwinkle. Three = ink + periwinkle + magenta
**at 40% opacity**. Mint is for tiles, not lines. Orange is not a chart colour.
Grid / axes = hairline.

Do not introduce success-green / warning-yellow / error-red chrome on the
marketing site. In the app, destructive text is ink + `button-outline`
“Delete”; confirmation is a modal.

#### Typography

Proprietary faces are not available. **Substitutes are locked:**

| Role | Font | Notes |
|---|---|---|
| Display / body | **Geist** (Inter only if Geist is painful) | 400 + 500 only. Never 700. Tighten tracking ~0.6% at display sizes. |
| Mono labels | **Geist Mono** (or JetBrains Mono) | 500, always uppercase, tracking `0.04em`–`0.05em` |

Load via `next/font`. No Google-font layout shift. No Inter *and* Geist.

```
--font-display: "Geist", ui-sans-serif, system-ui, sans-serif;
--font-mono:    "Geist Mono", ui-monospace, monospace;

--text-display-xxl:    64px / 70.4px / 500 / -1.92px   /* marketing hero only */
--text-display-xl:     40px / 48px   / 500 / -0.8px    /* page + section titles */
--text-display-lg:     28px / 32.2px / 500 / -0.42px   /* stat big numbers */
--text-display-md:     22px / 25.3px / 500 / -0.22px   /* card titles */
--text-body-lg:        18px / 23.4px / 400 / -0.18px
--text-body-lg-strong: 18px / 23.4px / 500 / -0.18px
--text-body-md:        16px / 20.8px / 400 / -0.16px
--text-body-md-strong: 16px / 20.8px / 500 / -0.16px
--text-caption:        14px / 19.6px / 400 / 0
--text-caption-strong: 14px / 19.6px / 500 / 0

--text-mono-button:    16px / 16px   / 500 / 0.08px    /* button labels */
--text-mono-eyebrow:   11px / 11px   / 500 / 0.55px    /* section + table headers */
--text-mono-label:     11px / 15.4px / 500 / 0.055px
--text-mono-caption:   10px / 14px   / 400 / 0.05px    /* code, tracker snippet */
```

Rules:
- Headlines = sentence case, display sans. Never all-caps display.
- Buttons, eyebrows, table headers, metric labels = uppercase mono.
- Mono never carries a paragraph.
- Display sans never carries a button label.
- Negative tracking only on the sans. Positive tracking only on the mono.

#### Spacing (4px base)

```
--space-xxs: 2px
--space-xs:  4px
--space-sm:  8px
--space-md:  12px
--space-lg:  16px
--space-xl:  20px
--space-2xl: 24px
--space-3xl: 32px
--space-4xl: 44px
--space-5xl: 48px
--space-6xl: 55.2px   /* do not invent new uses; prefer 48 or 56 */
--space-section: 80px /* marketing band padding y */
```

App shell padding: `32px` desktop, `16px` mobile — not 80px.
Card padding: `24px` default; stat tiles `32px`.
Chip / filter gap: `8px`. Nav / button row gap: `12px`.
Table row vertical: `12px` — reads like a sheet, not a marketing card.

#### Radius

```
--radius-none: 0
--radius-xs:   3.25px   /* outline buttons, tight tabs */
--radius-sm:   4px      /* CANONICAL — buttons, cards, inputs, badges, tiles */
--radius-md:   8px      /* feature / date-range tab containers */
--radius-full: 9999px   /* FORBIDDEN on CTAs. Reserved for live-dot */
```

Primary CTA is a **slightly rounded rectangle**, never a pill.

#### Elevation

```
Level 0  flat, no border                 marketing bands
Level 1  1px solid hairline              cards, tables, inputs on canvas
Level 2  1px solid surface-dark-soft     cards on canvas-dark
Level 3  rgba(1,1,32,0.10) 0 4px 10px    ONLY floating utility (toast, sticky mobile bar)
```

No shadow on light cards. No shadow on buttons. No shadow on charts.

#### Breakpoints

```
mobile        < 479
mobile-large  479–767
tablet        768–991
desktop       992–1279
desktop-large ≥ 1280     content max 1280px, bands edge-to-edge
```

Touch: primary actions ≥ 44px tall on mobile. Icon buttons 44×44.

#### Layout container

Max width **1280px**, centred, gutters 32 / 16.
Marketing: dark → white → dark bands, 80px y-padding.
App: dark left rail + white main.

---

## 8. Where the design system lives in this product

### 8.1 Two surfaces, one brand

**Marketing** (`/`, `/pricing`, `/docs`)
- `hero-band-dark` + gradient ribbon SVG (our only decoration)
- white product / pricing / docs bands
- mint `stats-card-tinted` for “2 KB script / 0 cookies / 204 ingest”
- black `button-primary` “Get started”
- mint + white pills **only** in the hero
- footer + faint giant wordmark stencil of the product name
- `code-editor-mockup` showing the snippet

**Application** (`/app/*`)
- Shell: `canvas-dark` sidebar (desktop) + top bar
- Main work area: `canvas`
- Metrics: mint / periwinkle tinted stat tiles
- Data: hairline tables, mono headers
- Charts: ink on white, hairline grid, no gradient fills under lines
- One black CTA per screen
- Public share (`/s/{share_token}`): white canvas, no app rail, same tiles +
  charts, product wordmark, “Made with {name}” + black “Get your own”

Do **not** build a third theme. Do **not** add a dark-mode toggle.

### 8.2 App shell

```
┌──────────────────────────────────────────────────────────┐
│ [logo]                         [site switcher] [avatar]  │  top bar: canvas-dark
├────────────┬─────────────────────────────────────────────┤
│ Overview   │  EYEBROW          [24H][7D][30D][90D]  ⚙    │
│ Pages      │  Page title (display-xl, sentence case)     │
│ Referrers  │                                             │
│ Countries  │  ┌ mint ┐ ┌ peri ┐ ┌ white ┐ ┌ white ┐     │
│ Devices    │  │ 12.4k│ │ 8.1k │ │ 42%  │ │ 2m 14s│     │
│ Events     │  └──────┘ └──────┘ └──────┘ └──────┘     │
│ Realtime   │  chart card (hairline)                      │
│ ─────────  │  two-up tables: pages | referrers           │
│ Settings   │                                             │
└────────────┴─────────────────────────────────────────────┘
```

Sidebar (`canvas-dark`, 240px):
- Wordmark top
- Nav labels: `body-md`, `on-dark`, sentence case (Together nav rule)
- Active row = `surface-dark-fill` + optional 2px `on-dark` left bar
- Do not fill the active row with primary black
- Bottom: site name + Settings
- Mobile: hamburger, full-overlay drawer, same stacked links

Top bar stays dark inside the app (the marketing nav’s “turn white on scroll”
trick is marketing-only).

Site switcher: `button-ghost-on-dark`.
Avatar: **square 32px, radius-sm** (Together portraits are not circles).
`radius-full` only for `live-dot`.

### 8.3 Routes (build only these)

| Route | Purpose | Primary CTA |
|---|---|---|
| `/` | Hero, how it works, snippet, compare, pricing teaser | Get started |
| `/pricing` | Free vs paid limits table | Get started |
| `/docs` | Install, SPA, events, share, compare GA/Umami | Copy snippet |
| `/login` `/auth/callback` | Supabase OAuth | Continue |
| `/app` | Site list or last site | Add website |
| `/app/sites/new` | Domain + timezone → snippet | Create website |
| `/app/{id}` | Overview | Share |
| `/app/{id}/pages` | Paths | — |
| `/app/{id}/referrers` | Sources | — |
| `/app/{id}/countries` | Geo table (SVG map later, not v1) | — |
| `/app/{id}/devices` | Browser / OS / device / screen | — |
| `/app/{id}/events` | Custom events + breakdown | — |
| `/app/{id}/realtime` | Last 5–10 min, poll 5s, no websockets | — |
| `/app/{id}/settings` | Domains, snippet, wipe, retention, public toggle | Save |
| `/s/{share_token}` | Public dashboard | Get your own |
| `/design` | Kitchen sink of primitives (dev only) | — |

Onboarding after create: white band, display title “Paste this on {domain}”,
`code-editor-mockup`, black “Copy snippet”, outline “Send test event”,
mono caption “Waiting for first pageview…”. Empty charts are illegal here —
this *is* the empty state.

### 8.4 Overview anatomy

1. Mono eyebrow: `OVERVIEW` + domain
2. Display-xl title, sentence case, e.g. “Last 30 days”
3. `toggle-pill-group` date range: `24H / 7D / 30D / 90D`
4. Four tiles (3-up → 1-up mobile):
   - Visitors — `stats-card-tinted` mint
   - Views — periwinkle tint
   - Bounce — `stats-card-plain`
   - Time on site — `stats-card-plain`
   Big number = `display-lg` / `display-xl`. Label = `mono-caps-eyebrow`.
   Delta vs previous period = `caption` in `body`, **not** green/red.
5. Main `chart-card`: pageviews + visitors, uPlot, ink + periwinkle
6. Two-up `panel-card` tables: Top pages | Top referrers
7. Two-up: Countries | Devices
8. Optional: top events

First useful chart **< 1s** for 30 days on a small site = `daily_stats` +
today’s raw, never a 30-day raw table scan.

Filters = `badge-neutral` chips, not a 12-control sidebar.

### 8.5 Empty, loading, error

**Empty (no snippet yet)**  
`empty-state-card`, display-md “No data yet”, body-md next step, snippet
mockup, one black “Copy snippet”. No cartoon.

**Empty (snippet installed, waiting)**  
Mono caption “Listening for pageviews…” + `live-dot`.

**Loading**  
Hairline skeleton bars. No orange spinner. If required: 16px ink arc, 2px.

**Error**  
Ink title, body detail, `button-outline` Retry. No red banners.

**Quota**  
“Free plan hit 25k events. Resets on {date}.” Black “See plans” only if
billing exists.

---

## 9. Component inventory (implement these, named exactly)

Build in `packages/ui`. A component that is not in this list must be
composed from these. Do not add a Button variant that is not listed.

### 9.1 Buttons

| Name | Look | When |
|---|---|---|
| `button-primary` | bg primary, text on-primary, mono-caps-button, radius-sm, pad `4px 24px`, no shadow | The one conversion / save / copy on the screen |
| `button-secondary-mint` | bg mint, text ink, same type/shape | Hero only |
| `button-secondary-white` | bg canvas, text ink, same | Hero, paired with mint or on dark |
| `button-ghost-on-dark` | bg surface-dark-soft, text on-dark, radius-sm | Dark bands, shell actions |
| `button-outline` | bg canvas, ink, 1px hairline, radius-xs | Secondary in-app: Export, Wipe, Cancel |
| `button-icon` | 44×44, radius-sm, hairline or ghost-on-dark | Icon actions. Not circular. |

Labels: **UPPERCASE MONO**. One `button-primary` visible per viewport.

### 9.2 Cards & bands

| Name | Look | When |
|---|---|---|
| `hero-band-dark` | canvas-dark, section padding, 50/50 headline + ribbon | Marketing home |
| `research-band-dark` | canvas-dark, card grid | Marketing “why privacy” |
| `research-card` | dark fill, 1px dark-soft, pad 24, radius-sm, mono tag + display-md + body | Feature points on dark |
| `article-card` | canvas, 16:9 top image radius-sm on image only | Docs / changelog |
| `code-editor-mockup` | canvas-dark, mono-caption, pad 24, radius-sm, **no traffic lights** | Snippet, API examples |
| `stats-card-tinted` | mint or periwinkle, ink, pad 32, radius-sm, display number + mono label | KPI tiles |
| `stats-card-plain` | canvas + hairline, same type | Bounce, duration |
| `chart-card` | canvas + hairline, pad 24, radius-sm, mono eyebrow + uPlot | All charts |
| `panel-card` | canvas + hairline, pad 24, radius-sm | Tables, settings groups |
| `auth-form-card` | canvas + hairline, pad 24–32, radius-sm | Login |
| `modal-card` | canvas + hairline, radius-sm, Level 3 shadow allowed | Confirm wipe |
| `empty-state-card` | canvas + hairline, pad 32, radius-sm | No data |
| `toast` | canvas + hairline, Level 3, caption | Copied, saved |

### 9.3 Inputs

| Name | Look |
|---|---|
| `text-input` | canvas, ink, 1px hairline, body-md, radius-sm, height ~40px (44 on mobile) |
| `toggle-pill-group` | hairline rail, inactive canvas, **active = primary black**, mono-caps-button, radius-sm, rail pad 4 |
| `feature-tab-pill` | canvas, body-md-strong, pad 12 24, radius-md, group on hairline rail |
| `filter-tab` | radius-xs, pad 8 16, body-md | table subfilters |
| `checkbox` / `switch` | ink/hairline. Active switch = primary black, not mint |

No floating labels. Label above field: `mono-caps-eyebrow` + `body-muted`.
Helper: `caption` + `body`.

### 9.4 Navigation

| Name | Look |
|---|---|
| `nav-bar` marketing | dark on hero, **white after scroll** (marketing only). Logo left, links centre body-md, Sign in right |
| `nav-link` | body-md, 24px gap |
| `app-sidebar` | canvas-dark, 240px |
| `app-sidebar-row` | pad 12 16, radius-sm, active = surface-dark-fill |
| `footer` | canvas, 4-col, mono eyebrows, body-md links, section padding |
| `footer-wordmark-banner` | giant product name, display-xxl, colour hairline, edge-to-edge, radius-none | marketing only |

### 9.5 Data

| Name | Look |
|---|---|
| `data-table-header` | bg hairline, text body-muted, mono-caps-eyebrow, pad 12 16 |
| `data-table-row` | canvas, ink, 1px hairline bottom, pad 12 16, name in display sans, numbers in body-md or mono-caption |
| `badge-neutral` | hairline bg + border, ink, radius-sm, pad 2 8 |
| `badge-subtle-on-dark` | surface-dark-soft, on-dark |
| `live-dot` | 8px, radius-full, mint | only pulse indicator |

Tables on mobile: stack primary name above the metric block. Do not shrink
type below 14px.

### 9.6 Signature marketing pieces (required on `/`)

- `hero-band-dark` with display-xxl sentence-case headline
- Mono eyebrow above it (`PRIVACY-FIRST ANALYTICS`)
- CTA cluster: mint + white **or** black + mint (hero is the one place mint+white are legal)
- Gradient ribbon SVG on the right (desktop); on mobile the ribbon is **above**
  the fold graphic never below the headline
- Ribbon = layered translucent shapes using **only** the three gradient stops.
  No dashboard illustrations, no 3D blobs, no stock photos
- Logo bar of “works with” (Next, WP, HTML) as grayscale SVGs ~24px
- Mid-page mint/periwinkle/white stat tiles
- `code-editor-mockup` with the real snippet
- Dark research-style band: 3-up `research-card` (“No cookies”, “2 KB”, “Your data”)
- Footer + faint wordmark banner

### 9.7 Charts

- Library: **uPlot**
- Line/bar ink `#000000` at 0.85–1
- Comparison series `#bdbbff`
- Grid / axes `#ebebeb`
- Axis labels: mono-caption or caption, colour body
- No area gradient, no glow, no Material rounded bar caps
- Tooltip: mini `panel-card`, radius-sm, hairline; Level 3 only if unreadable
- Spark bars in tables: 40×12, ink

---

## 10. Copy voice

- Headlines sentence-case, short, concrete. “See what actually ships.”
  not “Unlock next-gen insights.”
- Eyebrows technical and uppercase: `OVERVIEW`, `INGEST`, `EVENTS`, `7D`
- Empty states tell you the next keystroke, not a philosophy
- Docs sound like a good engineer: no “leverage”, no “delightful”
- Never say “AI-powered”
- Product name lowercase in the giant footer stencil; normal case in prose

---

## 11. Implementation rules for the agent

### Always

1. Read this file before generating files.
2. Use tokens, not raw hex, once `tokens.css` exists.
3. Implement ingest before pretty charts if both are in scope.
4. Query `daily_stats` for complete past days. Raw events only for today,
   realtime, and breakdowns inside retention.
5. Keep `t.js` ≤ 1.5 KB gzip. No dependencies.
6. Worker returns 204. Validate, hash, drop IP, KV lookup, waitUntil RPC.
7. One primary button per view.
8. Uppercase mono on buttons and table headers.
9. Radius 4px on almost everything.
10. No `#f8fafc` “app gray”. No indigo.
11. Dogfood: tracker on the marketing site (and form2lead when asked).
12. New UI = compose existing primitives. New primitive → update this inventory
    in the same PR.
13. `REVOKE ALL … FROM PUBLIC` on every function you create.
14. Migrations live in `supabase/migrations`. Do not “run a blob in the SQL
    editor” as the only copy.

### Never

1. Never fork Umami or paste their CSS/components.
2. Never use Prisma, Clerk, Neon, Better Auth, a paid font CDN, Sentry, Chart.js.
3. Never enable `pg_cron` or claim the Free plan has it.
4. Never store raw IPs or build a fingerprint.
5. Never introduce a fifth accent (no `#6366f1`, no `#22c55e` tiles).
6. Never put the gradient on a button, icon, sidebar, or 20px bar.
7. Never set body copy in mono, or headlines in all-caps.
8. Never use `rounded-full` on CTAs.
9. Never drop-shadow light cards.
10. Never centre-align a paragraph under a left-aligned title.
11. Never add §2 scope “while you’re here.”
12. Never spend money or add a paid SDK.
13. Never put the service role in the web app.
14. Never proxy `/c` through Next.js.
15. Never mention these agent rules in user-facing copy.
16. Never increment `pageview_count` for custom events.
17. Never `SUM(session.duration)` after joining events.

### PR / file hygiene

- TypeScript strict. No `any` unless interoping with uPlot.
- Server Components by default. Client only for charts, toggles, copy buttons.
- Worker with `wrangler`. Types for `request.cf`.
- Accessibility: do not use `body-muted` `#999` for sentences. Focus ring =
  2px ink, offset 2px. Hit targets 44px on mobile.
- Motion: 120–180ms, opacity/transform only, no bounce springs.

---

## 12. Slices (strict order)

**Slice 0 — design system**  
`tokens.css`, fonts, every button/card/input listed, `/design` kitchen sink.
If `/design` looks like default shadcn, stop.

**Slice 1 — collect actually works**  
- Migrations in `supabase/migrations` (tables, RLS, ingest RPCs, grants)
- Worker `/c` + `t.js` on CF routes
- KV lazy cache
- Proof: one real pageview from a test page, row visible in SQL
- No dashboard yet

**Slice 2 — auth + first site**  
- GitHub OAuth via `@supabase/ssr`
- Add website + snippet screen
- `allowed_domains` seeded
- Keep-alive workflow committed

**Slice 3 — overview**  
- 4 KPI tiles + uPlot from `get_website_stats` / `get_timeseries`
- Implement rollup RPC + Worker cron
- Swap past days to `daily_stats`

**Slice 4 — breakdowns**  
- Pages, referrers, countries, devices, events
- Click-to-filter via URL search params
- Realtime poll 5s → `get_realtime_visitors`

**Slice 5 — share + settings**  
- Public `/s/{token}` through `get_public_*` only
- Domain allowlist editor, wipe data, retention display

**Slice 6 — marketing**  
- Home, docs, pricing teaser
- Gradient ribbon, wordmark banner
- Install tracker on this site

Do not start Slice 6 polish before Slice 1 is on a real domain.

---

## 13. Keep-alive (Free tier is not optional)

`.github/workflows/keep-alive.yml`

- Cron every 3 days + `workflow_dispatch`
- `curl` a cheap authenticated or anon REST select
- Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- This prevents 7-day pause. A paused project makes the Worker’s
  `waitUntil` fail and **pageviews vanish**. Document that in `/docs`.

---

## 14. Definition of done (every screen / PR)

- [ ] Uses only tokens and listed components
- [ ] One primary CTA or none
- [ ] Eyebrows / buttons / table headers are uppercase mono
- [ ] Titles are sentence-case display 500
- [ ] Radius 4px (or xs/md where listed)
- [ ] No card shadow
- [ ] Works at 375 and 1280
- [ ] Empty / loading / error specified
- [ ] No new colour
- [ ] No layout shift from fonts
- [ ] Queries go through `packages/db`
- [ ] User-facing RPCs check `auth.uid()` or `share_token`
- [ ] Ingest RPCs are `service_role` only
- [ ] No raw IP stored
- [ ] No `pg_cron`
- [ ] No service role in `apps/web`

---

## 15. Quick “are we on brand / on architecture?” test

1. Could this pass as a Together-adjacent product surface, or is it generic
   shadcn/indigo?
2. Is there exactly one black CTA that matters?
3. Are the technical words in mono caps and the human words in Geist?
4. Is the only decoration the big gradient (marketing) or mint tiles (app)?
5. Would Umami’s UI look *busier and rounder* next to this? If we look like
   Umami, we failed.
6. Does the browser post to the Worker, not to Next.js?
7. Can a logged-in user who knows another site’s UUID read it? If yes, revert.
8. Did we store an IP, add `pg_cron`, or add a paid service? If yes, revert.

---

## 16. Default answers when the human is vague

| They say | You do |
|---|---|
| “Make it pop” | Larger display type, more whitespace, mint tile — not a new colour |
| “Make it like Umami” | Same *information*, our chrome |
| “Add dark mode” | Refuse for v1; shell is already dark, work surface is white |
| “Use shadcn” | Primitives restyled to these tokens. No default theme. |
| “Add replay / AI / email” | Cite §2, refuse, offer the next slice |
| “Just fork it” | Refuse. Re-implement the model. |
| “Put collect on `/api/collect`” | Refuse. CF route `/c`. |
| “Run this in the SQL editor and use pg_cron” | Refuse. Migrations + CF Cron. |
| Unspecified radius / shadow / font | This file |

---

END
