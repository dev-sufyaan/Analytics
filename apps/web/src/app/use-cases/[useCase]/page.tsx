import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { USE_CASES_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { CheckCircle2, ArrowRight, Quote } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(USE_CASES_DATA).map((useCase) => ({ useCase }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ useCase: string }> }) {
  const { useCase } = await params;
  const data = USE_CASES_DATA[useCase];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: `${data.title} · Analytics Solutions` },
    description: data.directAnswer,
    path: `/use-cases/${data.slug}`,
    keywords: [data.title, 'analytics use cases', 'privacy-first analytics', 'cookie-free tracking'],
  });
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ useCase: string }>;
}) {
  const { useCase } = await params;
  const data = USE_CASES_DATA[useCase];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Use Cases', url: '/use-cases' },
    { name: data.title, url: `/use-cases/${data.slug}` },
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
            { name: 'Use Cases', url: '/use-cases' },
            { name: data.title, url: `/use-cases/${data.slug}` },
          ]}
        />

        {/* Hero */}
        <section className="my-8 max-w-4xl">
          <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium inline-block mb-3">
            TAILORED FOR {data.persona.toUpperCase()}
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
          title={`Summary for ${data.persona}`}
          directAnswer={data.directAnswer}
          keyTakeaways={data.keyBenefits.map((b) => `${b.title}: ${b.description}`)}
          lastUpdated="August 2026"
        />

        {/* Persona Key Benefits */}
        <section className="my-14 max-w-4xl">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              SPECIFIC ADVANTAGES
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              Why {data.persona} Choose Analytics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {data.keyBenefits.map((benefit, idx) => (
              <div key={idx} className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] shadow-xs">
                <h3 className="font-display text-[18px] font-medium text-black mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{benefit.title}</span>
                </h3>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Workflow Box */}
        <section className="my-14 p-6 sm:p-8 bg-[#010120] text-white rounded-[4px] border border-[#26263a]">
          <span className="font-mono text-[11px] uppercase tracking-[0.055em] text-[#bdbbff] block mb-2">
            RECOMMENDED WORKFLOW
          </span>
          <h3 className="font-display text-[22px] sm:text-[26px] font-medium text-white mb-3">
            Quick Implementation Plan
          </h3>
          <p className="font-display text-[15px] sm:text-[16px] text-zinc-300 leading-[24px]">
            {data.recommendedSetup}
          </p>
        </section>

        {/* Testimonial Quote */}
        {data.testimonialOrQuote && (
          <section className="my-14 p-6 sm:p-8 bg-[#fafafa] border-l-4 border-black rounded-r-[4px]">
            <Quote className="w-6 h-6 text-[#999999] mb-3" />
            <p className="font-display text-[17px] sm:text-[19px] italic text-black mb-4">
              "{data.testimonialOrQuote.quote}"
            </p>
            <span className="font-mono text-[11px] uppercase text-[#71717a] font-medium">
              — {data.testimonialOrQuote.role}
            </span>
          </section>
        )}

        {/* FAQ */}
        <FaqAccordion items={data.faq} title={`FAQ for ${data.persona}`} />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Get started with {data.title}
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Join thousands of developers tracking traffic with speed and privacy.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FOR FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks currentSlug={data.slug} type="use-case" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
