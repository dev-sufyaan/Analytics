import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { COMPETITORS_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Top Google Analytics Alternatives & Competitor Comparisons (2026)',
  description: 'Explore honest, detailed comparisons between Analytics by Sufyaan Studio and Google Analytics 4, Plausible, Fathom, Umami, Matomo, PostHog, Simple Analytics, and Cloudflare.',
  path: '/alternatives',
  keywords: [
    'Google Analytics alternatives',
    'privacy analytics comparisons',
    'Plausible alternative',
    'Fathom alternative',
    'Umami alternative',
    'Matomo alternative',
    'best web analytics 2026',
  ],
});

export default function AlternativesHubPage() {
  const competitors = Object.values(COMPETITORS_DATA);
  const itemListSchema = getItemListSchema(
    'Top Web Analytics Competitor Alternatives',
    competitors.map((c) => ({
      name: `Analytics vs ${c.name}`,
      url: `/alternatives/${c.slug}`,
      description: c.directVerdict,
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
        <Breadcrumbs items={[{ name: 'Alternatives', url: '/alternatives' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            2026 BUYER GUIDES & BENCHMARKS
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Web Analytics Alternatives & Comparisons
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Honest, technically accurate side-by-side comparisons to help you choose the right privacy-first analytics platform for your website, web application, or agency.
          </p>
        </div>

        <AnswerBlock
          title="Direct Summary / Verdict"
          directAnswer="Analytics by Sufyaan Studio is designed as the ultimate modern alternative to bloated, ad-driven tracking tools like GA4 and costly subscription tools. With a 1.15 KB tracker (45x lighter than GA4), 100% cookie-free visitor hashing, and native Supabase PostgreSQL ownership, you get faster page speeds and zero GDPR banner headaches."
          keyTakeaways={[
            '100% Cookie-free and GDPR compliant out of the box',
            'Sub-1.5 KB tracking script (45x lighter than GA4)',
            'Generous Community Free Tier (25,000 monthly events at $0)',
            'Instant 5-second live real-time traffic feed',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
          {competitors.map((c) => (
            <div
              key={c.slug}
              className="border border-[#ebebeb] rounded-[4px] p-6 bg-white hover:border-black transition-colors flex flex-col justify-between group shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[2px] bg-[#f2f2f2] text-[#71717a] font-medium">
                    2026 COMPARISON
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 font-medium">100% Honest</span>
                </div>
                <h2 className="font-display text-[22px] font-medium text-black mb-2 group-hover:underline">
                  Analytics vs {c.name}
                </h2>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                  {c.tagline}
                </p>

                <div className="space-y-2 mb-6 pt-4 border-t border-[#ebebeb]">
                  {c.whySwitchReasons.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 font-display text-[13px] text-black">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{r.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/alternatives/${c.slug}`}
                className="w-full h-10 rounded-[3px] bg-[#010120] text-white hover:bg-black font-mono text-[12px] uppercase font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <span>COMPARE FULL SPECS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <RelatedLinks type="competitor" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
