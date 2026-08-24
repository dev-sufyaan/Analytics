import { getOpenApiYaml } from '@/lib/seo/openapi';

export const dynamic = 'force-static';

export async function GET() {
  const yaml = getOpenApiYaml();
  return new Response(yaml, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'Access-Control-Allow-Origin': '*',
      Vary: 'Accept, Accept-Encoding',
    },
  });
}
