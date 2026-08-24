/**
 * Analytics by Sufyaan Studio — SEO Configuration & Master Entity Statement
 * Canonical source of truth for SEO, GEO & AEO metadata defaults.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://analytics.sufyaan.studio';

export const SITE_CONFIG = {
  name: 'Analytics by Sufyaan Studio',
  shortName: 'Analytics',
  domain: 'analytics.sufyaan.studio',
  baseUrl: BASE_URL,
  entityStatement:
    'Analytics by Sufyaan Studio is a best-in-class, privacy-first website analytics platform engineered for modern web developers, SaaS founders, and creators. Featuring a sub-1.5 KB featherlight tracker, instant edge ingestion on Cloudflare Workers, 100% cookie-free visitor identification via daily-salted hashes, real-time live traffic feeds, and complete data ownership on Supabase Postgres.',
  defaultTitle: 'Analytics by Sufyaan Studio — Privacy-First Website Analytics',
  titleTemplate: '%s · Analytics by Sufyaan Studio',
  defaultDescription:
    'Best-in-class privacy-first website analytics. No cookies. No consent banners needed. 1.15 KB lightweight tracker, instant edge ingestion, realtime visitor feeds, and full data ownership.',
  keywords: [
    'privacy-first analytics',
    'cookie-free website analytics',
    'cookie-less analytics',
    'GDPR compliant analytics',
    'Google Analytics alternative',
    'GA4 alternative',
    'Plausible alternative',
    'Fathom alternative',
    'Umami alternative',
    'Matomo alternative',
    'Simple Analytics alternative',
    'PostHog alternative',
    'lightweight website analytics',
    'edge analytics',
    'Cloudflare Workers analytics',
    'real-time website analytics',
    'Next.js analytics',
    'React website analytics',
    'WordPress privacy analytics',
    'OpenAPI analytics spec',
    'MCP analytics server',
    'Sufyaan Studio',
  ],
  socialHandles: {
    twitter: 'https://twitter.com/sufyaanstudio',
    github: 'https://github.com/dev-sufyaan',
    linkedin: 'https://www.linkedin.com/company/sufyaanstudio',
  },
  logoUrl: `${BASE_URL}/logo.png`,
  iconUrl: `${BASE_URL}/icon.png`,
  appleIconUrl: `${BASE_URL}/apple-touch-icon.png`,
  trackerSnippetUrl: `${BASE_URL}/t.js`,
  ingestEndpoint: `${BASE_URL}/c`,
  openApiUrl: `${BASE_URL}/openapi.json`,
  mcpUrl: `${BASE_URL}/mcp.json`,
} as const;
