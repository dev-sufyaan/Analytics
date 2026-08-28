import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple direct download — streams APK directly from R2 (same worker).
// No cross-worker proxy, no 302 to HTML. If R2 miss, returns 404 JSON (not HTML).
export async function GET(request: Request) {
  // Try direct R2 binding first (web worker now has RELEASES_BUCKET via wrangler.jsonc)
  const r2 = (globalThis as unknown as { RELEASES_BUCKET?: unknown }).RELEASES_BUCKET as unknown as
    | { get: (k: string) => Promise<unknown> }
    | undefined;

  // Fallback: if binding not available in this context (local dev), proxy to collect worker
  const COLLECT_FALLBACK = 'https://analytics-collect.sufyaanstudio.workers.dev/download/analytics-latest.apk';

  try {
    if (r2) {
      const obj = (await (r2 as unknown as { get: (k: string) => Promise<{ body: ReadableStream; size?: number } | null> }).get(
        'analytics-latest.apk'
      )) as { body: ReadableStream; size?: number } | null;
      if (obj) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.android.package-archive');
        headers.set('Content-Disposition', 'attachment; filename="analytics-latest.apk"');
        if (obj.size) headers.set('Content-Length', String(obj.size));
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=86400, immutable');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        if (request.method === 'HEAD') return new NextResponse(null, { status: 200, headers });
        return new Response(obj.body as unknown as ReadableStream, { headers });
      }
    }

    // No R2 hit — try collect worker as fallback (covers local dev where web has no R2)
    const res = await fetch(COLLECT_FALLBACK, { headers: { 'User-Agent': 'Analytics-Web-Direct' }, redirect: 'follow' });
    if (res.ok && res.body) {
      const headers = new Headers();
      headers.set('Content-Type', res.headers.get('Content-Type') || 'application/vnd.android.package-archive');
      headers.set('Content-Disposition', res.headers.get('Content-Disposition') || 'attachment; filename="analytics-latest.apk"');
      const len = res.headers.get('Content-Length');
      if (len) headers.set('Content-Length', len);
      headers.set('Accept-Ranges', res.headers.get('Accept-Ranges') || 'bytes');
      headers.set('Cache-Control', res.headers.get('Cache-Control') || 'public, max-age=86400, immutable');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      if (request.method === 'HEAD') return new NextResponse(null, { status: 200, headers });
      return new Response(res.body, { headers });
    }

    // Genuine missing asset — explicit 404 JSON, never HTML redirect (fixes 80KB bug)
    return NextResponse.json(
      {
        error: 'APK_NOT_FOUND',
        message: 'analytics-latest.apk not found in R2 analytics-releases bucket. Upload via: wrangler r2 object put analytics-releases/analytics-latest.apk --file=./analytics-latest.apk',
      },
      { status: 404, headers: { 'Cache-Control': 'no-cache, no-store' } }
    );
  } catch (err) {
    console.error('[APK Direct Error]', err);
    return NextResponse.json({ error: 'APK_FETCH_FAILED', message: String(err) }, { status: 502 });
  }
}

export async function HEAD(request: Request) {
  return GET(request);
}
