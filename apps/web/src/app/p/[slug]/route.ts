// apps/web/src/app/p/[slug]/route.ts
// 1x1 Transparent GIF Tracking Pixel (Umami Parity).
// Ingests a pageview event for no-JS environments and returns a 1x1 transparent GIF.
import { NextResponse, after } from 'next/server';
import {
  preflight,
  buildEventParams,
  buildBatchRequest,
  postIngest,
  requestHost,
  getCorsHeaders,
  UUID_RE,
} from '../../../../lib/ingest-guards.mjs';

const GIF_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const corsHeaders = getCorsHeaders(request);
  const websiteId = slug?.trim();

  if (websiteId && UUID_RE.test(websiteId)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const url = new URL(request.url);
      const pre = preflight(request, {
        ignoreList: process.env.IGNORE_IP,
        envIgnore: process.env.IGNORE_IP,
      });

      after(async () => {
        try {
          if (!pre.ok) return;
          const site = await fetchSite(websiteId, supabaseUrl, serviceKey);
          if (!site) return;

          const rpcCtx = {
            ua: request.headers.get('user-agent') || '',
            ip: pre.ip || '127.0.0.1',
            country: pre.country,
            host: requestHost(request, null),
            saltRotation: process.env.SALT_ROTATION || undefined,
            removeTrailingSlash: process.env.REMOVE_TRAILING_SLASH === 'true',
          };

          const rawEv = {
            w: websiteId,
            n: 'pageview',
            u: url.searchParams.get('u') || '/',
            r: request.headers.get('referer') || null,
          };

          const call = buildEventParams(rawEv, site, rpcCtx);
          if (call) {
            const batch = buildBatchRequest([call]);
            await postIngest(supabaseUrl, serviceKey, batch, [call]);
          }
        } catch {}
      });
    }
  }

  return new NextResponse(GIF_1X1, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': GIF_1X1.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*',
      Vary: 'Origin',
    },
  });
}
