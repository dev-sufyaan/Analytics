import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, CodeEditorMockup, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { HOW_TO_GUIDES } from '@/lib/seo/how-to-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getHowToSchema } from '@/lib/seo/json-ld';
import { Clock, User } from 'lucide-react';

export function generateStaticParams() {
  return Object.keys(HOW_TO_GUIDES).map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = HOW_TO_GUIDES[slug];
  if (!data) return {};

  return buildMetadata({
    title: { absolute: `${data.title} · Analytics Guides` },
    description: data.description,
    path: `/how-to/${data.slug}`,
    keywords: [data.title, 'web analytics tutorial', 'developer guide', 'how to track website'],
  });
}

export default async function HowToDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = HOW_TO_GUIDES[slug];

  if (!data) notFound();

  const faqSchema = getFaqSchema(data.faq);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'How-To Guides', url: '/how-to' },
    { name: data.title, url: `/how-to/${data.slug}` },
  ]);
  const howToSchema = getHowToSchema({
    name: data.title,
    description: data.directAnswer,
    steps: data.steps.map((s) => ({
      name: s.name,
      text: s.text,
      code: s.code,
    })),
  });

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

      <SiteHeader forceLight={true} />

      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-12 md:py-16 flex-1">
        <Breadcrumbs
          items={[
            { name: 'How-To Guides', url: '/how-to' },
            { name: data.title, url: `/how-to/${data.slug}` },
          ]}
        />

        {/* Hero */}
        <section className="my-8 max-w-4xl">
          <div className="flex items-center gap-4 text-xs font-mono uppercase text-[#71717a] mb-3">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{data.author}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{data.readTime}</span>
            </span>
          </div>
          <h1 className="font-display text-[36px] sm:text-[46px] font-medium tracking-[-1px] text-black mb-4">
            {data.title}
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            {data.description}
          </p>
        </section>

        {/* Direct Answer */}
        <AnswerBlock
          title="Direct Tutorial Summary"
          directAnswer={data.directAnswer}
          keyTakeaways={data.steps.map((s) => s.name)}
          author={data.author}
          lastUpdated="August 2026"
        />

        {/* Tutorial Steps */}
        <section className="my-14 space-y-12 max-w-4xl">
          {data.steps.map((step, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="font-display text-[22px] sm:text-[26px] font-medium text-black">
                {step.name}
              </h2>
              <p className="font-display text-[15px] sm:text-[16px] text-[#71717a] leading-[24px]">
                {step.text}
              </p>
              {step.code && (
                <CodeEditorMockup
                  code={step.code}
                  title={`CODE STEP ${idx + 1}`}
                />
              )}
            </div>
          ))}
        </section>

        {/* FAQ */}
        <FaqAccordion items={data.faq} title="Guide FAQ" />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Start tracking your websites with confidence.
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Create an account in 30 seconds. Up to 25,000 events free every month.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks currentSlug={data.slug} type="how-to" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
