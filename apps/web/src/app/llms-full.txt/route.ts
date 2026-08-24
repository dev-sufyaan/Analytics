import { generateLlmsFullTxt } from '@/lib/seo/llms';

export function GET() {
  const content = generateLlmsFullTxt();
  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  });
}
