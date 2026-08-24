import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/seo-config';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'analytics-sufyaan-studio-indexnow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urlList: string[] = body.urlList || [SITE_CONFIG.baseUrl];

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
    return NextResponse.json({ error: error.message || 'IndexNow submission failed' }, { status: 500 });
  }
}
