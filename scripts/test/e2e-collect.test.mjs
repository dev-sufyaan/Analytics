// scripts/test/e2e-collect.test.mjs
// HARDCORE end-to-end test of the real collect path: boots the actual Next.js
// dev server and fires beacons over HTTP at /c — exactly what browsers do.
// Verifies acceptance, rejection (bots, size cap, bad uuid, allowlist),
// batching, heartbeats, sanitization, and zero-loss under a concurrent burst.
// Requires .env.local (DATABASE_URL + Supabase keys). Skips if absent.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, ok, run, sql, ENV, haveDb } from './lib.mjs';

if (!haveDb()) {
  console.log('\n\x1b[33mSKIP\x1b[0m e2e-collect.test.mjs — DATABASE_URL / Supabase keys not set in .env.local');
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../../apps/web');

// Pick a free port so parallel runs / stale dev servers never collide.
function getFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const PORT = await getFreePort();
const BASE = `http://localhost:${PORT}`;
const HOST = 'e2e.local'; // site domain used for the allowlist
const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const db = sql();
let server;
let siteId;

function startServer() {
  return new Promise((resolve, reject) => {
    const candidates = [
      path.join(WEB_DIR, 'node_modules/.bin/next'),
      path.resolve(__dirname, '../../node_modules/.bin/next'),
    ];
    const bin = candidates.find((p) => fs.existsSync(p));
    if (!bin) return reject(new Error('next binary not found in ' + candidates.join(', ')));
    server = spawn(bin, ['dev', '-p', String(PORT)], {
      cwd: WEB_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }, // apps/web/.env.local is loaded by Next itself
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error('dev server start timeout:\n' + out.slice(-2000))), 120000);
    const onData = async (d) => {
      out += d.toString();
      if (/Ready|started server|Local:/i.test(out)) {
        // probe until the route actually answers
        for (let i = 0; i < 60; i++) {
          try {
            const r = await fetch(`${BASE}/c`, { method: 'OPTIONS' });
            if (r.status === 204) {
              clearTimeout(timer);
              resolve();
              return;
            }
          } catch {}
          await new Promise((r2) => setTimeout(r2, 1000));
        }
        clearTimeout(timer);
        reject(new Error('server up but /c never answered:\n' + out.slice(-2000)));
      }
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', onData);
    server.on('exit', (code) => reject(new Error(`next dev exited early (${code}):\n` + out.slice(-2000))));
  });
}

async function beacon(body, headers = {}) {
  return fetch(`${BASE}/c`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: `https://${HOST}`,
      Referer: `https://${HOST}/`,
      'User-Agent': 'Mozilla/5.0 (E2E Test) Chrome/120',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function countEvents(extraWhere = '') {
  // extraWhere is test-controlled constant SQL (never user input); siteId is
  // passed as a real parameter. Leading "and" tolerated.
  const extra = extraWhere.replace(/^\s*and\s+/i, '');
  const rows = await db.unsafe(
    'select count(*)::int n from public.website_events where website_id = $1' +
      (extra ? ' and ' + extra : ''),
    [siteId]
  );
  return rows[0].n;
}

// after() runs ingest in the background — poll the DB instead of sleeping.
async function waitFor(fn, ms = 15000, label = 'condition') {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

const tests = [
  test('setup: boot Next.js dev server + seed test site', async () => {
    await startServer();
    const [row] = await db`
      insert into public.websites (user_id, name, domain, allowed_domains, data_retention_days, monthly_event_quota)
      values (
        (select id from auth.users limit 1),
        'e2e-collect', ${HOST}, array[${HOST}]::text[], 30, 1000000
      )
      returning id`;
    siteId = row.id;
    ok(siteId, 'site seeded');
  }),

  test('CORS preflight: OPTIONS answered with permissive collect headers', async () => {
    const r = await fetch(`${BASE}/c`, { method: 'OPTIONS' });
    eq(r.status, 204);
    eq(r.headers.get('access-control-allow-origin'), '*');
    ok((r.headers.get('access-control-allow-methods') || '').includes('POST'));
  }),

  test('non-POST to /c is silently swallowed (204)', async () => {
    const r = await fetch(`${BASE}/c`);
    eq(r.status, 204);
  }),

  test('valid pageview beacon is accepted AND stored (background ingest)', async () => {
    const before = await countEvents();
    const r = await beacon({ w: siteId, n: 'pageview', u: '/landing?utm_source=x&gclid=y', t: 'Landing', s: '1920x1080', l: 'en-US', d: null, p: null });
    eq(r.status, 204, '/c returns instant 204');
    const rows = await waitFor(
      () => db`select url_path, title, event_name from public.website_events where website_id=${siteId} order by id desc limit 1`
        .then((rs) => (rs.length && rs[0].url_path === '/landing' ? rs[0] : null)),
      20000,
      'pageview row'
    );
    eq(rows.url_path, '/landing', 'query stripped from stored path');
    eq(rows.event_name, null, 'stored as pageview');
    eq(rows.title, 'Landing');
    ok((await countEvents()) >= before + 1);
  }),

  test('bot user-agent is dropped with 204 and nothing stored', async () => {
    const before = await countEvents();
    const r = await beacon({ w: siteId, u: '/bot-page' }, { 'User-Agent': 'Googlebot/2.1 (+http://google.com/bot.html)' });
    eq(r.status, 204);
    await new Promise((r2) => setTimeout(r2, 1500));
    eq(await countEvents(), before, 'no bot event stored');
  }),

  test('malformed website id is dropped (no PostgREST injection)', async () => {
    const before = await countEvents();
    for (const bad of ['not-a-uuid', `${UUID}?id=eq.${UUID}`, '', '123']) {
      const r = await beacon({ w: bad, u: '/evil' });
      eq(r.status, 204, `204 for w=${JSON.stringify(bad)}`);
    }
    await new Promise((r2) => setTimeout(r2, 1500));
    eq(await countEvents(), before, 'nothing stored for junk ids');
  }),

  test('disallowed origin is rejected by the domain allowlist', async () => {
    const before = await countEvents();
    const r = await beacon({ w: siteId, u: '/spoofed' }, { Origin: 'https://evil.example.com' });
    eq(r.status, 204);
    await new Promise((r2) => setTimeout(r2, 1500));
    eq(await countEvents(), before, 'cross-site spoofing blocked');
  }),

  test('oversized body (>16KB) is dropped', async () => {
    const before = await countEvents();
    const big = JSON.stringify({ w: siteId, u: '/big', p: { blob: 'x'.repeat(20000) } });
    ok(big.length > 16384);
    const r = await beacon(big);
    eq(r.status, 204);
    await new Promise((r2) => setTimeout(r2, 1500));
    eq(await countEvents(), before, 'oversize payload not stored');
  }),

  test('invalid JSON is swallowed with 204', async () => {
    const r = await beacon('{this is not json');
    eq(r.status, 204);
  }),

  test('BATCHED beacon (array) stores every event', async () => {
    const before = await countEvents();
    const r = await beacon([
      { w: siteId, n: 'pageview', u: '/batch-a' },
      { w: siteId, n: 'pageview', u: '/batch-b' },
      { w: siteId, n: 'add_to_cart', u: '/batch-b', p: { sku: 'A1', price: 9.99 } },
    ]);
    eq(r.status, 204);
    await waitFor(() => countEvents(`and url_path like '/batch-%'`).then((n) => n >= 3), 20000, 'batch rows');
    const ev = await db`select event_name, event_data from public.website_events where website_id=${siteId} and event_name='add_to_cart' limit 1`;
    ok(ev.length === 1, 'custom event from batch stored');
    eq(ev[0].event_data.sku, 'A1', 'event props intact');
    ok((await countEvents()) - before >= 3);
  }),

  test('heartbeat via /c increments session duration (clamped)', async () => {
    // NOTE: earlier beacons already opened a session for this visitor hash;
    // the /hb-entry pageview JOINS it (30-min window), so we assert on the
    // site-wide duration delta, not on entry_path.
    const sessBefore = await db`select coalesce(max(total_duration_seconds),0)::int m from public.sessions where website_id=${siteId}`;
    await beacon({ w: siteId, n: 'pageview', u: '/hb-entry' });
    await waitFor(() => countEvents(`and url_path='/hb-entry'`).then((n) => n >= 1), 20000, 'session entry');
    const r = await beacon({ w: siteId, n: 'heartbeat', d: 42 });
    eq(r.status, 204);
    const sess = await waitFor(
      () =>
        db`select coalesce(max(total_duration_seconds),0)::int m from public.sessions where website_id=${siteId}`.then(
          (rs) => (rs[0].m >= sessBefore[0].m + 42 ? rs[0] : null)
        ),
      20000,
      'duration update'
    );
    ok(sess.m >= sessBefore[0].m + 42, `duration grew by >= 42 (got ${sess.m}, before ${sessBefore[0].m})`);
  }),

  test('XSS/unicode payloads are stored safely as data', async () => {
    const xssTitle = '<script>alert("x")</script> 日本語 🎯';
    const r = await beacon({ w: siteId, n: 'pageview', u: '/xss', t: xssTitle });
    eq(r.status, 204);
    const row = await waitFor(
      () => db`select title from public.website_events where website_id=${siteId} and url_path='/xss'`
        .then((rs) => rs[0] || null),
      20000,
      'xss row'
    );
    eq(row.title, xssTitle, 'stored verbatim as DATA (never executed)');
  }),

  test('BURST: 30 concurrent beacons -> zero loss, zero errors', async () => {
    const before = await countEvents(`and url_path like '/burst/%'`);
    const N = 30;
    // Unique paths: the 1s same-path dedupe is CORRECT behavior and would
    // otherwise collapse repeats — this test isolates concurrency loss.
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        beacon({ w: siteId, n: 'pageview', u: `/burst/${i}` })
      )
    );
    ok(results.every((r) => r.status === 204), 'all 30 got clean 204s');
    await waitFor(() => countEvents(`and url_path like '/burst/%'`).then((n) => n - before >= N), 30000, 'burst rows');
    const stored = await countEvents(`and url_path like '/burst/%'`);
    eq(stored - before, N, `exactly ${N} burst events stored (got ${stored - before})`);
  }),
];

async function main() {
  let failedOverall = false;
  try {
    await run('E2E collect (real HTTP through Next.js /c)', tests);
  } catch {
    failedOverall = true;
  } finally {
    try {
      if (siteId) {
        await db`delete from public.website_events where website_id=${siteId}`;
        await db`delete from public.sessions where website_id=${siteId}`;
        await db`delete from public.daily_stats where website_id=${siteId}`;
        await db`delete from public.websites where id=${siteId}`;
      }
    } catch (e) {
      console.log('  teardown warning:', e.message);
    }
    await db.end();
    if (server) {
      server.kill('SIGTERM');
      setTimeout(() => server && server.kill('SIGKILL'), 3000);
    }
  }
  process.exit(failedOverall ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  if (server) server.kill('SIGKILL');
  process.exit(1);
});
