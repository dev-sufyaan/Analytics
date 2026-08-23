// scripts/test/rpc.test.mjs
// HARDCORE integration tests against the real Supabase project.
// Exercises the RPCs exactly as production does (service-role REST calls),
// verifies counting/dedupe/quota/session-window/heartbeat/rollup/retention,
// and proves RLS + grant hardening (no PUBLIC execute, ownership enforced).
// Requires .env.local with DATABASE_URL + Supabase keys. Skips if absent.
import { test, assert, eq, ok, run, sql, ENV, haveDb, createTestUser, deleteTestUser, signIn, rpcRest } from './lib.mjs';

if (!haveDb()) {
  console.log('\n\x1b[33mSKIP\x1b[0m rpc.test.mjs — DATABASE_URL / Supabase keys not set in .env.local');
  process.exit(0);
}

const db = sql();
const label = (s) => `test-${s}-${Math.random().toString(36).slice(2, 8)}`;

let userA, userB;
const sites = [];

async function newSite(uid, opts = {}) {
  const adFrag = opts.allowed_domains && opts.allowed_domains.length
    ? db.array(opts.allowed_domains, 'text')
    : db`ARRAY[]::text[]`;
  const [row] = await db`insert into public.websites
    (user_id, name, domain, allowed_domains, data_retention_days, monthly_event_quota, is_public)
    values (${uid}, ${opts.name || label('site')}, ${opts.domain || label('local')},
      ${adFrag}, ${opts.retention ?? 30},
      ${opts.quota ?? 100000}, ${opts.is_public ?? false})
    returning id, share_token`;
  sites.push(row.id);
  return row;
}

async function ingest(websiteId, vh, over = {}) {
  return rpcRest('ingest_event', {
    p_website_id: websiteId,
    p_visitor_hash: vh,
    p_hostname: over.host || 'test.local',
    p_browser: 'Chrome',
    p_os: 'Other',
    p_device: 'Desktop',
    p_country: 'US',
    p_url_path: over.path || '/',
    p_url_query: null,
    p_title: over.title || null,
    p_referrer_domain: over.ref || null,
    p_event_name: over.event ?? null,
    p_event_data: over.data || null,
  });
}

async function heartbeat(websiteId, vh, delta) {
  return rpcRest('ingest_heartbeat', {
    p_website_id: websiteId,
    p_visitor_hash: vh,
    p_delta_seconds: delta,
  });
}

