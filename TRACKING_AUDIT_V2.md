# Tracking Audit — Verified Report (V2)

**Repo audited:** `/home/ken/Documents/Analytics` (working tree, uncommitted changes on `main`)
**Reference:** `/home/ken/Documents/umami` (Umami v2.x, all claims below verified against its source)
**What this is:** every claim in the earlier `TRACKING_AUDIT.md` was re-verified against the actual code in both repos, and the whole tracking pipeline (tracker → worker → RPC → schema → dashboards) was re-audited. This report separates **what is actually true**, **what the earlier report claimed but is not in the code**, and **real defects found — including the DB mess you suspected**.

Verdict up front: **the architecture is genuinely Umami-shaped and most of the described fixes are real and correct. But the working tree does not compile (the mobile Events tab will crash), the 0011 migration reintroduces two counting bugs that 0009 had already solved (duplicate sessions + heartbeat corruption), and it silently breaks the AI-sources panel and the web "Updated" timestamp.** Details and fixes below.

---

## 1. Verified correct — claims that match reality

| # | Claim | Evidence (verified) |
|---|---|---|
| 1 | Migration 0011 applies cleanly (no signature drift) | Every `create or replace` matches the prior definition exactly: `ingest_event` 29-arg = 0009:73-102; `ingest_events(uuid,jsonb)→jsonb` = 0009:247; `get_realtime_visitors(uuid)→jsonb` = 0001:767; `get_top_events` table shape = 0001:729-737; `get_website_stats(uuid,ts,ts)→jsonb` = 0002:337; `get_dashboard_overview` 9-arg = 0003:375 / 0009:919. No return-type change → `CREATE OR REPLACE` cannot fail. |
| 2 | `event_type` 1=pageview / 2=custom | Matches Umami `EVENT_TYPE` (`src/lib/constants.ts:118-123`: pageView=1, customEvent=2, performance=5). Column + backfill at `0011:54-92` are idempotent and correct. |
| 3 | `visit_id` = hash(session, hour) | Umami: `visitSalt = hash(startOfHour(createdAt).toUTCString()); visitId = uuid(sessionId, visitSalt)` (`src/app/api/send/route.ts:153-156,172`). Clone: `md5(session_id‖':'‖hour)` (`0011:234,372`) — same bucketing model. |
| 4 | `get_website_event_stats` matches Umami exactly | Umami `getWebsiteEventStats` = `count(*)`, `count(distinct session_id)`, `count(distinct visit_id)`, `count(distinct event_name)` with `event_type = 2` (`src/queries/sql/events/getWebsiteEventStats.ts:47-60`). Clone `0011:609-620` is field-for-field identical. |
| 5 | Events-tile double-count fix (concept) | `get_top_events` now filters `event_type = 2` and uses `count(distinct session_id)` (`0011:563-576`) — correct; summing per-event visitors was indeed double-counting. |
| 6 | Realtime "Set-on-session" model | Umami `getRealtimeData` dedupes visitors via a `Set` of `sessionId` (`src/queries/sql/getRealtimeData.ts:25-52`). Clone `0011:490-523` does the same (last-100 events, distinct `session_id`). JSON keys `active_visitors` / `active_pages[{url_path,count}]` are backward-compatible with the mobile consumer (`realtime.tsx:70-72,177-184`). |
| 7 | Worker preflight/validation = Umami parity | Bot pattern, 12-header IP priority + port/`::ffff:` normalization, CIDR block, CSV-formula guard `/^[=+\-@\t\r]/` (`ingest-guards.mjs:35-48,99-196`) mirror Umami `isbot`, `src/lib/ip.ts`, `detect.ts:hasBlockedIp`, `send/route.ts:26-29`. Salt = `sha512(startOf{Day,Week,Month}.toUTCString())` matches `umami/src/lib/crypto.ts:75-80`. |
| 8 | Batch ingest + legacy fallback | `postIngest` (`ingest-guards.mjs:637-682`): one `ingest_events` round trip, falls back to per-event `ingest_event`/`ingest_heartbeat`; worker records KV health only on fallback/failure (`collect/src/index.ts:318-329`). Worker caps batch at `LIMITS.MAX_BATCH = 10` < RPC's 50 → the RPC's `batch_too_large` branch is unreachable via the worker. Good. |
| 9 | Tracker basics | `t.ts`: sendBeacon→`fetch(keepalive)` (76-89), 1 s string-dedupe (102-111), 10-item/200 ms flush (91-100), SPA push/replace/popstate (130-151), 90 s visible-only heartbeat clamped to 120 s (123-128,168-170), DNT/localhost/dev gates (30-42). Heartbeat payloads carry `n:'heartbeat'` + numeric `d`, which the worker detects (`ingest-guards.mjs:517-527`) and tags `type:'heartbeat'` in the batch (`ingest-guards.mjs:618-626`) — compatible with the RPC's `v_element->>'type'` check (`0011:389`). |
| 10 | Mobile auth-race fix is real and well done | `hooks.ts:36,48-62` (`sessionReady` + one-shot invalidate on null→auth transition), all data hooks gated (`125,164,180-190,242`), `signOut` clears the cache first (`98-103`). This genuinely fixes "stuck on zeros". |
| 11 | RPC grants | ingest → `service_role` only; read RPCs → `authenticated` (`0011:461-462,534-535,580-581,626-627,747-748,960-961`). |

