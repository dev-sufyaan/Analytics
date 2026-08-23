// scripts/test/lib.mjs
// Shared harness for the Analytics hardcore test suite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export const ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  databaseUrl: process.env.DATABASE_URL,
};

export function haveDb() {
  return Boolean(ENV.databaseUrl && ENV.supabaseUrl && ENV.serviceKey);
}

export function sql() {
  return postgres(ENV.databaseUrl, { ssl: { rejectUnauthorized: false }, max: 5 });
}

// ---- Tiny test runner ----
let passed = 0;
let failed = 0;
const failures = [];

export function test(name, fn) {
  // Deferred: the body runs only when run() invokes it, so tests execute
  // sequentially (setup tests run before dependents).
  return { name, run: fn };
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
export function eq(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
export function ok(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

export async function run(label, tests) {
  console.log(`\n\x1b[1m${label}\x1b[0m`);
  for (const t of tests) {
    try {
      await t.run();
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${t.name}`);
    } catch (err) {
      failed++;
      failures.push({ name: t.name, err });
      console.log(`  \x1b[31m✗\x1b[0m ${t.name}`);
      const lines = String(err.message || err).split('\n');
      for (const l of lines.slice(0, 3)) console.log(`      ${l}`);
      if (process.env.TEST_VERBOSE) {
        if (err.query) console.log('      QUERY:', String(err.query).slice(0, 300));
        if (err.parameters) console.log('      PARAMS:', JSON.stringify(err.parameters).slice(0, 200));
        if (err.stack) console.log(err.stack.split('\n').slice(1, 5).join('\n'));
      }
    }
  }
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.name}: ${String(f.err.message || f.err).split('\n')[0]}`);
    process.exit(1);
  }
}

// ---- Supabase Auth admin helpers (create/delete a real test user) ----
export async function createTestUser(email) {
  const res = await fetch(`${ENV.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ENV.serviceKey,
      Authorization: `Bearer ${ENV.serviceKey}`,
    },
    body: JSON.stringify({
      email,
      password: 'test-password-123!',
      email_confirm: true,
      user_metadata: { test: true },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`createTestUser failed: ${res.status} ${JSON.stringify(data)}`);
  const id = data.id || data.data?.id || (data.data && data.data.id);
  if (!id) throw new Error(`createTestUser: no id in response ${JSON.stringify(data).slice(0, 200)}`);
  return { id, email };
}

export const TEST_PASSWORD = 'test-password-123!';

export async function signIn(email) {
  const res = await fetch(`${ENV.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ENV.anonKey,
      Authorization: `Bearer ${ENV.anonKey}`,
    },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`signIn failed: ${res.status} ${JSON.stringify(data)}`);
  return data.access_token;
}

export async function deleteTestUser(id) {
  if (!id) return;
  await fetch(`${ENV.supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: ENV.serviceKey, Authorization: `Bearer ${ENV.serviceKey}` },
  }).catch(() => {});
}

// ---- REST RPC caller (used to test grants / RLS exactly like a client) ----
export async function rpcRest(fn, body, key) {
  const bearer = key ?? ENV.serviceKey;
  const res = await fetch(`${ENV.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // apikey identifies the project; the bearer carries the role
      // (anon / user JWT / service_role). Mixing them previously sent a
      // user JWT as the apikey -> "Invalid API key".
      apikey: ENV.anonKey,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, ok: res.ok, text: await res.text() };
}
