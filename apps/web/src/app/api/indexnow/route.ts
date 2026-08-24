import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/seo-config';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'analytics-sufyaan-studio-indexnow';

export async function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON_BODY',
            message: 'The request body must be a valid JSON object with a "urlList" array.',
            hint: 'Send a JSON payload with {"urlList": ["https://analytics.sufyaanstudio.workers.dev/path"]}.',
            docs_url: `${SITE_CONFIG.baseUrl}/openapi.json`,
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    const urlList: string[] = body.urlList || [SITE_CONFIG.baseUrl];
    if (!Array.isArray(urlList) || urlList.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_URL_LIST',
            message: 'The "urlList" parameter must be a non-empty array of URL strings.',
            hint: 'Provide at least one full URL in urlList (e.g. ["https://..."]).',
            docs_url: `${SITE_CONFIG.baseUrl}/openapi.json`,
            status: 400,
          },
        },
        { status: 400 }
      );
    }

    const payload = {
      host: SITE_CONFIG.domain,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_CONFIG.baseUrl}/${INDEXNOW_KEY}.txt`,
      urlList,
    };

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      submittedUrlsCount: urlList.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INDEXNOW_SUBMISSION_FAILED',
          message: error.message || 'IndexNow submission failed due to upstream network issue.',
          hint: 'Retry submission or verify network reachability to api.indexnow.org.',
          docs_url: `${SITE_CONFIG.baseUrl}/openapi.json`,
          status: 500,
        },
      },
      { status: 500 }
    );
  }
}
