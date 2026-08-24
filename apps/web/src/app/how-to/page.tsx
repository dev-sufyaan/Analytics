import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { HOW_TO_GUIDES } from '@/lib/seo/how-to-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Developer How-To Guides & Tutorials · Analytics',
  description: 'In-depth developer tutorials on tracking single-page applications, custom conversion goals, UTM campaign parameters, server-side APIs, and GDPR compliance.',
  path: '/how-to',
  keywords: [
    'analytics how to',
    'how to track events',
    'Next.js analytics tutorial',
    'UTM tracking guide',
    'server-side analytics tutorial',
  ],
});

export default function HowToHubPage() {
  const guides = Object.values(HOW_TO_GUIDES);
  const itemListSchema = getItemListSchema(
    'Developer How-To Guides & Tutorials',
    guides.map((g) => ({
      name: g.title,
      url: `/how-to/${g.slug}`,
      description: g.description,
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
        <Breadcrumbs items={[{ name: 'How-To Guides', url: '/how-to' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            STEP-BY-STEP TUTORIALS
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Developer Guides & Recipes
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Actionable, copy-paste tutorials covering SPA tracking, custom conversion events, marketing campaign attribution, and server-side event ingestion.
          </p>
        </div>

        <AnswerBlock
          title="Developer Knowledge Base"
          directAnswer="Our how-to tutorials are authored by the Sufyaan Studio engineering team to give you exact, copy-paste code patterns for integrating cookie-free analytics into Next.js, React, Node.js, Python, and modern web environments without third-party dependencies."
          keyTakeaways={[
            'Verified copy-paste snippets for frontend and backend',
            'Full coverage of UTM parameters and click IDs',
            'Legal and technical blueprints for cookie banner removal',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/how-to/${g.slug}`}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] text-[#71717a] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{g.readTime}</span>
                </span>
                <span className="font-mono text-[10px] uppercase bg-black text-white px-2 py-0.5 rounded-[2px]">
                  TUTORIAL
                </span>
              </div>
              <h2 className="font-display text-[22px] font-medium text-black mb-2 group-hover:underline">
                {g.title}
              </h2>
              <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                {g.description}
              </p>

              <div className="flex items-center text-xs font-mono uppercase text-black font-medium group-hover:translate-x-1 transition-transform">
                <span>READ COMPLETE GUIDE</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <RelatedLinks type="how-to" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
