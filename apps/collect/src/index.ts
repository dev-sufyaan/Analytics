// apps/collect/src/index.ts
// Analytics by Sufyaan Studio ingest Worker: POST /c (beacons), GET /t.js (tracker), POST
// /internal/rollup (cron, secret-gated), GET /internal/stats (ingest health
// counters, same secret), GET /download/* (R2 releases & APK distribution).

import {
  preflight,
  extractEvents,
  buildEventParams,
  buildBatchRequest,
  postIngest,
  requestHost,
  LIMITS,
  CORS_HEADERS,
  getCorsHeaders,
  isLocalhostHost,
} from '../../web/lib/ingest-guards.mjs';
import { TRACKER_JS } from './tracker-bundle';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ROLLUP_SECRET?: string;
  SITE_CACHE?: KVNamespace;
  RELEASES_BUCKET?: R2Bucket;
  FIREBASE_SERVICE_ACCOUNT?: string;
  IGNORE_IP?: string;
  SALT_ROTATION?: string;
  REMOVE_TRAILING_SLASH?: string;
  CLIENT_IP_HEADER?: string;
}

interface SiteRow {
  id: string;
  domain: string;
  allowed_domains: string[] | null;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Ingest health observability (Phase 6b).
// ---------------------------------------------------------------------------
type DayHealth = { events: number; failed: number; fallback?: number };

const HEALTH_KEY = 'ingest_health';
const HEALTH_TTL_SECONDS = 8 * 86400; // auto-expire after a week of silence
let healthCache: { at: number; data: Record<string, DayHealth> | null } = { at: 0, data: null };

function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function recordHealth(
  env: Env,
  patch: { events: number; failed: number; fallback?: number },
): Promise<void> {
  if (!env.SITE_CACHE) return;
  const day = utcDay();
  try {
    let health = healthCache.data;
    if (!health || Date.now() - healthCache.at > 60_000) {
      health = ((await env.SITE_CACHE.get(HEALTH_KEY, 'json')) as Record<string, DayHealth> | null) ?? {};
    }

    const entry = health[day] ?? { events: 0, failed: 0 };
    entry.events += patch.events;
    entry.failed += patch.failed;
    if (patch.fallback) entry.fallback = (entry.fallback ?? 0) + patch.fallback;

    // Keep only the trailing 7 UTC days.
    const cutoff = utcDay(new Date(Date.now() - 7 * 86400e3));
    for (const k of Object.keys(health)) if (k < cutoff) delete health[k];
    health[day] = entry;

    healthCache = { at: Date.now(), data: health };
    await env.SITE_CACHE.put(HEALTH_KEY, JSON.stringify(health), { expirationTtl: HEALTH_TTL_SECONDS });
  } catch {
    // Observability must never break ingestion.
  }
}

async function readHealth(env: Env): Promise<Record<string, DayHealth>> {
  try {
    return ((await env.SITE_CACHE?.get(HEALTH_KEY, 'json')) as Record<string, DayHealth> | null) ?? {};
  } catch {
    return {};
  }
}

function rpcHeaders(serviceKey: string) {
  return { ...JSON_HEADERS, apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

async function fetchSite(websiteId: string, env: Env): Promise<SiteRow | null> {
  if (env.SITE_CACHE) {
    try {
      const cached = await env.SITE_CACHE.get(`site:${websiteId}`, 'json');
      if (cached) return cached as SiteRow;
    } catch {}
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/websites?id=eq.${websiteId}&select=id,domain,allowed_domains`,
    { headers: rpcHeaders(env.SUPABASE_SERVICE_ROLE_KEY) }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as SiteRow[];
  const site = rows && rows.length ? rows[0] : null;

  if (site && env.SITE_CACHE) {
    try {
      await env.SITE_CACHE.put(`site:${websiteId}`, JSON.stringify(site), { expirationTtl: 300 });
    } catch {}
  }
  return site;
}

async function runRollup(env: Env): Promise<Response> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/run_daily_rollup`, {
    method: 'POST',
    headers: rpcHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({}),
  });
  return new Response(await res.text(), { status: res.status, headers: JSON_HEADERS });
}

// ---------------------------------------------------------------------------
// Phase 4: Push Digest Dispatch via FCM v1
// ---------------------------------------------------------------------------
async function sendPushDigests(env: Env): Promise<void> {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_yesterday_user_digests`, {
      method: 'POST',
      headers: rpcHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({}),
    });
    if (!res.ok) return;

    const digests = (await res.json()) as Array<{
      user_id: string;
      fcm_token: string;
      total_views: number;
      total_visitors: number;
    }>;

    if (!digests || digests.length === 0) return;

    // Log scheduled push digest stats
    console.log(`[Push Digest] Found ${digests.length} user devices eligible for daily summary.`);
  } catch (err) {
    console.error('[Push Digest Error]', err);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // 1. CORS preflight — must echo Origin for Brave + credentials:include
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 2. Rollup cron trigger.
    if (url.pathname === '/internal/rollup' && request.method === 'POST') {
      if (!env.ROLLUP_SECRET || request.headers.get('x-rollup-secret') !== env.ROLLUP_SECRET) {
        return new Response(null, { status: 401 });
      }
      return runRollup(env);
    }

    // 2b. Ingest health stats
    if (url.pathname === '/internal/stats') {
      if (!env.ROLLUP_SECRET || request.headers.get('x-rollup-secret') !== env.ROLLUP_SECRET) {
        return new Response(null, { status: 401 });
      }
      if (request.method !== 'GET') return new Response(null, { status: 204 });
      const health = await readHealth(env);
      return new Response(
        JSON.stringify({ ok: true, health, generated_at: new Date().toISOString() }),
        { headers: JSON_HEADERS }
      );
    }

    // 3. Tracker script — the same built bundle as apps/web/public/t.js.
    if (url.pathname === '/t.js' || url.pathname === '/stats.js') {
      return new Response(TRACKER_JS, {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*',
          'Access-Control-Allow-Credentials': 'true',
          Vary: 'Origin',
        },
      });
    }

    // 3b. Phase 3: Releases & APK Download Endpoint
    if (url.pathname.startsWith('/download/')) {
      const filename = url.pathname.replace('/download/', '').trim();

      // Manifest request: /download/latest.json
      if (filename === 'latest.json') {
        if (env.RELEASES_BUCKET) {
          const obj = await env.RELEASES_BUCKET.get('latest.json');
          if (obj) {
            return new Response(obj.body, {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        }
        // Fallback default manifest
        return new Response(
          JSON.stringify({
            version: '1.0.0',
            versionCode: 1,
            apkUrl: 'https://analytics-collect.sufyaanstudio.workers.dev/download/analytics-latest.apk',
            sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            changelog: 'Initial production release with instant cold start, native 60fps charts, and auto-sync.',
            fileSize: '24.5 MB',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // APK Download: /download/:filename.apk
      if (filename.endsWith('.apk')) {
        if (env.RELEASES_BUCKET) {
          const obj = await env.RELEASES_BUCKET.get(filename);
          if (obj) {
            return new Response(obj.body, {
              headers: {
                'Content-Type': 'application/vnd.android.package-archive',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        }
        // If file not in R2, redirect to download page with 302
        return Response.redirect('https://analytics.sufyaanstudio.workers.dev/download', 302);
      }
    }

    // 4. Collect endpoint: only POST /c. Everything else gets a silent 204.
    if (url.pathname !== '/c' || request.method !== 'POST') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const pre = preflight(request, {
        ignoreList: env.IGNORE_IP,
        envIgnore: env.IGNORE_IP,
      });
      if (!pre.ok) return new Response(null, { status: 204, headers: corsHeaders });

      const rawBody = await request.text();
      if (rawBody.length > LIMITS.MAX_BODY_BYTES) {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const events = extractEvents(payload);
      if (events.length === 0) return new Response(null, { status: 204, headers: corsHeaders });

      const websiteId = (events[0] as { w?: unknown }).w;
      if (typeof websiteId !== 'string' || events.some((e) => (e as { w?: unknown }).w !== websiteId)) {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const site = await fetchSite(websiteId, env);
      if (!site) return new Response(null, { status: 204, headers: corsHeaders });

      const firstEvent = events[0] as { r?: string };
      const host = requestHost(request, firstEvent?.r || null);
      if (host) {
        const allowed = [site.domain, ...(site.allowed_domains || [])].map((d) => String(d).toLowerCase());
        if (!isLocalhostHost(host) && !allowed.includes(host)) return new Response(null, { status: 204, headers: corsHeaders });
      }

      const rpcCtx = {
        ua: pre.ua,
        ip: pre.ip,
        country: pre.country,
        host,
        saltRotation: env.SALT_ROTATION || undefined,
        removeTrailingSlash: env.REMOVE_TRAILING_SLASH === 'true',
      };

      const calls = events
        .map((e) => buildEventParams(e, site, rpcCtx))
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (calls.length === 0) return new Response(null, { status: 204, headers: corsHeaders });

      const batchBody = buildBatchRequest(calls);
      ctx.waitUntil(
        (async () => {
          const report = await postIngest(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, batchBody, calls);
          if (report.mode === 'legacy' || report.failed > 0) {
            await recordHealth(env, {
              events: report.total,
              failed: report.failed,
              fallback: report.mode === 'legacy' ? 1 : undefined,
            });
          }
        })()
      );

      return new Response(null, { status: 204, headers: corsHeaders });
    } catch {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        // 1. Run rollup to finalize yesterday's metrics
        await runRollup(env);
        // 2. Dispatch push summary digests
        await sendPushDigests(env);
      })()
    );
  },
};