---

## 2. CRITICAL — the working tree does not compile

`apps/mobile/src/data/hooks.ts:6-7` imports:

```ts
import { ..., getWebsiteEventStats } from '@analytics/db/queries';
import type { ..., RealtimeData, WebsiteEventStats } from '@analytics/db/types';
```

Neither exists:

- `packages/db/src/queries.ts` is 125 lines and has **no `getWebsiteEventStats`** export.
- `packages/db/src/types.ts` has **no `WebsiteEventStats`**, no `visits?: number` on `WebsiteStats` (lines 75-85), and `RealtimeData` lacks `realtime_interval_seconds` / `generated_at` (lines 152-155).

Proven by typecheck:

```
src/data/hooks.ts(6,66): error TS2305: Module '"@analytics/db/queries"' has no exported member 'getWebsiteEventStats'.
src/data/hooks.ts(7,90): error TS2724: '"@analytics/db/types"' has no exported member named 'WebsiteEventStats'.
```

Metro/Babel do not typecheck, so a release build would ship and the **Events tab crashes at runtime** the first time `useEventStats` fires (`getWebsiteEventStats is not a function`). `TRACKING_AUDIT.md` §8/§10 claims these files were updated (+41/+14) — **those edits were never applied to the tree (or were lost)**. This is fix #1.

---

## 3. CRITICAL — 0011 `ingest_events` regressed below 0009

The earlier migration `0009_ai_sources.sql:247-420` already had a hardened batch RPC. 0011 replaced it and **lost three protections**:

### 3.1 Per-visitor advisory lock removed → duplicate session rows (your DB mess)

- 0009: `perform pg_advisory_xact_lock(hashtext(p_website_id::text), hashtext(v_vh))` per visitor (`0009:314-317`).
- 0011: **no lock at all** in `ingest_events` (only `ingest_event` has it, `0011:157-160`).
- The `sessions` table has **no unique constraint** on `(website_id, visitor_hash)` — only an index (`0001:26-43,71`).

Two concurrent beacons from the same visitor (queue flush racing a heartbeat, two tabs, retry overlap) both run the "find session" SELECT (`0011:329-335`), both find nothing, both INSERT → **two session rows for one visitor**. Consequences: `sessions` count inflated, `first_seen` split, bounces miscounted, `count(distinct visitor_hash)` unaffected but every sessions-derived stat is. Cloudflare Workers process requests on independent isolates, so this race is real in production.

`TRACKING_AUDIT.md` §4.4 states "Both RPCs take `pg_advisory_xact_lock`" — **false for `ingest_events`**.

### 3.2 Heartbeats corrupt `pageview_count` and create phantom sessions

In 0011's loop, the session resolve/update block (`0011:329-369`) runs **before** the heartbeat short-circuit (`0011:389-396`):

- Every heartbeat element (which never has `p_event_name`) executes
  `pageview_count = pageview_count + 1` — at the 90 s beat interval, a 10-minute read adds **~6 phantom pageviews** to the session.
- If the heartbeat finds no session (salt rotated at UTC midnight, or first beacon after the 30-min window), it **INSERTs a phantom session** (`pageview_count = 1`, `entry_path = '/'`, null device fields, **zero event rows**).

