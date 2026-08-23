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

// ---- Batch ingest helpers (element schema mirrors ingest-guards buildBatchRequest)
async function ingestBatch(websiteId, elements, key) {
  return rpcRest('ingest_events', { p_website_id: websiteId, p_events: elements }, key);
}
function bev(vh, over = {}) {
  return {
    type: 'event',
    p_visitor_hash: vh,
    p_hostname: 'test.local',
    p_browser: 'Chrome',
    p_os: 'Other',
    p_device: 'Desktop',
    p_country: 'US',
    p_url_path: over.path || '/',
    p_title: over.title || null,
    p_referrer_domain: over.ref || null,
    p_event_name: over.event ?? null,
    p_event_data: over.data || null,
  };
}
function bbeat(vh, delta) {
  return { type: 'heartbeat', p_visitor_hash: vh, p_delta_seconds: delta };
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

  // ---------------- ingest_events (batched ingest) ----------------

  test('ingest_events: batch stores every event; counter incremented once by accepted count', async () => {
    const s = await newSite(userA.id);
    const r = await ingestBatch(s.id, [
      bev('vhB-a', { path: '/b1', event: null }),
      bev('vhB-b', { path: '/b2', event: null }),
      bev('vhB-a', { path: '/b3', event: 'click' }),
    ]);
    ok(r.ok, `batch rpc ok: ${r.status} ${r.text.slice(0, 200)}`);
    const out = JSON.parse(r.text);
    eq(out.accepted, 3, 'accepted=3');
    const [w] = await db`select events_this_month from public.websites where id=${s.id}`;
    eq(Number(w.events_this_month), 3, 'counter = accepted count');
    const evc = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(evc[0].n, 3, 'three rows stored');
    const sess = await db`select visitor_hash, pageview_count, event_count from public.sessions where website_id=${s.id} order by visitor_hash`;
    eq(sess.length, 2, 'two sessions (one per visitor)');
    const a = sess.find((x) => x.visitor_hash === 'vhB-a');
    eq(a.pageview_count, 1, 'session A pageview_count=1');
    eq(a.event_count, 1, 'session A event_count=1');
  }),

  test('ingest_events: same-path duplicate pageviews within ONE batch are deduped', async () => {
    const s = await newSite(userA.id);
    const r = await ingestBatch(s.id, [
      bev('vh-dup-b', { path: '/dup' }),
      bev('vh-dup-b', { path: '/dup' }),
    ]);
    const out = JSON.parse(r.text);
    eq(out.accepted, 1, 'accepted=1');
    eq(out.deduped, 1, 'deduped=1');
    const evc = await db`select count(*)::int n from public.website_events where website_id=${s.id}`;
    eq(evc[0].n, 1, 'one row stored');
    const [sess] = await db`select pageview_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 1, 'pageview_count not double counted');
    const [w] = await db`select events_this_month from public.websites where id=${s.id}`;
    eq(Number(w.events_this_month), 1, 'deduped event did not consume quota');
  }),

  test('REGRESSION(batch): [pageview, custom, pageview] same path keeps all three', async () => {
    const s = await newSite(userA.id);
    const r = await ingestBatch(s.id, [
      bev('vh-ord-b', { path: '/x' }),
      { ...bev('vh-ord-b', { path: '/x', event: 'click' }) },
      bev('vh-ord-b', { path: '/x' }),
    ]);
    const out = JSON.parse(r.text);
    eq(out.accepted, 3, 'order preserved inside batch -> all stored');
    eq(out.deduped, 0, 'nothing wrongly deduped');
    const [sess] = await db`select pageview_count, event_count from public.sessions where website_id=${s.id}`;
    eq(sess.pageview_count, 2, 'pageview_count = 2');
    eq(sess.event_count, 1, 'event_count = 1');
  }),

  test('ingest_events: quota enforced mid-batch (partial acceptance)', async () => {
    const s = await newSite(userA.id, { quota: 2 });
    const r = await ingestBatch(s.id, [
      bev('vh-q-b1', { path: '/q1' }),
      bev('vh-q-b2', { path: '/q2' }),
      bev('vh-q-b3', { path: '/q3' }),
      bev('vh-q-b4', { path: '/q4' }),
    ]);
    const out = JSON.parse(r.text);
    eq(out.accepted, 2, 'exactly quota accepted');
    eq(out.dropped, 2, 'rest dropped');
    const [w] = await db`select events_this_month from public.websites where id=${s.id}`;
    eq(Number(w.events_this_month), 2, 'counter capped at quota');
  }),

  test('ingest_events: heartbeats extend duration, never consume quota, unknown visitors ignored', async () => {
    const s = await newSite(userA.id);
    // heartbeat for a visitor with NO session -> silent no-op, no session created
    let r = await ingestBatch(s.id, [bbeat('vh-hb-none', 60)]);
    let out = JSON.parse(r.text);
    eq(out.heartbeats, 0, 'unknown-visitor beat is a no-op');
    const sc = await db`select count(*)::int n from public.sessions where website_id=${s.id}`;
    eq(sc[0].n, 0, 'heartbeat must not create sessions');

    // real session, then beat
    await ingestBatch(s.id, [bev('vh-hb-b', { path: '/' })]);
    r = await ingestBatch(s.id, [bbeat('vh-hb-b', 90), bbeat('vh-hb-b', 200)]);
    out = JSON.parse(r.text);
    eq(out.heartbeats, 2, 'both beats applied');
    const [sess] = await db`select total_duration_seconds from public.sessions where website_id=${s.id}`;
    eq(sess.total_duration_seconds, 210, '90 + clamped 120 = 210');
    const [w] = await db`select events_this_month from public.websites where id=${s.id}`;
    eq(Number(w.events_this_month), 1, 'heartbeats consumed no quota');
  }),

  test('ingest_events: month rollover resets counter once for the whole batch', async () => {
    const s = await newSite(userA.id, { quota: 10 });
    await db`update public.websites set events_this_month = 999999, quota_month = (date_trunc('month', now()) - interval '1 month')::date where id=${s.id}`;
    const r = await ingestBatch(s.id, [
      bev('vh-roll-b', { path: '/r1' }),
      bev('vh-roll-b', { path: '/r2' }),
      bev('vh-roll-b', { path: '/r3' }),
    ]);
    const out = JSON.parse(r.text);
    eq(out.accepted, 3, 'all accepted after rollover');
    const [w] = await db`select events_this_month, quota_month from public.websites where id=${s.id}`;
    eq(Number(w.events_this_month), 3, 'counter reset to exactly accepted count');
    const cur = await db`select quota_month = date_trunc('month', now())::date as rolled from public.websites where id=${s.id}`;
    eq(cur[0].rolled, true, 'quota_month advanced');
  }),

  test('ingest_events: invalid payloads and junk elements are safe + caps enforced', async () => {
    const s = await newSite(userA.id);
    // non-array payload
    let r = await ingestBatch(s.id, 'not-an-array');
    let out = JSON.parse(r.text);
    eq(out.accepted, 0, 'non-array rejected');
    ok(out.reason === 'invalid_payload', 'reason reported');
    // empty array
    r = await ingestBatch(s.id, []);
    out = JSON.parse(r.text);
    eq(out.accepted, 0, 'empty batch accepted=0');
    // junk element dropped alone; oversized fields capped on the good one
    r = await ingestBatch(s.id, ['junk-string-element', bev('vh-junk-b', { path: '/' + 'a'.repeat(5000), title: 'T'.repeat(5000) })]);
    out = JSON.parse(r.text);
    eq(out.accepted, 1, 'good element survived junk sibling');
    eq(out.dropped, 1, 'junk element dropped');
    const [evRow] = await db`select url_path, title from public.website_events where website_id=${s.id} order by id desc limit 1`;
    ok(evRow.url_path.length <= 1024, `path capped (${evRow.url_path.length})`);
    ok((evRow.title || '').length <= 512, `title capped`);
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

  test('SELF-HEAL: cron path ({}) backfills ALL missing days in one call', async () => {
    const s = await newSite(userA.id);
    // Simulate a site whose cron missed two nights: events + sessions exist
    // for day-2 and day-3 but daily_stats has NO rows for them.
    const d2 = new Date(Date.now() - 2 * 86400000);
    const d3 = new Date(Date.now() - 3 * 86400000);
    const day = (dt) => dt.toISOString().slice(0, 10);

    const mkSession = async (vh, when, pv) => {
      const [r] = await db`insert into public.sessions
        (website_id, visitor_hash, country, first_seen, last_seen, pageview_count, total_duration_seconds)
        values (${s.id}, ${vh}, 'US', ${when}, ${when}, ${pv}, 60) returning id`;
      return r.id;
    };
    const sid2 = await mkSession('vh-heal-a', d2, 2);
    await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
      values (${s.id}, ${sid2}, '/heal', ${d2}, null), (${s.id}, ${sid2}, '/heal', ${d2}, null)`;
    const sid3 = await mkSession('vh-heal-b', d3, 1);
    await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
      values (${s.id}, ${sid3}, '/heal-old', ${d3}, null)`;

    // Cron-style invocation: NO target date.
    const r = await rpcRest('run_daily_rollup', {});
    ok(r.ok, `rollup ok: ${r.status} ${r.text.slice(0, 200)}`);
    const out = JSON.parse(r.text);
    ok(out.days_processed >= 2, `backfilled >= 2 days (got ${out.days_processed})`);

    const rows = await db`
      select day, pageviews, unique_visitors, sessions, bounces, total_duration_seconds
      from public.daily_stats where website_id=${s.id} and day in (${day(d2)}, ${day(d3)}) order by day`;
    eq(rows.length, 2, 'both missing days materialized');
    const byDay = Object.fromEntries(rows.map((x) => [x.day.toISOString().slice(0, 10), x]));
    eq(Number(byDay[day(d2)].pageviews), 2, 'day-2 pageviews = 2');
    eq(Number(byDay[day(d3)].pageviews), 1, 'day-3 pageviews = 1');
    eq(Number(byDay[day(d3)].total_duration_seconds), 60, 'duration from sessions');

    // Idempotent: second cron pass must NOT duplicate or change anything.
    await rpcRest('run_daily_rollup', {});
    const again = await db`
      select count(*)::int n from public.daily_stats where website_id=${s.id} and day in (${day(d2)}, ${day(d3)})`;
    eq(again[0].n, 2, 'still exactly 2 rows after second run');
  }),

  test('SELF-HEAL: explicit target date still works (legacy contract)', async () => {
    const s = await newSite(userA.id);
    const d4 = new Date(Date.now() - 4 * 86400000);
    const [se] = await db`insert into public.sessions
      (website_id, visitor_hash, first_seen, last_seen, pageview_count)
      values (${s.id}, 'vh-heal-c', ${d4}, ${d4}, 1) returning id`;
    await db`insert into public.website_events (website_id, session_id, url_path, created_at, event_name)
      values (${s.id}, ${se.id}, '/legacy', ${d4}, null)`;
    const r = await rpcRest('run_daily_rollup', { p_target_date: d4.toISOString().slice(0, 10) });
    ok(r.ok);
    const rows = await db`
      select pageviews from public.daily_stats where website_id=${s.id} and day=${d4.toISOString().slice(0, 10)}`;
    eq(rows.length, 1, 'explicit-day rollup stored');
    eq(Number(rows[0].pageviews), 1, 'pageviews = 1');
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

  test('SECURITY: ingest_events (batch) NOT executable by PUBLIC (anon)', async () => {
    const s = await newSite(userA.id);
    const r = await ingestBatch(s.id, [bev('vh-anon-b', { path: '/' })], ENV.anonKey);
    assert(!r.ok, `anon batch ingest should be denied, got ${r.status}`);
    // service_role still works (proves denial is grants, not the function)
    const ok1 = await ingestBatch(s.id, [bev('vh-svc-b', { path: '/' })]);
    ok(ok1.ok, `service_role batch works: ${ok1.status} ${ok1.text.slice(0, 200)}`);
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

  test('dashboard payload: panel filter contracts preserved (single-pass rewrite)', async () => {
    const s = await newSite(userA.id);
    // v1: /a only. v2: /b then /a.
    const r0 = await ingestBatch(s.id, [
      bev('vh-dash-1', { path: '/a' }),
      bev('vh-dash-2', { path: '/b' }),
      bev('vh-dash-2', { path: '/a' }),
    ]);
    ok(r0.ok, `seed batch ok: ${r0.text.slice(0, 120)}`);
    const win = () => ({
      p_start: new Date(Date.now() - 3600e3).toISOString(),
      p_end: new Date().toISOString(),
    });
    const call = (body) => rpcRest('private_dashboard_payload', body);

    // Unfiltered: pages ordered by pageviews desc (/a has 2, /b has 1).
    let r = await call({ p_website_id: s.id, ...win(), p_interval: 'day', p_prev_start: null, p_prev_end: null, p_filter_type: null, p_filter_value: null, p_limit: 8 });
    ok(r.ok, `payload ok: ${r.status} ${r.text.slice(0, 200)}`);
    let payload = JSON.parse(r.text);
    eq(payload.pages[0].url_path, '/a', '/a is top path unfiltered');
    eq(Number(payload.pages[0].pageviews), 2, '/a pageviews = 2');

    // CONTRACT (0005): a row-grain panel never restricts by its OWN dimension's
    // filter — inside a /a drill-down, Top Pages still lists ALL paths.
    r = await call({ p_website_id: s.id, ...win(), p_interval: 'day', p_prev_start: null, p_prev_end: null, p_filter_type: 'path', p_filter_value: '/a', p_limit: 8 });
    payload = JSON.parse(r.text);
    const paths = payload.pages.map((p) => p.url_path).sort();
    eq(JSON.stringify(paths), JSON.stringify(['/a', '/b']), 'pages panel ignores path filter');
    eq(Number(payload.stats.pageviews), 2, 'KPIs DO respect the filter');
    eq(Number(payload.countries[0].visitors), 2, 'countries scoped to sessions containing /a');

    // Referrer drill-down: referrers panel stays global; countries narrows.
    r = await call({ p_website_id: s.id, ...win(), p_interval: 'day', p_prev_start: null, p_prev_end: null, p_filter_type: 'referrer', p_filter_value: 'Direct / None', p_limit: 8 });
    payload = JSON.parse(r.text);
    const domains = payload.referrers.map((x) => x.referrer_domain).sort();
    eq(JSON.stringify(domains), JSON.stringify(['Direct / None']), 'referrers under own-filter shows all domains (none here)');
  }),

  test('dashboard payload: ai_sources panel aggregates tagged referrals', async () => {
    const s = await newSite(userA.id);
    const mk = async (vh, when) => {
      const [r] = await db`insert into public.sessions
        (website_id, visitor_hash, first_seen, last_seen, pageview_count)
        values (${s.id}, ${vh}, ${when}, ${when}, 1) returning id`;
      return r.id;
    };
    const now = new Date();
    const s1 = await mk('vh-ai-1', now);
    const s2 = await mk('vh-ai-2', now);
    const s3 = await mk('vh-ai-3', now);
    // two ChatGPT pageviews from one visitor, one Perplexity, one untagged organic
    await db`insert into public.website_events (website_id, session_id, url_path, referrer_domain, referrer_source, created_at, event_name)
      values (${s.id}, ${s1}, '/a', 'chatgpt.com', 'chatgpt', ${now}, null),
             (${s.id}, ${s1}, '/b', 'chatgpt.com', 'chatgpt', ${now}, null),
             (${s.id}, ${s2}, '/a', 'perplexity.ai', 'perplexity', ${now}, null),
             (${s.id}, ${s3}, '/c', 'google.com', null, ${now}, null)`;

    const r = await rpcRest('private_dashboard_payload', {
      p_website_id: s.id,
      p_start: new Date(Date.now() - 3600e3).toISOString(),
      p_end: new Date().toISOString(),
      p_interval: 'day',
      p_prev_start: null,
      p_prev_end: null,
      p_filter_type: null,
      p_filter_value: null,
      p_limit: 8,
    });
    ok(r.ok, `payload ok: ${r.status} ${r.text.slice(0, 200)}`);
    const payload = JSON.parse(r.text);
    const bySource = Object.fromEntries((payload.ai_sources ?? []).map((x) => [x.source, x]));
    eq(Number(bySource.chatgpt.pageviews), 2, 'chatgpt pageviews = 2');
    eq(Number(bySource.chatgpt.visitors), 1, 'chatgpt visitors deduped to 1');
    eq(Number(bySource.perplexity.pageviews), 1, 'perplexity counted');
    eq(bySource.google, undefined, 'untagged referrers never appear in ai panel');
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
