// apps/web/src/app/c/route.ts
// Collect endpoint (Vercel / Next.js route handler).
// NOTE: agent.md §2/§5/§11 forbids collect-through-Next.js and the service role
// in the web app. For a Vercel-only deploy this is the accepted, documented
// deviation (see deployment plan). Blast radius is limited: this handler only
// ever calls ingest_event / ingest_heartbeat with the service role.
//
// All validation lives in lib/ingest-guards.mjs — shared verbatim with the
// Cloudflare Worker and the test suite, so every path behaves identically.
import { NextResponse, after } from 'next/server';
import {
  preflight,
  extractEvents,
  buildEventParams,
  requestHost,
  LIMITS,
  CORS_HEADERS,
  getCorsHeaders,
  isLocalhostHost,
} from '../../../lib/ingest-guards.mjs';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

// Parity with the Worker: anything that is not POST /c is silently swallowed.
export async function GET(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

async function fetchSite(websiteId: string, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/websites?id=eq.${websiteId}&select=id,domain,allowed_domains`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const pre = preflight(request, {
    ignoreList: process.env.IGNORE_IP,
    envIgnore: process.env.IGNORE_IP,
  });
  if (!pre.ok) {
    return new NextResponse(null, { status: pre.status, headers: corsHeaders });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // Read body once; enforce cap on actual bytes (content-length can lie).
  const rawBody = await request.text();
  if (rawBody.length > LIMITS.MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const events = extractEvents(payload);
  if (events.length === 0) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // All events in a batch must target the same website id.
  const websiteId = events[0].w;
  if (typeof websiteId !== 'string' || events.some((e) => e.w !== websiteId)) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const site = await fetchSite(websiteId, supabaseUrl, serviceKey);
  if (!site) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const host = requestHost(request, events[0].r || null);
  if (host) {
    const allowed = [site.domain, ...(site.allowed_domains || [])].map((d) => String(d).toLowerCase());
    if (!isLocalhostHost(host) && !allowed.includes(host)) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
  }

  const rpcCtx = {
    ua: pre.ua,
    ip: pre.ip,
    country: pre.country,
    host,
    saltRotation: process.env.SALT_ROTATION || undefined,
    removeTrailingSlash: process.env.REMOVE_TRAILING_SLASH === 'true',
  };
  const calls = events
    .map((e) => buildEventParams(e, site, rpcCtx))
    .filter((c): c is NonNullable<ReturnType<typeof buildEventParams>> => c !== null);

  if (calls.length === 0) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // Ingest in the background (`after` keeps the work alive after the response
  // on Vercel) so beacons get an instant 204.
  after(async () => {
    await Promise.all(
      calls.map((c) =>
        fetch(`${supabaseUrl}/rest/v1/rpc/${c.rpc}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(c.payload),
        }).catch(() => {})
      )
    );
  });

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