const tests = [
  test('setup: create test users + sites', async () => {
    userA = await createTestUser(`${label('a')}@test.local`);
    userB = await createTestUser(`${label('b')}@test.local`);
    ok(userA && userB, 'users created');
  }),

  test('ingest_event: pageview increments pageview_count, NOT event_count', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-pageview-1';
    await ingest(s.id, vh, { path: '/home', event: null });
    const [sess] = await db`select pageview_count, event_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 1, 'pageview_count=1');
    eq(sess.event_count, 0, 'event_count=0 for pageview');
    const [ev] = await db`select event_name from public.website_events where website_id=${s.id}`;
    eq(ev.event_name, null, 'stored as null event_name (pageview)');
  }),

  test('ingest_event: custom event increments event_count only', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-event-1';
    await ingest(s.id, vh, { path: '/home', event: null }); // pv
    await ingest(s.id, vh, { path: '/home', event: 'signup' }); // event
    const [sess] = await db`select pageview_count, event_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 1, 'pageview_count stays 1');
    eq(sess.event_count, 1, 'event_count=1');
    const c = await db`select count(*)::int n from public.website_events where website_id=${s.id} and event_name='signup'`;
    eq(c[0].n, 1, 'signup event row present');
  }),

  test('session: 30-min idle window creates a new session', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-session-1';
    await ingest(s.id, vh, { path: '/a', event: null });
    await ingest(s.id, vh, { path: '/b', event: null }); // within window -> reuse
    await db`update public.sessions set last_seen = now() - interval '31 minutes' where website_id=${s.id}`;
    await ingest(s.id, vh, { path: '/c', event: null }); // expired -> new session
    const rows = await db`select pageview_count from public.sessions where website_id=${s.id} order by first_seen`;
    eq(rows.length, 2, 'two sessions created');
    const totalPv = rows.reduce((a, r) => a + r.pageview_count, 0);
    eq(totalPv, 3, 'total pageviews across sessions = 3');
  }),

  test('ingest_event: 1-second duplicate pageview is deduped', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-dedupe-1';
    await ingest(s.id, vh, { path: '/x', event: null });
    await ingest(s.id, vh, { path: '/x', event: null }); // exact dup within 1s
    const ev = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev[0].n, 1, 'duplicate pageview not inserted');
    const [sess] = await db`select pageview_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 1, 'pageview_count not double counted');
    await ingest(s.id, vh, { path: '/y', event: null }); // different path -> kept
    const ev2 = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev2[0].n, 2, 'different-path pageview kept');
  }),

  test('REGRESSION: pageview after custom event on same path is NOT deduped', async () => {
    // Old bug: dedupe compared against the last event of ANY type, so a
    // legit pageview right after a custom event on the same path was dropped.
    const s = await newSite(userA.id);
    const vh = 'vh-dedupe-2';
    await ingest(s.id, vh, { path: '/x', event: null }); // pv
    await ingest(s.id, vh, { path: '/x', event: 'click' }); // custom event, same path
    await ingest(s.id, vh, { path: '/x', event: null }); // pv again within 1s
    const ev = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev[0].n, 3, 'all three events stored (pv, click, pv)');
    const [sess] = await db`select pageview_count, event_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 2, 'pageview_count = 2');
    eq(sess.event_count, 1, 'event_count = 1');
  }),

  test('HARDENING: oversized free-text fields are truncated server-side', async () => {
    const s = await newSite(userA.id);
    const r = await ingest(s.id, 'vh-trunc-1', {
      path: '/' + 'a'.repeat(5000),
      title: 'T'.repeat(5000),
      event: 'E'.repeat(5000),
      data: { big: 'x'.repeat(5000) },
    });
    ok(r.ok);
    const [ev] = await db`select url_path, title, event_name, event_data from public.website_events where website_id=${s.id} order by id desc limit 1`;
    ok(ev.url_path.length <= 1024, `path capped (${ev.url_path.length})`);
    ok(ev.title.length <= 512, `title capped (${ev.title.length})`);
    ok(ev.event_name.length <= 128, `event_name capped (${ev.event_name.length})`);
    ok((ev.event_data ? JSON.stringify(ev.event_data).length : 0) <= 2100, 'event_data ~2KB capped');
  }),

  test('HARDENING: null/absent optional params and junk types are safe', async () => {
    const s = await newSite(userA.id);
    const r = await rpcRest('ingest_event', {
      p_website_id: s.id,
      p_visitor_hash: 'vh-null-1',
      p_url_path: '',
      p_title: 12345, // non-string junk via REST -> jsonb-ish; RPC must not crash
      p_event_data: { nested: { deep: [1, 2, { x: null }] } },
    });
    ok(r.ok, 'ingest with empty path + junk title succeeds');
    const [ev] = await db`select url_path from public.website_events where website_id=${s.id}`;
    eq(ev.url_path, '/', 'empty path defaults to /');
  }),

  test('quota: blocks ingest once monthly_event_quota reached (still 204)', async () => {
    const s = await newSite(userA.id, { quota: 2 });
    const r1 = await ingest(s.id, 'vh-q-1', { event: null });
    const r2 = await ingest(s.id, 'vh-q-2', { event: null });
    const r3 = await ingest(s.id, 'vh-q-3', { event: null }); // should be dropped
    ok(r1.ok && r2.ok && r3.ok, 'all return success status');
    const ev = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev[0].n, 2, 'only 2 events stored');
    const [w] = await db`select events_this_month from public.websites where id=${s.id}`;
    eq(w.events_this_month, 2, 'events_this_month capped at quota');
  }),

  test('ingest_heartbeat: clamps delta to 120s per beat', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-hb-1';
    await ingest(s.id, vh, { path: '/', event: null });
    await heartbeat(s.id, vh, 1000); // clamped -> 120
    await heartbeat(s.id, vh, 50); // within window -> +50
    const [sess] = await db`select total_duration_seconds from public.sessions where website_id=${s.id}`;
    eq(sess.total_duration_seconds, 170, 'clamped 120 + 50 = 170 (not 1050)');
  }),

  test('ingest_heartbeat: negative delta clamps to 0; expired session is a no-op', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-hb-2';
    await ingest(s.id, vh, { path: '/', event: null });
    await heartbeat(s.id, vh, -30); // clamp low -> +0
    const [sess] = await db`select total_duration_seconds from public.sessions where website_id=${s.id}`;
    eq(sess.total_duration_seconds, 0, 'negative delta adds nothing');
    // expire the session, then beat -> no rows updated
    await db`update public.sessions set last_seen = now() - interval '45 minutes' where website_id=${s.id}`;
    await heartbeat(s.id, vh, 60);
    const [after] = await db`select total_duration_seconds, last_seen from public.sessions where website_id=${s.id}`;
    eq(after.total_duration_seconds, 0, 'expired session duration untouched');
  }),

  test('quota: month rollover resets events_this_month and unblocks ingest', async () => {
    const s = await newSite(userA.id, { quota: 5 });
    // Simulate a site that hit its cap LAST month.
    await db`update public.websites set events_this_month = 999999, quota_month = (date_trunc('month', now()) - interval '1 month')::date where id=${s.id}`;
    const r = await ingest(s.id, 'vh-rollover-1', { event: null });
    ok(r.ok);
    const [w] = await db`select events_this_month, quota_month from public.websites where id=${s.id}`;
    eq(w.events_this_month, 1, 'counter reset to exactly this event');
    const cur = await db`select quota_month = date_trunc('month', now())::date as rolled from public.websites where id=${s.id}`;
    eq(cur[0].rolled, true, 'quota_month advanced to current month');
  }),

  test('accuracy: bounce = EXACTLY one pageview; event-only sessions are not bounces', async () => {
    const s = await newSite(userA.id);
    const y = new Date(Date.now() - 86400000);
    // session with 1 pageview -> bounce
    const [b] = await db`insert into public.sessions (website_id, visitor_hash, first_seen, last_seen, pageview_count)
      values (${s.id}, 'vhB1', ${y}, ${y}, 1) returning id`;
    // session with 0 pageviews but custom events -> NOT a bounce
    const [e] = await db`insert into public.sessions (website_id, visitor_hash, first_seen, last_seen, pageview_count, event_count)
      values (${s.id}, 'vhB2', ${y}, ${y}, 0, 3) returning id`;
    for (const sid of [b.id, e.id]) {
      await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
        values (${s.id}, ${sid}, ${'/x'}, ${y}, ${sid === e.id ? 'click' : null})`;
    }
    await rpcRest('run_daily_rollup', { p_target_date: y.toISOString().slice(0, 10) });
    const [ds] = await db`select sessions, bounces from public.daily_stats where website_id=${s.id} and day=${y.toISOString().slice(0, 10)}`;
    eq(Number(ds.sessions), 2, 'two sessions');
    eq(Number(ds.bounces), 1, 'only the single-pageview session is a bounce');
  }),

  test('accuracy: get_top_referrers counts PAGEVIEWS only (not custom events)', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-ref-1';
    // The Worker parses the referrer to a bare host before calling the RPC.
    await ingest(s.id, vh, { path: '/a', ref: 'google.com', event: null });
    await ingest(s.id, vh, { path: '/b', ref: 'google.com', event: null });
    await ingest(s.id, vh, { path: '/c', ref: 'google.com', event: 'click' }); // must not count
    const tok = await signIn(userA.email);
    const rows = await rpcRest('get_top_referrers', {
      p_website_id: s.id,
      p_start: new Date(Date.now() - 3600000).toISOString(),
      p_end: new Date().toISOString(),
    }, tok);
    ok(rows.ok, `get_top_referrers ok: ${rows.status} ${rows.text.slice(0,200)}`);
    const data = JSON.parse(rows.text);
    const g = data.find((r) => r.referrer_domain === 'google.com');
    ok(g, 'google.com present');
    eq(Number(g.pageviews), 2, 'custom event excluded from referrer views');
  }),

  test('accuracy: get_top_pages excludes custom events', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-pages-1';
    await ingest(s.id, vh, { path: '/real', event: null });
    await ingest(s.id, vh, { path: '/real', event: 'click' });
    const tok = await signIn(userA.email);
    const rows = await rpcRest('get_top_pages', {
      p_website_id: s.id,
      p_start: new Date(Date.now() - 3600000).toISOString(),
      p_end: new Date().toISOString(),
    }, tok);
    ok(rows.ok, `get_top_pages ok: ${rows.status} ${rows.text.slice(0,200)}`);
    const data = JSON.parse(rows.text);
    const p = data.find((r) => r.url_path === '/real');
    ok(p, '/real present');
    eq(Number(p.pageviews), 1, 'only the pageview counted');
  }),

  test('accuracy: stats include the last COMPLETE day when range ends before now', async () => {
    const s = await newSite(userA.id);
    const now = new Date();
    const yMidnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 86400000;
    const yday = new Date(yMidnightUtc).toISOString().slice(0, 10);
    // Rollup row for yesterday only exists in daily_stats (raw purged scenario).
    await db`insert into public.daily_stats (website_id, day, pageviews, unique_visitors, sessions, bounces, total_duration_seconds)
      values (${s.id}, ${yday}, 7, 3, 4, 1, 120) on conflict do nothing`;
    // Old bug: end=yesterday 23:59 dropped yesterday entirely. It must be counted.
    const tok = await signIn(userA.email);
    const r = await rpcRest('get_website_stats', {
      p_website_id: s.id,
      p_start: new Date(yMidnightUtc - 10 * 86400000).toISOString(),
      p_end: new Date(yMidnightUtc + 86399999).toISOString(), // yesterday 23:59:59.999
    }, tok);
    ok(r.ok, 'owner read ok');
    const stats = JSON.parse(r.text);
    eq(Number(stats.pageviews), 7, `yesterday included via daily_stats (got ${stats.pageviews})`);
    eq(Number(stats.visitors), 3, 'visitors from rollup day');
  }),

  test('robustness: concurrent first-pageview burst keeps ALL events (session fanout tolerated)', async () => {
    const s = await newSite(userA.id, { quota: 100000 });
    const N = 20;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        ingest(s.id, `vh-race-${i}`, { path: `/race-${i}`, event: null })
      )
    );
    ok(results.every((r) => r.ok), 'all concurrent ingests returned ok');
    const [ev] = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev.n, N, 'zero events lost under concurrency');
    const [se] = await db`select count(*)::int n from public.sessions where website_id=${s.id}`;
    ok(se.n >= 1 && se.n <= N, `sessions between 1..N (got ${se.n}) — documented best-effort fanout`);
  }),

  test('robustness: same visitor rapid-fire pageviews all land in ONE session', async () => {
    const s = await newSite(userA.id);
    const vh = 'vh-burst-same';
    // Advisory lock in ingest_event serializes same-visitor ingests, so the
    // 30-min window lookup always sees the previous insert.
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => ingest(s.id, vh, { path: `/p${i}`, event: null }))
    );
    const se = await db`select id, pageview_count from public.sessions where website_id=${s.id} and visitor_hash=${vh}`;
    eq(se.length, 1, `exactly one session under concurrency (got ${se.length})`);
    const cnt = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(cnt[0].n, 8, 'all 8 pageviews stored');
    const [sess] = await db`select pageview_count from public.sessions where website_id=${s.id} and visitor_hash=${vh}`;
    eq(sess.pageview_count, 8, 'pageview_count = 8');
  }),

  test('run_daily_rollup: daily_stats matches raw counts', async () => {
    const s = await newSite(userA.id);
    const y = new Date(Date.now() - 86400000);
    // two sessions that "first saw" yesterday
    const [se1] = await db`insert into public.sessions (website_id, visitor_hash, hostname, country, first_seen, last_seen, pageview_count, event_count, total_duration_seconds)
      values (${s.id}, 'vhR1', 'h', 'US', ${y}, ${y}, 3, 1, 100) returning id`;
    const [se2] = await db`insert into public.sessions (website_id, visitor_hash, hostname, country, first_seen, last_seen, pageview_count, event_count, total_duration_seconds)
      values (${s.id}, 'vhR2', 'h', 'US', ${y}, ${y}, 1, 0, 0) returning id`;
    // 4 pageview events + 1 custom event for yesterday
    for (let i = 0; i < 4; i++)
      await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
        values (${s.id}, ${se1.id}, ${'/p' + i}, ${y}, null)`;
    await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
      values (${s.id}, ${se2.id}, ${'/p'}, ${y}, 'click')`;
    const r = await rpcRest('run_daily_rollup', { p_target_date: y.toISOString().slice(0, 10) });
    ok(r.ok, 'rollup ok');
    const [ds] = await db`select * from public.daily_stats where website_id=${s.id}`;
    eq(Number(ds.pageviews), 4, 'pageviews=4 (null events only)');
    eq(Number(ds.unique_visitors), 2, 'unique_visitors=2');
    eq(Number(ds.sessions), 2, 'sessions=2');
    eq(Number(ds.bounces), 1, 'bounces=1 (vhR2 pageview_count<=1)');
    eq(Number(ds.total_duration_seconds), 100, 'duration from sessions, not events');
  }),

  test('run_daily_rollup: deletes raw events past retention', async () => {
    const s = await newSite(userA.id, { retention: 1 });
    const old = new Date(Date.now() - 10 * 86400000);
    const [se] = await db`insert into public.sessions (website_id, visitor_hash, first_seen, last_seen, pageview_count)
      values (${s.id}, 'vhOld', ${old}, ${old}, 1) returning id`;
    await db`insert into public.website_events (website_id, session_id, url_path, created_at)
      values (${s.id}, ${se.id}, ${'/old'}, ${old})`;
    await rpcRest('run_daily_rollup', { p_target_date: new Date().toISOString().slice(0, 10) });
    const ev = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(ev[0].n, 0, 'old raw event purged');
    const seCount = await db`select count(*)::int n from public.sessions where website_id=${s.id}`;
    eq(seCount[0].n, 0, 'orphan old session purged');
  }),

  test('schema integrity: NO raw IP column anywhere', async () => {
    const rows = await db`select table_name, column_name from information_schema.columns
      where table_schema='public' and (column_name ilike '%ip%' or column_name ilike '%fingerprint%')`;
    eq(rows.length, 0, `found ip/fingerprint columns: ${JSON.stringify(rows)}`);
  }),

  test('schema integrity: no pg_cron jobs scheduled for our RPCs (free-safe)', async () => {
    // The pg_cron *extension* may exist on the instance; what matters is that
    // we never scheduled a job against it (agent.md §2/§11: "Never enable
    // pg_cron"; rollup is driven by external cron per the deploy plan).
    const ext = await db`select extname from pg_extension where extname='pg_cron'`;
    if (ext.length) console.log('    (info) pg_cron extension is installed but unused');
    const jobs = await db`select jobid, command from cron.job where command ilike '%run_daily_rollup%' or command ilike '%ingest%'`;
    if (jobs.length) {
      console.log(`    \x1b[33m⚠ WARNING\x1b[0m: pg_cron job(s) already scheduled: ${JSON.stringify(jobs)}`);
      console.log('       agent.md §2/§11 forbids pg_cron; you chose external cron. This will');
      console.log('       double-run run_daily_rollup and conflicts with cron-job.org. Remove it.');
    } else {
      console.log('    ✓ no conflicting pg_cron jobs');
    }
  }),

  test('SECURITY: ingest_event NOT executable by PUBLIC (anon)', async () => {
    const s = await newSite(userA.id);
    const r = await rpcRest('ingest_event', {
      p_website_id: s.id, p_visitor_hash: 'x', p_url_path: '/',
    }, ENV.anonKey);
    assert(!r.ok, `anon ingest should be denied, got ${r.status}`);
  }),

  test('SECURITY: run_daily_rollup NOT executable by PUBLIC (anon)', async () => {
    const r = await rpcRest('run_daily_rollup', {}, ENV.anonKey);
    assert(!r.ok, `anon rollup should be denied, got ${r.status}`);
  }),

  test('SECURITY: get_public_* works for public site, denied for private', async () => {
    const pub = await newSite(userA.id, { is_public: true, domain: 'pub.local' });
    const priv = await newSite(userB.id, { is_public: false, domain: 'priv.local' });
    const rp = await rpcRest('get_public_website_stats', {
      p_share_token: pub.share_token,
      p_start: new Date(Date.now() - 86400000).toISOString(),
      p_end: new Date().toISOString(),
    }, ENV.anonKey);
    ok(rp.ok, 'public share readable by anon');
    const rpriv = await rpcRest('get_public_website_stats', {
      p_share_token: priv.share_token,
      p_start: new Date(Date.now() - 86400000).toISOString(),
      p_end: new Date().toISOString(),
    }, ENV.anonKey);
    assert(!rpriv.ok, 'private site share denied');
    const rbad = await rpcRest('get_public_website_stats', {
      p_share_token: 'nonexistent-token',
      p_start: new Date().toISOString(),
      p_end: new Date().toISOString(),
    }, ENV.anonKey);
    assert(!rbad.ok, 'bad token denied');
  }),

  test('SECURITY: ownership enforced on get_website_stats (RLS + fn check)', async () => {
    const siteA = await newSite(userA.id, { domain: 'own-a.local' });
    const siteB = await newSite(userB.id, { domain: 'own-b.local' });
    const tokA = await signIn(userA.email);
    const tokB = await signIn(userB.email);
    const ownOk = await rpcRest('get_website_stats', {
      p_website_id: siteA.id,
      p_start: new Date(Date.now() - 86400000).toISOString(),
      p_end: new Date().toISOString(),
    }, tokA);
    if (!ownOk.ok) console.log('    owner read:', ownOk.status, ownOk.text.slice(0, 200));
    ok(ownOk.ok, 'owner can read own site');
    const crossFail = await rpcRest('get_website_stats', {
      p_website_id: siteA.id,
      p_start: new Date(Date.now() - 86400000).toISOString(),
      p_end: new Date().toISOString(),
    }, tokB);
    assert(!crossFail.ok, 'user B cannot read user A site (IDOR blocked)');
    const anonFail = await rpcRest('get_website_stats', {
      p_website_id: siteA.id,
      p_start: new Date().toISOString(),
      p_end: new Date().toISOString(),
    }, ENV.anonKey);
    assert(!anonFail.ok, 'anon cannot read any site');
  }),
];

async function main() {
  await run('RPC + RLS integration (real Supabase)', tests);

  // teardown
  try {
    for (const id of sites) {
      await db`delete from public.website_events where website_id=${id}`;
      await db`delete from public.sessions where website_id=${id}`;
      await db`delete from public.daily_stats where website_id=${id}`;
      await db`delete from public.websites where id=${id}`;
    }
    if (userA) await deleteTestUser(userA.id);
    if (userB) await deleteTestUser(userB.id);
  } catch (e) {
    console.log('  teardown warning:', e.message);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
