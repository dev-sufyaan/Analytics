// scripts/test/schema.test.mjs
// Static security lint over supabase/migrations/*.sql — no database needed.
// Enforces the non-negotiables from agent.md §4/§11:
//   - every function is REVOKEd from PUBLIC
//   - ingest/rollup RPCs granted to service_role ONLY
//   - user-facing get_* granted to authenticated; get_public_* to anon+authenticated
//   - RLS enabled on every data table
//   - no raw IP / fingerprint columns anywhere
//   - required indexes present
//   - no pg_cron
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, assert, eq, ok, run } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
ok(files.length > 0, 'at least one migration exists');

// Strip comments, keep everything else (dollar-quoted bodies included).
function stripComments(sql) {
  let out = '';
  let i = 0;
  let inDollar = false;
  while (i < sql.length) {
    if (!inDollar && sql.startsWith('$$', i)) {
      inDollar = !inDollar;
      out += '$$';
      i += 2;
      continue;
    }
    if (!inDollar && sql.startsWith('--', i)) {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (!inDollar && sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    out += sql[i++];
  }
  return out;
}

const ALL = files.map((f) => `-- ${f}\n` + stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))).join('\n');

// Collect function signatures: name + arg types (from the create statement).
function extractFunctions(sql) {
  const fns = [];
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z_][\w]*)\s*\(([^)]*)\)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const args = m[2]
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
      // "p_x text default null" -> "text"; "default" parts dropped
      .map((a) => {
        const parts = a.split(/\s+/);
        const nameIdx = parts[0].startsWith('p_') ? 1 : 0;
        return (parts[nameIdx] || '').toLowerCase();
      });
    fns.push({ name: m[1], args });
  }
  return fns;
}

function sig(fn) {
  return `${fn.name}(${fn.args.join(',')})`;
}

const fns = extractFunctions(ALL);
ok(fns.length >= 15, `expected the full RPC surface, found ${fns.length} functions`);

const INGEST = ['ingest_event', 'ingest_heartbeat', 'run_daily_rollup'];
const USER_FNS = [
  'get_website_stats',
  'get_timeseries',
  'get_top_pages',
  'get_top_referrers',
  'get_top_countries',
  'get_top_devices',
  'get_top_events',
  'get_realtime_visitors',
];
const PUBLIC_FNS = USER_FNS.map((f) => 'get_public_' + f.replace('get_', ''));

// Extract every dollar-quoted function BODY per name; the last
// create-or-replace wins (migrations are append-only history).
function latestBodies(sql) {
  const bodies = {};
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z_][\w]*)[\s\S]*?\$\$([\s\S]*?)\$\$/gi;
  let m;
  while ((m = re.exec(sql))) bodies[m[1]] = m[2];
  return bodies;
}

