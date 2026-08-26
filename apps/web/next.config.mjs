/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@analytics/ui', '@analytics/db'],
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // PostHog reverse proxy — bypass ad-blockers by serving events through own domain.
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      // First-Party Analytics Tracker Aliases (Brave Shields & Adblocker evasion)
      {
        source: '/script.js',
        destination: '/t.js',
      },
      {
        source: '/analytics.js',
        destination: '/t.js',
      },
      {
        source: '/stats.js',
        destination: '/t.js',
      },
      {
        source: '/app.js',
        destination: '/t.js',
      },
      {
        source: '/telemetry.js',
        destination: '/t.js',
      },
      // Collect endpoint aliases (Umami / custom endpoints)
      {
        source: '/api/send',
        destination: '/c',
      },
      {
        source: '/collect',
        destination: '/c',
      },
      {
        source: '/event',
        destination: '/c',
      },
      {
        source: '/ping',
        destination: '/c',
      },
      // Official Android APK Direct Distribution (routed to analytics-collect edge worker / R2)
      {
        source: '/download/analytics-latest.apk',
        destination: 'https://analytics-collect.sufyaanstudio.workers.dev/download/analytics-latest.apk',
      },
      {
        source: '/analytics-latest.apk',
        destination: 'https://analytics-collect.sufyaanstudio.workers.dev/download/analytics-latest.apk',
      },
    ];
  },
};


export default nextConfig;

