import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, CodeEditorMockup, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { INTEGRATIONS_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getHowToSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(INTEGRATIONS_DATA).map((platform) => ({ platform }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const data = INTEGRATIONS_DATA[platform];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: `How to Add Analytics to ${data.name} (Step-by-Step Guide)` },
    description: data.directAnswer,
    path: `/integrations/${data.slug}`,
    keywords: [`${data.name} analytics`, `how to add analytics to ${data.name}`, 'privacy-first analytics', 'cookie-free tracking'],
  });
}

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const data = INTEGRATIONS_DATA[platform];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Integrations', url: '/integrations' },
    { name: `${data.name} Integration`, url: `/integrations/${data.slug}` },
  ]);
  const howToSchema = getHowToSchema({
    name: `How to Add Privacy Analytics to ${data.name}`,
    description: data.directAnswer,
    steps: data.steps.map((s) => ({
      name: s.title,
      text: s.description,
      code: s.code,
    })),
  });
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      <SiteHeader forceLight={true} />

      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-12 md:py-16 flex-1">
        <Breadcrumbs
          items={[
            { name: 'Integrations', url: '/integrations' },
            { name: `${data.name} Setup`, url: `/integrations/${data.slug}` },
          ]}
        />

        {/* Hero Section */}
        <section className="my-8 max-w-4xl">
          <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium inline-block mb-3">
            {data.category.toUpperCase()} INTEGRATION GUIDE
          </span>
          <h1 className="font-display text-[36px] sm:text-[48px] font-medium tracking-[-1px] text-black mb-4">
            How to Install Analytics on {data.name}
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            {data.description}
          </p>
        </section>

        {/* Direct Answer for AEO/GEO */}
        <AnswerBlock
          title={`Quick Setup: ${data.name}`}
          directAnswer={data.directAnswer}
          keyTakeaways={[
            `1.15 KB featherlight tracker preserves ${data.name} speed`,
            'Zero cookie consent banners required',
            'Automatic SPA client route change detection',
            'Full support for custom conversion event tracking',
          ]}
          lastUpdated="August 2026"
        />

        {/* Prerequisites */}
        {data.prerequisites && data.prerequisites.length > 0 && (
          <div className="my-8 p-5 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
            <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2 font-medium">
              PREREQUISITES
            </span>
            <ul className="space-y-1.5 font-display text-[14px] text-black">
              {data.prerequisites.map((req, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step-by-Step Installation */}
        <section className="my-14 space-y-10 max-w-4xl">
          <div className="border-b border-[#ebebeb] pb-4">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              STEP-BY-STEP IMPLEMENTATION
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              Installation Instructions
            </h2>
          </div>

          {data.steps.map((step, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-[4px] bg-black text-white flex items-center justify-center font-mono text-[12px] font-medium shrink-0">
                  {idx + 1}
                </span>
                <h3 className="font-display text-[20px] font-medium text-black">
                  {step.title}
                </h3>
              </div>
              <p className="font-display text-[15px] text-[#71717a] leading-[24px]">
                {step.description}
              </p>

              {step.code && (
                <CodeEditorMockup
                  code={step.code}
                  title={`${data.name.toUpperCase()} SNIPPET (STEP ${idx + 1})`}
                />
              )}
            </div>
          ))}
        </section>

        {/* FAQ */}
        <FaqAccordion items={data.faq} title={`FAQ: ${data.name} Analytics Integration`} />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Ready to track {data.name} traffic with speed?
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Create your account in 30 seconds and start tracking for $0.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks currentSlug={data.slug} type="integration" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
