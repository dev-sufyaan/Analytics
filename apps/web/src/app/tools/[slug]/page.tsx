import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { TOOLS_DATA } from '@/lib/seo/tools-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { Ga4CalculatorClient, UtmBuilderClient, GdprCheckerClient } from './ToolInteractiveClient';
import { CheckCircle2, Wrench } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(TOOLS_DATA).map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = TOOLS_DATA[slug];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: `${data.name} (Free Tool) · Analytics` },
    description: data.metaDescription,
    path: `/tools/${data.slug}`,
    keywords: [data.name, 'free developer tool', 'analytics utility', 'web performance calculator'],
  });
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = TOOLS_DATA[slug];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Tools', url: '/tools' },
    { name: data.name, url: `/tools/${data.slug}` },
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
            { name: 'Tools', url: '/tools' },
            { name: data.name, url: `/tools/${data.slug}` },
          ]}
        />

        {/* Hero */}
        <section className="my-8 max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium">
              FREE DEVELOPER TOOL
            </span>
            <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-emerald-100 text-emerald-800 font-medium">
              NO SIGNUP NEEDED
            </span>
          </div>
          <h1 className="font-display text-[36px] sm:text-[46px] font-medium tracking-[-1px] text-black mb-4">
            {data.title}
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            {data.subtitle}
          </p>
        </section>

        {/* Direct Answer */}
        <AnswerBlock
          title={`Tool Summary: ${data.name}`}
          directAnswer={data.directAnswer}
          keyTakeaways={data.features}
          lastUpdated="August 2026"
        />

        {/* Interactive Tool Area */}
        <section className="my-10">
          {data.slug === 'ga4-speed-calculator' && <Ga4CalculatorClient />}
          {data.slug === 'utm-campaign-builder' && <UtmBuilderClient />}
          {data.slug === 'gdpr-cookie-exemption-checker' && <GdprCheckerClient />}
        </section>

        {/* Deep Dive Description */}
        <section className="my-14 max-w-4xl">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              TOOL CAPABILITIES
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              Why We Built This Utility
            </h2>
          </div>
          <p className="font-display text-[16px] leading-[26px] text-[#71717a] mb-8">
            {data.description}
          </p>

          <div className="space-y-4">
            <h3 className="font-display text-[20px] font-medium text-black">
              Key Features
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-display text-[14px] text-black">
              {data.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-3 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <FaqAccordion items={data.faq} title={`FAQ: ${data.name}`} />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Ready to upgrade your website analytics?
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Get instant setup, sub-1.5 KB script, and 25,000 monthly events free forever.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks currentSlug={data.slug} type="tool" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
