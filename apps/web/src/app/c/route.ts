// apps/web/src/app/c/route.ts
// Collect endpoint for local dev / direct edge ingest fallback
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

// Tiny UA parser (<1 KB)
function parseUA(ua: string) {
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'Chrome OS';

  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  return { browser, os, device };
}

// SHA-256 visitor hash
function generateVisitorHash(websiteId: string, ip: string, ua: string, dateStr: string): string {
  const msg = `${websiteId}:${ip}:${ua}:${dateStr}`;
  return crypto.createHash('sha256').update(msg).digest('hex');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const websiteId = payload.w;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!websiteId || !uuidPattern.test(websiteId)) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const ua = request.headers.get('user-agent') || '';
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    const country =
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-vercel-ip-country') ||
      'US';

    const utcDate = new Date().toISOString().slice(0, 10);
    const visitorHash = generateVisitorHash(websiteId, ip, ua, utcDate);
    const parsedUA = parseUA(ua);

    // Safe referrer extraction
    let referrerDomain: string | null = null;
    if (payload.r && typeof payload.r === 'string') {
      try {
        const refUrl = new URL(payload.r);
        referrerDomain = refUrl.hostname || null;
      } catch (_) {
        referrerDomain = null;
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    if (typeof payload.d === 'number' && (payload.n === 'heartbeat' || !payload.n)) {
      await fetch(`${supabaseUrl}/rest/v1/rpc/ingest_heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          p_website_id: websiteId,
          p_visitor_hash: visitorHash,
          p_delta_seconds: Math.min(Math.max(payload.d, 0), 120),
        }),
      }).catch(() => {});
    } else {
      const eventName = payload.n === 'pageview' || !payload.n ? null : payload.n;
      await fetch(`${supabaseUrl}/rest/v1/rpc/ingest_event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          p_website_id: websiteId,
          p_visitor_hash: visitorHash,
          p_hostname: payload.h || 'localhost',
          p_browser: parsedUA.browser,
          p_os: parsedUA.os,
          p_device: parsedUA.device,
          p_screen: payload.s || null,
          p_language: payload.l || null,
          p_country: country,
          p_url_path: payload.u || '/',
          p_url_query: payload.q || null,
          p_title: payload.t || null,
          p_referrer_domain: referrerDomain,
          p_event_name: eventName,
          p_event_data: payload.p || null,
        }),
      }).catch((err) => {
        console.error('Error invoking ingest_event:', err);
      });
    }

    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Error processing collect request:', err);
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }
}
