import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/seo-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c', '/api/internal'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
      {
        userAgent: 'Bytespider',
        allow: '/',
        disallow: ['/app', '/login', '/auth', '/s/', '/c'],
      },
    ],
    sitemap: `${SITE_CONFIG.baseUrl}/sitemap.xml`,
    host: SITE_CONFIG.baseUrl,
  };
}
