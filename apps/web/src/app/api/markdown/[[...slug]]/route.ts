import { NextRequest } from 'next/server';
import { getMarkdownForRoute, get404Markdown } from '@/lib/seo/markdown-mirror';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params;
  const slugs = slug || [];
  const content = getMarkdownForRoute(slugs);

  if (!content) {
    return new Response(get404Markdown(slugs.join('/')), {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Vary': 'Accept, Accept-Encoding',
      },
    });
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'Vary': 'Accept, Accept-Encoding',
    },
  });
}