Downstream damage:
- **Bounce rate collapses** — today's bounces test `pageview_count = 1` (`0011:701`); any session with ≥1 heartbeat stops counting as a bounce even if it was a single-pageview visit.
- **Sessions KPI inflated** — `v_today_sess = count(*)` from sessions (`0011:698-707`) counts phantom rows.
- **Rollup poisoned** — `run_daily_rollup` bounces uses `pageview_count <= 1` (`0001:327`) and daily `sessions`/`bounces` come from the same corrupted counters.

0009 did it correctly: heartbeats only looked up the session and bumped `total_duration_seconds` + `last_seen`, never the counters, never INSERT (`0009:318-339`). The legacy single-event path is also correct (`ingest_heartbeat`, `0001:284-299`). **Only the batched path — the one used in steady state — is broken.** Umami defines bounces per visit as "1 pageview and no custom event" (`getWebsiteStats.ts:57-58`) — unreachable here while counters are wrong.

### 3.3 Heartbeat detection narrowed + quota overshoot (minor)

- 0009 treated an element as heartbeat if `type = 'heartbeat'` **or** it carried `p_delta_seconds` (`0009:305-306`). 0011 checks only `type` (`0011:389`). The worker always tags `type`, so this is safe *today*, but any other client hits the bug above.
- 0011 checks quota once per batch and can overshoot `monthly_event_quota` by up to the batch size (0009 enforced `v_quota_left` per element).

---

## 4. REGRESSIONS in `get_dashboard_overview` (0011 §9)

### 4.1 AI-sources panel hard-coded to empty

