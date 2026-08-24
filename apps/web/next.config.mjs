/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@analytics/ui', '@analytics/db'],
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // PostHog reverse proxy — bypass ad-blockers by serving events through own domain.
  // See: https://posthog.com/docs/advanced/proxy/nextjs
  // Order matters: static/array before catch-all. Requires skipTrailingSlashRedirect.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
