import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, CodeEditorMockup, StatsCardPlain, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { FEATURES_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(FEATURES_DATA).map((feature) => ({ feature }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const data = FEATURES_DATA[feature];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: `${data.title} · Analytics Features` },
    description: data.directAnswer,
    path: `/features/${data.slug}`,
    keywords: [data.title, 'analytics features', 'privacy-first analytics', 'cookie-free tracking'],
  });
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  const data = FEATURES_DATA[feature];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Features', url: '/features' },
    { name: data.title, url: `/features/${data.slug}` },
  ]);
  const appSchema = getSoftwareApplicationSchema();

  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      <SiteHeader forceLight={true} />

      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-12 md:py-16 flex-1">
        <Breadcrumbs
          items={[
            { name: 'Features', url: '/features' },
            { name: data.title, url: `/features/${data.slug}` },
          ]}
        />

        {/* Hero Section */}
        <section className="my-8 max-w-4xl">
          <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium inline-block mb-3">
            TECHNICAL FEATURE BRIEF
          </span>
          <h1 className="font-display text-[36px] sm:text-[48px] font-medium tracking-[-1px] text-black mb-4">
            {data.title}
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            {data.subtitle}
          </p>
        </section>

        {/* Direct Answer for AEO/GEO */}
        <AnswerBlock
          title={`Summary: ${data.title}`}
          directAnswer={data.directAnswer}
          keyTakeaways={data.benefits.slice(0, 4)}
          lastUpdated="August 2026"
        />

        {/* Metrics Grid */}
        {data.metrics && data.metrics.length > 0 && (
          <section className="my-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.metrics.map((metric, idx) => (
                <div key={idx} className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">
                    {metric.label}
                  </span>
                  <div className="font-display text-[32px] font-medium text-black tracking-tight mb-1">
                    {metric.value}
                  </div>
                  <div className="font-display text-[13px] text-[#71717a]">
                    {metric.detail}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Deep Dive Description */}
        <section className="my-14 max-w-4xl">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              IN-DEPTH ARCHITECTURE
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              How It Works Under the Hood
            </h2>
          </div>
          <p className="font-display text-[16px] leading-[26px] text-zinc-800 mb-8">
            {data.description}
          </p>

          <div className="space-y-4">
            <h3 className="font-display text-[20px] font-medium text-black">
              Key Capabilities & Benefits
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-display text-[14px] text-black">
              {data.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Code Example if present */}
        {data.codeExample && (
          <section className="my-14 max-w-4xl">
            <div className="mb-4">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
                CODE IMPLEMENTATION
              </span>
              <h3 className="font-display text-[22px] font-medium text-black">
                {data.codeExample.caption}
              </h3>
            </div>
            <CodeEditorMockup code={data.codeExample.code} title="IMPLEMENTATION SNIPPET" />
          </section>
        )}

        {/* FAQ */}
        <FaqAccordion items={data.faq} title={`FAQ: ${data.title}`} />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Experience high-performance privacy analytics today.
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Sign up in 30 seconds. Up to 25,000 events free forever.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks currentSlug={data.slug} type="feature" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
