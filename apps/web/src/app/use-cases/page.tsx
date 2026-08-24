import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { USE_CASES_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, Users, Rocket, Newspaper, Briefcase, ShoppingBag } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Analytics Solutions by Use-Case & Persona · Analytics',
  description: 'Discover how Analytics by Sufyaan Studio powers indie hackers, SaaS founders, content creators, web development agencies, and e-commerce stores.',
  path: '/use-cases',
  keywords: [
    'analytics for indie hackers',
    'SaaS analytics',
    'agency client analytics',
    'blog analytics',
    'e-commerce analytics',
  ],
});

export default function UseCasesHubPage() {
  const useCases = Object.values(USE_CASES_DATA);
  const itemListSchema = getItemListSchema(
    'Analytics Solutions by Persona & Use Case',
    useCases.map((u) => ({
      name: u.title,
      url: `/use-cases/${u.slug}`,
      description: u.subtitle,
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
        <Breadcrumbs items={[{ name: 'Use Cases', url: '/use-cases' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            TAILORED SOLUTIONS
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Analytics Tailored to Your Growth
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Whether you are shipping solo MVPs, scaling a high-growth SaaS, publishing content, or delivering client websites, Analytics provides the ideal balance of speed, privacy, and actionable insight.
          </p>
        </div>

        <AnswerBlock
          title="Solution Overview"
          directAnswer="Analytics by Sufyaan Studio is designed to meet the specific requirements of modern digital creators: $0 cost for indie projects, conversion funnel attribution for SaaS, Core Web Vitals speed for blogs, multi-client management for agencies, and checkout speed for e-commerce."
          keyTakeaways={[
            'Indie Hackers: Free forever community plan for side projects',
            'SaaS Founders: Custom conversion tracking and UTM attribution',
            'Agencies: Tokenized public share links for effortless client reporting',
            'Publishers: 1.15 KB tracker guarantees 100% PageSpeed scores',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
          {useCases.map((u) => (
            <Link
              key={u.slug}
              href={`/use-cases/${u.slug}`}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group shadow-xs"
            >
              <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-2">
                FOR {u.persona.toUpperCase()}
              </span>
              <h2 className="font-display text-[20px] font-medium text-black mb-2 group-hover:underline">
                {u.title}
              </h2>
              <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                {u.subtitle}
              </p>

              <div className="flex items-center text-xs font-mono uppercase text-black font-medium group-hover:translate-x-1 transition-transform">
                <span>VIEW USE CASE GUIDE</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <RelatedLinks type="use-case" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
