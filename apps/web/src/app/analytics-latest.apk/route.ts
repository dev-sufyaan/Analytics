import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Alias to /download/analytics-latest.apk — keep simple direct, no HTML redirect
  const url = new URL('/download/analytics-latest.apk', request.url);
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'Analytics-Alias' }, redirect: 'follow' });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: 'APK_NOT_FOUND', message: 'Alias fetch failed' }, { status: res.status || 404 });
  }
  const headers = new Headers();
  headers.set('Content-Type', res.headers.get('Content-Type') || 'application/vnd.android.package-archive');
  headers.set('Content-Disposition', res.headers.get('Content-Disposition') || 'attachment; filename="analytics-latest.apk"');
  const len = res.headers.get('Content-Length');
  if (len) headers.set('Content-Length', len);
  headers.set('Cache-Control', res.headers.get('Cache-Control') || 'public, max-age=86400, immutable');
  if (request.method === 'HEAD') return new NextResponse(null, { status: 200, headers });
  return new Response(res.body, { headers });
}

export async function HEAD(request: Request) {
  return GET(request);
}
