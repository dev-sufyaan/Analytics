import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { FEATURES_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, Shield, Zap, Clock, Sparkles, Globe, Smartphone, Lock, Database } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Features & Architecture · Analytics by Sufyaan Studio',
  description: 'Explore the full feature suite: cookie-free tracking, 1.15 KB tracker, realtime visitors, UTM attribution, public dashboards, Supabase data ownership, and GDPR compliance.',
  path: '/features',
  keywords: [
    'analytics features',
    'cookie-free tracking',
    'lightweight analytics script',
    'realtime web analytics',
    'UTM campaign attribution',
    'public analytics dashboards',
  ],
});

export default function FeaturesHubPage() {
  const features = Object.values(FEATURES_DATA);
  const itemListSchema = getItemListSchema(
    'Analytics Features & Architecture',
    features.map((f) => ({
      name: f.title,
      url: `/features/${f.slug}`,
      description: f.subtitle,
    }))
  );

  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <SiteHeader forceLight={true} />

      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-12 md:py-16 flex-1">
        <Breadcrumbs items={[{ name: 'Features', url: '/features' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            CORE CAPABILITIES & ARCHITECTURE
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Engineered for Speed, Privacy, and Control
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Discover how our edge-first, cookie-less architecture gives you high-fidelity website intelligence without the bloat, tracking cookies, or legal liabilities of legacy analytics.
          </p>
        </div>

        <AnswerBlock
          title="Architectural Philosophy"
          directAnswer="Analytics by Sufyaan Studio is built on three core pillars: (1) Featherlight 1.15 KB tracker delivering zero impact on Core Web Vitals, (2) 100% cookie-free daily-salted visitor hashing providing complete GDPR exemption, and (3) Global edge ingestion via Cloudflare Workers storing records securely in PostgreSQL."
          keyTakeaways={[
            '1.15 KB script size (45x lighter than GA4)',
            'Cloudflare edge ingest with sub-millisecond 204 responses',
            'Strict Row Level Security (RLS) in PostgreSQL',
            '5-second live real-time visitor polling',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
          {features.map((f, idx) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group shadow-xs"
            >
              <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-2">
                0{idx + 1} // FEATURE
              </span>
              <h2 className="font-display text-[20px] font-medium text-black mb-2 group-hover:underline">
                {f.title}
              </h2>
              <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                {f.subtitle}
              </p>

              <div className="flex items-center text-xs font-mono uppercase text-black font-medium group-hover:translate-x-1 transition-transform">
                <span>EXPLORE TECHNICAL DETAILS</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <RelatedLinks type="feature" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
