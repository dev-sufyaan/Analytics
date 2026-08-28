import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@analytics/db/middleware';
import { getMarkdownForRoute, get404Markdown } from '@/lib/seo/markdown-mirror';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const acceptHeader = request.headers.get('accept') || '';
  const isMarkdownRequested =
    acceptHeader.includes('text/markdown') ||
    acceptHeader.includes('text/x-markdown');

  // 1. Markdown Content Negotiation (acceptmarkdown.com standard)
  // Intercept when client requests text/markdown for non-static, non-api routes
  if (
    isMarkdownRequested &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/app') &&
    !pathname.endsWith('.json') &&
    !pathname.endsWith('.yaml') &&
    !pathname.endsWith('.txt') &&
    !pathname.endsWith('.xml')
  ) {
    const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');
    const slugs = cleanPath ? cleanPath.split('/') : [];
    const markdownContent = getMarkdownForRoute(slugs);

    if (markdownContent) {
      return new NextResponse(markdownContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          'Vary': 'Accept, Accept-Encoding',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Return agent-friendly 404 markdown recovery document
    return new NextResponse(get404Markdown(pathname), {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Vary': 'Accept, Accept-Encoding',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 2. Structured JSON Error Responses for unknown /api/* endpoints
  if (pathname.startsWith('/api/')) {
    const knownApiPrefixes = [
      '/api/indexnow',
      '/api/markdown',
      '/api/openapi.json',
      '/api/openapi.yaml',
      '/api/mcp',
      '/api/send',
    ];
    const isKnownApi = knownApiPrefixes.some((prefix) => pathname.startsWith(prefix));

    if (!isKnownApi) {
      return NextResponse.json(
        {
          error: {
            code: 'API_ENDPOINT_NOT_FOUND',
            message: `The API endpoint '${pathname}' does not exist on this server.`,
            hint: 'Refer to the OpenAPI 3.1.0 specification at /openapi.json or /api/openapi.json for all valid endpoints.',
            docs_url: 'https://analytics.sufyaanstudio.workers.dev/openapi.json',
            status: 404,
          },
        },
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store',
            'Vary': 'Accept, Accept-Encoding',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  // 3. Normal Authentication & Routing Session Handling
  const response = await updateSession(request);

  // Set Vary: Accept, Accept-Encoding on all responses so CDNs properly partition cache
  if (response && response.headers) {
    response.headers.set('Vary', 'Accept, Accept-Encoding');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - t.js (tracker script)
     * - c (collect endpoint)
     * - ingest (PostHog proxy → us.i.posthog.com)
     * - download/*.apk and analytics-latest.apk (direct static APK — skip auth/middleware)
     * NOTE: PostHog proxy must be excluded or matcher will intercept /ingest/e
     * and break ingestion (see https://posthog.com/docs/advanced/proxy/nextjs)
     */
    '/((?!_next/static|_next/image|favicon.ico|t.js|c|ingest|download/.*\\.apk|analytics-latest\\.apk|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk)$).*)',
  ],
};
