import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/seo/openapi';

export const dynamic = 'force-static';

export async function GET() {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'Access-Control-Allow-Origin': '*',
      Vary: 'Accept, Accept-Encoding',
    },
  });
}
