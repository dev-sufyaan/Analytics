/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aether/ui', '@aether/db'],
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
};

export default nextConfig;
