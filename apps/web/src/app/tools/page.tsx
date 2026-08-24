import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { TOOLS_DATA } from '@/lib/seo/tools-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, Wrench, Zap, Sparkles, Shield } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Free Web Analytics & SEO Developer Tools · Analytics',
  description: 'Free interactive developer tools: GA4 PageSpeed and bundle weight impact calculator, clean UTM URL campaign builder, and GDPR cookie banner exemption checker.',
  path: '/tools',
  keywords: [
    'GA4 calculator',
    'UTM builder',
    'GDPR compliance checker',
    'cookie banner exemption tool',
    'page speed impact calculator',
  ],
});

export default function ToolsHubPage() {
  const tools = Object.values(TOOLS_DATA);
  const itemListSchema = getItemListSchema(
    'Free Web Analytics & SEO Developer Tools',
    tools.map((t) => ({
      name: t.name,
      url: `/tools/${t.slug}`,
      description: t.subtitle,
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
        <Breadcrumbs items={[{ name: 'Tools', url: '/tools' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            FREE UTILITIES
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Free Developer & Growth Tools
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Interactive tools to calculate Google Analytics script bloat, generate clean UTM campaign URLs, and verify your website's cookie consent exemption.
          </p>
        </div>

        <AnswerBlock
          title="Free Interactive Suite"
          directAnswer="Our free developer utilities help you measure real-world performance trade-offs, format error-free marketing attribution tags, and perform compliance self-audits without registering an account or paying fees."
          keyTakeaways={[
            '100% Free with zero sign-up required',
            'Live interactive calculators and parameter builders',
            'Instant copy and shareable link output',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          {tools.map((t) => (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[2px] bg-[#ebebeb] text-black font-medium">
                    {t.category}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 font-medium">Interactive</span>
                </div>
                <h2 className="font-display text-[20px] font-medium text-black mb-2 group-hover:underline">
                  {t.name}
                </h2>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex items-center text-xs font-mono uppercase text-black font-medium group-hover:translate-x-1 transition-transform">
                <span>LAUNCH INTERACTIVE TOOL</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <RelatedLinks type="tool" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