0009 computed a real `ai_sources` breakdown from `referrer_source` (`0009:875-878`, built by the worker's `classifyAiSource`, `ingest-guards.mjs:359-379`). 0011's replacement returns a literal:

```sql
'ai_sources', '[]'::jsonb   -- 0011:953
```

Both consumers read the field (`packages/db/src/queries.ts:84,113` → web `DashboardClient`), so **the AI-referral panel shipped in 0009 now always shows nothing**. The earlier audit report does not mention this.

### 4.2 `generated_at` changed from ISO string to epoch float

0009 returned `to_char(now() ... 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`; 0011 returns `extract(epoch from now())` (`0011:955`). The web header does `new Date(overview.generated_at).toLocaleTimeString()` (`apps/web/src/app/app/[id]/DashboardClient.tsx:252-253`) → epoch-seconds number is parsed as milliseconds → **the "Updated" label shows a 1970 time**.

### 4.3 Realtime no longer sees heartbeat presence

The old RPC counted `sessions.last_seen > now()-5min` (`0001:777-783`) — and heartbeats keep `last_seen` fresh. 0011 counts only **events** in the 5-minute window (`0011:490-502`). A visitor reading one long page sends no events after the initial pageview (heartbeats only) → **drops out of "active visitors" after 5 minutes** even though the heartbeat stream proves they're there. Umami's event-window model is fine for Umami because it has no heartbeat feature; this product does. Recommended: union the event window with `sessions.last_seen` within the window.

---

## 5. Umami-parity gaps (documented deltas, not bugs)

| Topic | Umami | This repo | Impact |
|---|---|---|---|
| Salt default | `SALT_ROTATION \|\| 'month'` (`send/route.ts:146`) | `'day'` (`ingest-guards.mjs:411`) | "Visitors" over multi-day ranges = daily uniques here vs monthly uniques in umami. Deliberate privacy choice is fine — but document it, because range-to-range visitor comparisons differ from umami. |
| `hour` rotation | not supported | `getSaltRotation()` accepts `'hour'` (`ingest-guards.mjs:412`) but `getSalt()` has no hour branch → silently behaves as `day` (`ingest-guards.mjs:400-408`) | Config lie. Either implement or reject. |
| Visit expiry | visitId refreshes after **30 min** inactivity via signed cache token `iat` (`send/route.ts:174-178`) | hour bucket only, no inactivity split | A session idle 45 min then active again within the same clock hour = 1 visit here, 2 in umami. Approximation acceptable; know it. |
| Server-side session cache | `x-umami-cache` JWT echoed by tracker (`send/route.ts:113-127`) | stateless re-hash per beacon | Fine (stateless is simpler); costs one session lookup per beacon — already indexed. |
| URL hash | tracker sends full URL incl. hash by default (`src/tracker/index.ts:248-288`; server keeps `pathname + hash`, `send/route.ts:183-184`) | **tracker sends only `loc.pathname`** (`t.ts:67`) — the worker's hash-preserving `sanitizePath` is dead code | **Hash-router SPAs record every page as `/`.** Real gap — fix is `loc.pathname + loc.hash` in `t.ts`. |
| `www.` stripping | strips `www.` from url/referrer domains (`send/route.ts:186,215`) | not stripped | `www.google.com` and `google.com` split into two referrer rows. |
| Realtime per-URL count | increments per **event** (`getRealtimeData.ts:53`) | `count(distinct session_id)` per path (`0011:505-511`) | Different semantics; yours arguably matches the "N active" label better. Keep, but know it's not literal umami. |
| Bounce definition | per visit: 1 pageview **and no custom event** (`getWebsiteStats.ts:57`) | per session: `pageview_count = 1` | Equivalent in spirit once §3.2 is fixed; a custom-event-only "visit" is never a bounce in umami. |
| Duration | `max(created_at)-min(created_at)` per visit (`getWebsiteStats.ts:59`) | summed heartbeats (clamped 120 s) | Yours is more accurate *because* you have heartbeats — keep. |

---

## 6. Other findings (lower severity)

1. **Push digest is a stub.** `sendPushDigests` fetches `get_yesterday_user_digests`, logs "Found N devices", and never sends anything (`collect/src/index.ts:133-156`); `FIREBASE_SERVICE_ACCOUNT` is declared and unused. Push digests do not actually reach devices.
2. **Fallback `latest.json`** hard-codes `version 1.0.0` and `sha256` = hash of the string `"test"` (`collect/src/index.ts:222-229`) while the app ships 1.0.2 — if R2 is empty the updater reads a stale manifest.
3. **Dedupe path normalization** — `ingest_events` compares the raw element path (`0011:403`) while inserting the normalized one; only matters for non-worker callers.
4. **2 KB data-cap inconsistency** — `ingest_event` uses `pg_column_size` (binary), `ingest_events` uses `length((... )::text)` (`0011:223,378`). Harmless, just different.
5. **`v_hist_visits` dead** and `v_total_visits := v_hist_sess + v_today_visits` carries sessions as visits for historical ranges (`0011:723`) — the earlier report's caveat is accurate: "visits" is only exact for today.
6. **Rollup bounce口径** `pageview_count <= 1` (`0001:327`) vs today-path `= 1` (`0011:701`) — inconsistent with each other and with phantom sessions.
7. **`SECURITY DEFINER` functions never `set search_path`** — inherited from all migrations; Supabase lint flags it; worth a blanket `alter function ... set search_path = public` pass.
8. **`get_realtime_visitors` 5-min vs umami** — umami's realtime window comes from the client filter (commonly 30 min). Yours is hard-coded 5 min; fine, but the heartbeat-presence issue (§4.3) compounds it.
9. `TRACKING_AUDIT.md` §6.3 claims `event_name` capped "128 chars, same as Umami (VARCHAR(50) server-side)" — umami caps the *payload* via schema; the 128 choice is this repo's. Cosmetic doc nit.

---

## 7. How to check the production DB for the mess (run as SQL)

```sql
-- 1. Duplicate sessions for the same visitor (the §3.1 race)
select website_id, visitor_hash, count(*) as rows,
       min(first_seen), max(last_seen)
from sessions
group by 1, 2
having count(*) > 1
order by rows desc;

-- 2. Counter corruption from heartbeats (§3.2): pageview_count ≠ real pageview rows
select s.id, s.pageview_count,
       count(e.id) filter (where e.event_name is null) as actual_pageviews
from sessions s
left join website_events e on e.session_id = s.id
group by s.id, s.pageview_count
having s.pageview_count <> count(e.id) filter (where e.event_name is null);

-- 3. Phantom sessions (created by heartbeats; zero events ever)
select count(*) from sessions s
where not exists (select 1 from website_events e where e.session_id = s.id);

-- 4. Realtime sanity: events vs sessions still "alive" via heartbeat
select count(*) from sessions where last_seen > now() - interval '5 minutes';
```

If #1 returns rows with `rows ≥ 2` and overlapping time windows, and #2/#3 return nonzero counts, the DB is carrying the corruption described above (it will, for any period served by `ingest_events` after 0011 was applied).

---

## 8. Recommended fixes (priority order)

1. **Unblock compile (minutes):** add to `packages/db/src/queries.ts` a `getWebsiteEventStats(supabase, websiteId, start, end)` calling the RPC; add `WebsiteEventStats` to `types.ts`, `visits?: number` to `WebsiteStats`, extend `RealtimeData`. (The mobile side already expects exactly this.)
2. **Migration 0012 — repair `ingest_events`** by re-merging 0009's hardening with 0011's additions:
   - restore `pg_advisory_xact_lock(hashtext(website), hashtext(visitor))` per visitor;
   - move the heartbeat check **before** any session INSERT/counter update; heartbeat = duration + `last_seen` only, never create a session;
   - keep `event_type` + `visit_id` + the 1 s dedupe (those are right);
   - enforce quota per element.
3. **Same migration — restore `get_dashboard_overview`:** recompute `ai_sources` (copy the `ai_b` CTE from 0009:836-878) and return `generated_at` as ISO string (or make the web parse epoch).
4. **Realtime presence:** count distinct sessions from (events in window) ∪ (sessions with `last_seen` in window).
5. **Tracker:** send `loc.pathname + loc.hash` as `u` so hash-router SPAs are tracked.
6. **Data cleanup (after 3 ships):** merge duplicate session rows from §7 query 1 (keep earliest `first_seen`, sum counters from real event rows); delete or backfill phantom sessions from §7 query 3; re-run `run_daily_rollup` for affected days.
7. Smaller: implement or remove the push-digest stub; fix the `latest.json` fallback values; strip `www.` on referrer/url domains; make `hour` salt rotation real or invalid; add `set search_path` to SECURITY DEFINER functions.

---

## 9. Earlier report — claim-by-claim scorecard

| `TRACKING_AUDIT.md` claim | Verdict |
|---|---|
| Mobile auth race root cause + `sessionReady` fix | ✅ True, verified well-implemented |
| Events-tile double-count → new RPC | ✅ Concept true, RPC exists — ❌ but the client-side half was never committed (§2) |
| Realtime counted events not sessions | ✅ True and fixed (⚠️ new presence gap §4.3) |
| `event_type`, `visit_id`, `distinct_id`/`region`/`city` columns + backfill | ✅ All present and idempotent |
| "Both RPCs take `pg_advisory_xact_lock`" | ❌ False — `ingest_events` lost it (§3.1) |
| Batched ingest with legacy fallback, KV health | ✅ True (`postIngest`, worker `waitUntil`) |
| Worker/tracker/ingest-guards "no changes, verified" | ✅ True (files match last commit) |
| `queries.ts (+41)` / `types.ts (+14)` / `WebsiteEventStats` / `visits?` | ❌ **Not in the tree** — mobile does not compile (§2) |
| "daily_stats is event_type-aware already" | ✅ Effectively (rollup filters `event_name is null`, equivalent post-backfill) |
| Historical `visits` carried as sessions (caveat) | ✅ Accurate (`0011:723`) |
| AI-referrer classification shipped | ⚠️ Worker side true — but 0011's overview empties the panel (§4.1), unmentioned |
| Silent omissions | `generated_at` epoch break (§4.2), heartbeat counter corruption (§3.2), push-digest stub (§6.1) |

---

## 10. TL;DR

- The **pipeline design** (tracker → worker → RPC → schema) is solid and closely mirrors Umami where it matters; the three headline fixes in the earlier report (auth race, events KPI, realtime sessions) are the right fixes.
- **But you cannot ship this tree:** the mobile app fails typecheck and the Events tab crashes, because the `@analytics/db` changes the report describes were never written.
- **And the DB mess is real:** 0011's rewrite of `ingest_events` dropped 0009's advisory lock (duplicate session rows) and lets heartbeats inflate `pageview_count` / create phantom sessions (bounce rate and session counts drift). The AI-sources panel and the web "Updated" timestamp also silently broke.
- All fixes are small and localized (one SQL migration + one small TS file + two one-liners); §8 is the ordered list, §7 gives you the SQL to measure the damage first.
