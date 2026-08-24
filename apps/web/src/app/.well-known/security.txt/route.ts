import { SITE_CONFIG } from '@/lib/seo/seo-config';

export function GET() {
  const body = `Contact: mailto:security@sufyaan.studio
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: ${SITE_CONFIG.baseUrl}/.well-known/security.txt
Policy: ${SITE_CONFIG.baseUrl}/docs
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=604800',
    },
  });
}
