import { NextRequest } from 'next/server';
import { getMarkdownForRoute } from '@/lib/seo/markdown-mirror';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params;
  const content = getMarkdownForRoute(slug || []);

  if (!content) {
    return new Response('# 404 Not Found\n\nThe requested markdown resource was not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  });
}
