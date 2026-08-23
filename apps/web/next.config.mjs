/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@analytics/ui', '@analytics/db'],
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
};

export default nextConfig;