const tests = [
  test('migrations: parse cleanly and contain the expected surface', () => {
    for (const n of [...INGEST, ...USER_FNS, ...PUBLIC_FNS]) {
      ok(fns.some((f) => f.name === n), `${n} defined`);
    }
  }),

  test('SECURITY: every function has REVOKE ALL ... FROM PUBLIC', () => {
    const missing = [];
    for (const fn of fns) {
      const re = new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+(?:public\\.)?${fn.name}\\s*\\([^)]*\\)\\s+from\\s+public`,
        'i'
      );
      if (!re.test(ALL)) missing.push(sig(fn));
    }
    eq(missing.length, 0, `missing REVOKE FROM PUBLIC: ${missing.join(', ')}`);
  }),

  test('SECURITY: ingest/rollup RPCs granted to service_role ONLY', () => {
    for (const name of INGEST) {
      const grantBlock = ALL.slice(ALL.indexOf(name));
      const re = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+(?:public\\.)?${name}[\\s\\S]{0,400}?to\\s+([^;]+);`, 'i');
      const m = re.exec(ALL);
      ok(m, `${name} has a grant`);
      const grantees = m[1].toLowerCase();
      ok(grantees.includes('service_role'), `${name} granted to service_role`);
      assert(!/\banon\b/.test(grantees), `${name} NOT granted to anon`);
      assert(!/authenticated/.test(grantees), `${name} NOT granted to authenticated`);
    }
  }),

  test('SECURITY: user-facing get_* NOT granted to anon (ownership enforced)', () => {
    for (const name of USER_FNS) {
      const re = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+(?:public\\.)?${name}\\s*\\([^)]*\\)\\s+to\\s+([^;]+);`, 'i');
      const m = re.exec(ALL);
      ok(m, `${name} has a grant`);
      assert(!/\banon\b/.test(m[1].toLowerCase()), `${name} must not be anon-executable`);
      ok(/authenticated/.test(m[1].toLowerCase()), `${name} granted to authenticated`);
    }
  }),

  test('SECURITY: get_public_* granted to anon + authenticated only', () => {
    for (const name of PUBLIC_FNS) {
      const re = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+(?:public\\.)?${name}\\s*\\([^)]*\\)\\s+to\\s+([^;]+);`, 'i');
      const m = re.exec(ALL);
      ok(m, `${name} has a grant`);
      const g = m[1].toLowerCase();
      ok(/\banon\b/.test(g) && /authenticated/.test(g), `${name} -> anon, authenticated`);
      assert(!/service_role/.test(g), `${name} does not need service_role`);
    }
  }),

  test('RLS: enabled on websites, sessions, website_events, daily_stats', () => {
    for (const table of ['websites', 'sessions', 'website_events', 'daily_stats']) {
      const re = new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
      ok(re.test(ALL), `${table}: RLS enabled`);
    }
  }),

  test('PRIVACY: no raw IP or fingerprint columns in any migration', () => {
    const colRe = /^\s*(\w+)\s+(uuid|text|varchar|bigint|int|boolean|jsonb|timestamptz|date)/gmi;
    const banned = /\b(ip|ip_address|ipaddr|fingerprint|fp_hash)\b/i;
    const lines = ALL.split('\n');
    const hits = [];
    for (const line of lines) {
      const m = colRe.exec(line);
      colRe.lastIndex = 0;
      if (m && banned.test(m[1])) hits.push(line.trim());
    }
    eq(hits.length, 0, `banned columns: ${hits.join(' | ')}`);
  }),

  test('PERF: required indexes declared', () => {
    const required = [
      'idx_sessions_visitor',
      'idx_sessions_site_seen',
      'idx_events_site_created',
      'idx_events_session',
      'idx_events_path',
      'idx_events_referrer',
    ];
    for (const idx of required) {
      ok(new RegExp(`create\\s+index\\s+(?:if\\s+not\\s+exists\\s+)?${idx}\\b`, 'i').test(ALL), `${idx} exists`);
    }
  }),

  test('FREE-SAFE: no pg_cron scheduling in migrations', () => {
    assert(!/cron\.schedule/i.test(ALL), 'cron.schedule() found — forbidden on Supabase Free');
  }),

  test('CORRECTNESS: dedupe only fires when the last event is a same-path pageview', () => {
    const bodies = latestBodies(ALL);
    const body = bodies['ingest_event'];
    ok(body, 'ingest_event body extracted');
    ok(/order by created_at desc\s*limit 1[\s\S]{0,200}?v_last_event\.event_name\s+is\s+null/.test(body),
      'dedupe checks last event of ANY type, requires it to be a pageview');
  }),

  test('CORRECTNESS: bounce = exactly one pageview (pageview_count = 1)', () => {
    const bodies = latestBodies(ALL);
    for (const name of ['run_daily_rollup', 'private_site_kpis']) {
      ok(bodies[name], `${name} body extracted`);
      assert(!/pageview_count\s*<=\s*1/.test(bodies[name]), `${name}: legacy <= 1 bounce semantics`);
      ok(/pageview_count\s*=\s*1/.test(bodies[name]), `${name}: pageview_count = 1 semantics`);
    }
  }),
];

run('Schema & migration security lint (static)', tests);
