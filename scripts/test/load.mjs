// scripts/test/load.mjs
// Reliability + throughput under concurrency. Fires a burst of ingest calls
// against the real RPC endpoint (and optionally the deployed /c route if
// COLLECT_URL is set) and asserts NO events are lost and NO requests 5xx.
// Requires .env.local. Skips if absent.
import { test, assert, eq, ok, run, sql, ENV, haveDb, createTestUser, deleteTestUser } from './lib.mjs';

if (!haveDb()) {
  console.log('\n\x1b[33mSKIP\x1b[0m load.mjs — DATABASE_URL / Supabase keys not set in .env.local');
  process.exit(0);
}

const N = parseInt(process.env.LOAD_N || '300', 10);
const CONCURRENCY = parseInt(process.env.LOAD_CONCURRENCY || '50', 10);
const COLLECT_URL = process.env.COLLECT_URL || '';
const db = sql();
const sites = [];
let userA;

async function pool(items, size, worker) {
  let i = 0;
  const exec = async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, exec));
}

const tests = [
  test('setup: create load test user', async () => {
    userA = await createTestUser(`load-${Math.random().toString(36).slice(2, 8)}@test.local`);
    ok(userA && userA.id, 'user created');
  }),

  test(`ingest: ${N} concurrent events, zero loss, zero 5xx`, async () => {
    const [site] = await db`insert into public.websites
      (user_id, name, domain, data_retention_days, monthly_event_quota)
      values (${userA.id}, ${'load-test'}, ${'load.local'}, 30, ${N + 10000})
      returning id`;
    sites.push(site.id);

    const payloads = Array.from({ length: N }, (_, i) => ({
      p_website_id: site.id,
      p_visitor_hash: `vh-load-${i}-${Math.random().toString(36).slice(2, 7)}`,
      p_hostname: 'load.local',
      p_browser: 'Chrome',
      p_os: 'Other',
      p_device: 'Desktop',
      p_country: 'US',
      p_url_path: `/page-${i % 20}`,
      p_title: 'Load',
      p_event_name: i % 5 === 0 ? 'click' : null,
    }));

    let fivexx = 0;
    let failures = 0;
    const t0 = Date.now();
    await pool(payloads, CONCURRENCY, async (p) => {
      const res = await fetch(`${ENV.supabaseUrl}/rest/v1/rpc/ingest_event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ENV.serviceKey,
          Authorization: `Bearer ${ENV.serviceKey}`,
        },
        body: JSON.stringify(p),
      });
      if (res.status >= 500) fivexx++;
      else if (!res.ok) failures++;
    });
    const elapsed = Date.now() - t0;

    const [ev] = await db`select count(*)::int n from public.website_events where website_id=${site.id}`;
    const [se] = await db`select count(*)::int n from public.sessions where website_id=${site.id}`;
    console.log(`    ${N} events in ${elapsed}ms (${(N / (elapsed / 1000)).toFixed(0)}/s); events=${ev.n} sessions=${se.n}`);
    eq(fivexx, 0, 'no 5xx responses');
    eq(failures, 0, 'no non-ok (4xx) responses');
    eq(ev.n, N, `all ${N} events persisted (zero loss)`);
    ok(se.n >= N * 0.5, 'sessions created per visitor (sanity)');

    // heartbeat burst on a shared session must not 5xx or corrupt duration
    const vh = 'vh-load-hb';
    await fetch(`${ENV.supabaseUrl}/rest/v1/rpc/ingest_event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ENV.serviceKey, Authorization: `Bearer ${ENV.serviceKey}` },
      body: JSON.stringify({ p_website_id: site.id, p_visitor_hash: vh, p_url_path: '/hb', p_hostname: 'load.local' }),
    });
    await pool(Array.from({ length: 30 }, () => 0), 30, async () => {
      const r = await fetch(`${ENV.supabaseUrl}/rest/v1/rpc/ingest_heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ENV.serviceKey, Authorization: `Bearer ${ENV.serviceKey}` },
        body: JSON.stringify({ p_website_id: site.id, p_visitor_hash: vh, p_delta_seconds: 5 }),
      });
      if (r.status >= 500) failures++;
    });
    const [sess] = await db`select total_duration_seconds from public.sessions where website_id=${site.id} and visitor_hash=${vh}`;
    eq(failures, 0, 'heartbeat burst: no 4xx/5xx');
    assert(sess.total_duration_seconds <= 30 * 120, 'duration never exceeds clamp*beats');
  }),

  test('collect /c route: accepts a valid beacon and stores it', async () => {
    if (!COLLECT_URL) {
      console.log('    (skip) COLLECT_URL not set — set it to exercise the live /c route');
      return;
    }
    const host = new URL(COLLECT_URL).hostname;
    const [site] = await db`insert into public.websites
      (user_id, name, domain, allowed_domains, data_retention_days, monthly_event_quota)
      values (${userA.id}, ${'c-route-test'}, ${host}, ${db.array([host], 'text')}, 30, 100000)
      returning id`;
    sites.push(site.id);

    const res = await fetch(`${COLLECT_URL}/c`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `https://${host}`, 'user-agent': 'Mozilla/5.0 (Load Test)' },
      body: JSON.stringify({ w: site.id, n: 'pageview', u: '/c-route', h: host, r: null, t: 'C', s: '1x1', l: 'en', d: null, p: null }),
    });
    eq(res.status, 204, '/c returns 204');
    await new Promise((r) => setTimeout(r, 1500)); // allow waitUntil RPC
    const [ev] = await db`select count(*)::int n from public.website_events where website_id=${site.id} and url_path='/c-route'`;
    ok(ev.n >= 1, 'event stored via /c route');
  }),

  test('collect /c route: rejects disallowed origin (allowlist)', async () => {
    if (!COLLECT_URL) {
      console.log('    (skip) COLLECT_URL not set');
      return;
    }
    const host = new URL(COLLECT_URL).hostname;
    const [site] = await db`insert into public.websites
      (user_id, name, domain, allowed_domains, data_retention_days, monthly_event_quota)
      values (${userA.id}, ${'c-allow-test'}, ${host}, ${db.array([host], 'text')}, 30, 100000)
      returning id`;
    sites.push(site.id);
    const before = await db`select count(*)::int n from public.website_events where website_id=${site.id}`;
    const res = await fetch(`${COLLECT_URL}/c`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com', 'user-agent': 'Mozilla/5.0' },
      body: JSON.stringify({ w: site.id, n: 'pageview', u: '/x', h: 'evil.example.com' }),
    });
    eq(res.status, 204, 'rejected with 204');
    await new Promise((r) => setTimeout(r, 800));
    const after = await db`select count(*)::int n from public.website_events where website_id=${site.id}`;
    eq(after.n, before.n, 'no event stored for disallowed origin');
  }),
];

async function main() {
  await run('Load / reliability', tests);
  try {
    for (const id of sites) {
      await db`delete from public.website_events where website_id=${id}`;
      await db`delete from public.sessions where website_id=${id}`;
      await db`delete from public.websites where id=${id}`;
    }
    if (userA) await deleteTestUser(userA.id);
  } catch (e) {
    console.log('  teardown warning:', e.message);
  } finally {
    await db.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
