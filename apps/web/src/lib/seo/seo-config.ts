/**
 * Analytics by Sufyaan Studio — SEO Configuration & Master Entity Statement
 * Canonical source of truth for SEO, GEO & AEO metadata defaults.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://analytics.sufyaanstudio.workers.dev';

export const SITE_CONFIG = {
  name: 'Analytics',
  fullName: 'Analytics by Sufyaan Studio',
  shortName: 'Analytics',
  alternateNames: ['Analytics by Sufyaan Studio', 'Analytics Studio', 'Analytics App'],
  domain: 'analytics.sufyaanstudio.workers.dev',
  baseUrl: BASE_URL,
  entityStatement:
    'Analytics by Sufyaan Studio is a best-in-class, privacy-first website analytics platform engineered for modern web developers, SaaS founders, and creators. Featuring a sub-1.5 KB featherlight tracker, instant edge ingestion on Cloudflare Workers, 100% cookie-free visitor identification via daily-salted hashes, real-time live traffic feeds, and complete data ownership on Supabase Postgres.',
  defaultTitle: 'Analytics — Privacy-First Website Analytics',
  titleTemplate: '%s · Analytics',
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
    'android analytics app',
    'privacy analytics apk',
    'native android website analytics',
    'download analytics apk',
    'cookie-free android app',
    'mobile analytics dashboard',
    'real-time mobile analytics',
    'Sufyaan Studio',
  ],
  socialHandles: {
    twitter: 'https://twitter.com/sufyaanstudio',
    github: 'https://github.com/dev-sufyaan',
    linkedin: 'https://www.linkedin.com/company/sufyaanstudio',
  },
  androidApp: {
    version: '2.1.0',
    versionCode: 5,
    minAndroidVersion: 'Android 10 (API level 29)',
    fileSize: '76.0 MB',
    fileSizeBytes: 79653307,
    sha256: 'aef10c9f8be64ffb54df526f0e4e45350a9f504fcb4d2a511a36dfde58ada839',
    // Direct GitHub Release — reliable on both desktop & mobile (no Worker streaming).
    // Route /download/analytics-latest.apk kept for backward compat (in-app updater fallback).
    githubReleaseUrl: 'https://github.com/dev-sufyaan/Analytics/releases/download/v2.1.0/Analytics-v2.0.0.apk',
    downloadPath: 'https://github.com/dev-sufyaan/Analytics/releases/download/v2.1.0/Analytics-v2.0.0.apk',
    directApkPath: 'https://github.com/dev-sufyaan/Analytics/releases/download/v2.1.0/Analytics-v2.0.0.apk',
    absoluteDownloadUrl: 'https://github.com/dev-sufyaan/Analytics/releases/download/v2.1.0/Analytics-v2.0.0.apk',
    downloadPageUrl: `${BASE_URL}/download`,
    releaseDate: '2026-08-28',
  },

  logoUrl: `${BASE_URL}/logo.png`,
  iconUrl: `${BASE_URL}/icon.png`,
  appleIconUrl: `${BASE_URL}/apple-touch-icon.png`,
  trackerSnippetUrl: `${BASE_URL}/t.js`,
  ingestEndpoint: `${BASE_URL}/c`,
  openApiUrl: `${BASE_URL}/openapi.json`,
  mcpUrl: `${BASE_URL}/mcp.json`,
} as const;

