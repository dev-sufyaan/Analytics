import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, CodeEditorMockup, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { ComparisonMatrix } from '@/components/seo/ComparisonMatrix';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { COMPETITORS_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { CheckCircle2, ArrowRight, Zap, Shield, Sparkles, XCircle } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(COMPETITORS_DATA).map((competitor) => ({ competitor }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const data = COMPETITORS_DATA[competitor];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: data.seoTitle },
    description: data.seoDescription,
    path: `/alternatives/${data.slug}`,
    keywords: data.primaryKeywords,
  });
}

export default async function CompetitorComparisonPage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const data = COMPETITORS_DATA[competitor];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Alternatives', url: '/alternatives' },
    { name: `${data.name} Alternative`, url: `/alternatives/${data.slug}` },
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
            { name: 'Alternatives', url: '/alternatives' },
            { name: `${data.name} Comparison`, url: `/alternatives/${data.slug}` },
          ]}
        />

        {/* Page Hero */}
        <section className="my-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium">
              2026 IN-DEPTH COMPARISON
            </span>
            <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-emerald-100 text-emerald-800 font-medium">
              HONEST & UNBIASED
            </span>
          </div>
          <h1 className="font-display text-[36px] sm:text-[48px] font-medium tracking-[-1px] text-black mb-4">
            Analytics by Sufyaan Studio vs {data.name}
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            {data.tagline}
          </p>
        </section>

        {/* Direct Answer Block for AEO & GEO */}
        <AnswerBlock
          title={`Verdict: Analytics vs ${data.name}`}
          directAnswer={data.directVerdict}
          keyTakeaways={[
            '100% Cookie-free tracking with daily-salted visitor hashing',
            'Sub-1.5 KB tracking script (up to 45x lighter)',
            'Real-time traffic feeds with 5-second polling',
            'Zero consent banners required under GDPR and ePrivacy',
          ]}
          author="Sufyaan Studio Research"
          lastUpdated="August 2026"
        />

        {/* Why Switch Section */}
        <section className="my-14">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              KEY ADVANTAGES
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              Why Switch from {data.name} to Analytics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.whySwitchReasons.map((reason, idx) => (
              <div key={idx} className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] shadow-xs">
                <span className="w-8 h-8 rounded-[4px] bg-black text-white flex items-center justify-center mb-4 font-mono text-[13px] font-medium">
                  0{idx + 1}
                </span>
                <h3 className="font-display text-[17px] font-medium text-black mb-2">
                  {reason.title}
                </h3>
                <p className="font-display text-[13px] text-[#71717a] leading-[20px]">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Full Comparison Matrix */}
        <section className="my-14">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              SIDE-BY-SIDE BREAKDOWN
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              Feature & Technical Comparison
            </h2>
          </div>

          <ComparisonMatrix competitorName={data.name} rows={data.comparisonTable} />
        </section>

        {/* When to choose each tool */}
        <section className="my-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-[4px]">
            <h3 className="font-display text-[18px] font-medium text-emerald-950 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>Choose Analytics by Sufyaan Studio when:</span>
            </h3>
            <ul className="space-y-2.5 font-display text-[14px] text-emerald-900">
              {data.chooseUsWhen.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-[4px]">
            <h3 className="font-display text-[18px] font-medium text-zinc-900 mb-4 flex items-center gap-2">
              <span className="text-zinc-500 font-mono text-[14px]">ℹ</span>
              <span>Stick with {data.name} when:</span>
            </h3>
            <ul className="space-y-2.5 font-display text-[14px] text-zinc-700">
              {data.chooseCompetitorWhen.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 1-Minute Migration Snippet */}
        <section className="my-14">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
              FAST MIGRATION
            </span>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black">
              How to Migrate from {data.name} in 60 Seconds
            </h2>
            <p className="font-display text-[15px] text-[#71717a] mt-2">
              {data.migrationCode.caption}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <span className="font-mono text-[11px] uppercase text-red-700 block mb-2 font-medium">
                BEFORE: {data.name.toUpperCase()} SCRIPT
              </span>
              <CodeEditorMockup code={data.migrationCode.beforeCode} title="OLD TRACKING CODE" />
            </div>

            <div>
              <span className="font-mono text-[11px] uppercase text-emerald-700 block mb-2 font-medium">
                AFTER: ANALYTICS BY SUFYAAN STUDIO
              </span>
              <CodeEditorMockup code={data.migrationCode.afterCode} title="NEW LIGHTWEIGHT SCRIPT" />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FaqAccordion items={data.faq} title={`Frequently Asked Questions: Analytics vs ${data.name}`} />

        {/* CTA Banner */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Ready for fast, privacy-first analytics?
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Create your account in 30 seconds, add your domain, and start tracking immediately for $0.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              GET STARTED FOR FREE
            </ButtonSecondaryMint>
          </Link>
        </div>

        {/* Related Links */}
        <RelatedLinks currentSlug={data.slug} type="competitor" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
