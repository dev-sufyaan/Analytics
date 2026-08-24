import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { ButtonPrimary, ButtonSecondaryMint, StatsCardTinted, StatsCardPlain, CodeEditorMockup, Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { FaqAccordion } from '@/components/seo/FaqAccordion';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildMetadata } from '@/lib/seo/metadata';
import { getFaqSchema, getBreadcrumbSchema, getSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import { Shield, Zap, Lock, Database, CheckCircle2, ArrowRight } from 'lucide-react';

const faqs = [
  {
    question: 'What is privacy-first analytics?',
    answer: 'Privacy-first analytics is website measurement software designed to count visitors, pageviews, referrers, and conversion events without tracking individual users, storing cookies on user devices, or collecting personal data (like raw IP addresses).',
  },
  {
    question: 'Why are cookie consent banners not required with Analytics by Sufyaan Studio?',
    answer: 'Under the EU ePrivacy Directive (Article 5.3) and GDPR, consent is only required when storing or accessing information on a user terminal (e.g. cookies or persistent storage) or processing PII. Because our tracker operates without cookies and drops raw IP addresses at the edge, it is legally exempt.',
  },
  {
    question: 'How does daily-salted hashing guarantee visitor anonymity?',
    answer: 'At the edge, we generate visitor_hash = sha256(website_id + client_ip + user_agent + daily_salt). Because the salt rotates daily and raw IP is never stored, visitor hashes cannot be linked across days or websites, guaranteeing anonymity while keeping single-day visit counts honest.',
  },
  {
    question: 'Does privacy-first analytics work on Single Page Apps (Next.js, React, Vue)?',
    answer: 'Yes! The lightweight tracker automatically listens to browser history state changes to record client-side pageviews accurately without extra configuration.',
  },
];

export const metadata = buildMetadata({
  title: 'Privacy-First & Cookie-Free Website Analytics (2026 Guide)',
  description: 'The definitive guide to privacy-first, cookie-free website analytics. Learn how to track traffic accurately without cookie consent banners, IP logging, or GDPR liabilities.',
  path: '/privacy-first-analytics',
  keywords: [
    'privacy-first analytics',
    'cookie-free analytics',
    'cookie-less website analytics',
    'GDPR compliant analytics',
    'cookie banner exemption',
    'best privacy analytics',
  ],
});

export default function PrivacyFirstAnalyticsPillarPage() {
  const faqSchema = getFaqSchema(faqs);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Privacy-First Analytics', url: '/privacy-first-analytics' },
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
        <Breadcrumbs items={[{ name: 'Privacy-First Analytics Guide', url: '/privacy-first-analytics' }]} />

        {/* Hero */}
        <section className="my-8 max-w-4xl">
          <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-[3px] bg-[#010120] text-white font-medium inline-block mb-3">
            2026 PILLAR GUIDE
          </span>
          <h1 className="font-display text-[38px] sm:text-[52px] font-medium tracking-[-1.2px] text-black mb-4">
            The Complete Guide to Privacy-First Website Analytics
          </h1>
          <p className="font-display text-[16px] sm:text-[18px] text-[#71717a] leading-[26px]">
            Why modern web developers and SaaS founders are ditching legacy tracking cookies in favor of lightweight, privacy-respecting, and GDPR-exempt analytics architecture.
          </p>
        </section>

        {/* Direct Answer for AEO/GEO */}
        <AnswerBlock
          title="Direct Answer: Why Privacy-First Analytics Matters"
          directAnswer="Privacy-first analytics allows websites to measure visitor volume, marketing channels, and user engagement with 100% accuracy while eliminating cookies, cross-site tracking, and raw IP logging. This eliminates the need for GDPR cookie consent banners, improves website loading speeds, and protects user anonymity by default."
          keyTakeaways={[
            '0 Cookies stored on visitor devices',
            '0 Bytes of raw IP addresses saved in databases',
            '100% Exempt from GDPR & ePrivacy consent banner mandates',
            '45x Lighter than Google Analytics 4 (1.15 KB vs 45 KB)',
          ]}
          lastUpdated="August 2026"
        />

        {/* 4 Pillar Grid */}
        <section className="my-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCardTinted
              label="TRACKER WEIGHT"
              value="1.15 KB"
              delta="gzipped • 0 dependencies"
              variant="mint"
            />
            <StatsCardTinted
              label="COOKIES USED"
              value="0"
              delta="100% GDPR exempt"
              variant="periwinkle"
            />
            <StatsCardPlain
              label="IP RETENTION"
              value="0 ms"
              delta="Dropped at edge"
            />
            <StatsCardPlain
              label="DATA PRIVACY"
              value="RLS"
              delta="Postgres isolation"
            />
          </div>
        </section>

        {/* Detailed Sections */}
        <section className="my-14 space-y-12 max-w-4xl">
          <div>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black mb-4">
              1. The Death of the Cookie Banner
            </h2>
            <p className="font-display text-[15px] sm:text-[16px] leading-[26px] text-zinc-800 mb-4">
              Cookie consent banners are universally disliked by web users and cause significant drop-off rates on marketing landing pages. Under European privacy laws, cookie banners are only mandatory when storing non-essential tracking tokens on user devices.
            </p>
            <p className="font-display text-[15px] sm:text-[16px] leading-[26px] text-zinc-800">
              By removing tracking cookies entirely and replacing them with daily-salted edge hashes, Analytics by Sufyaan Studio allows you to delete your cookie consent popup and provide a clean, friction-free user experience.
            </p>
          </div>

          <div>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black mb-4">
              2. How Daily-Salted Hashing Works
            </h2>
            <p className="font-display text-[15px] sm:text-[16px] leading-[26px] text-zinc-800 mb-4">
              When a visitor requests a page on your site, our Cloudflare edge worker combines the site UUID, client IP, User-Agent, and a secret server-side salt to generate a 256-bit cryptographic signature.
            </p>
            <CodeEditorMockup
              title="DAILY-SALTED HASH ALGORITHM"
              code={`// Computed on Cloudflare Edge Worker in memory:
const visitorHash = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(websiteId + clientIp + userAgent + dailySalt)
);

// -> The raw clientIp is discarded immediately from memory.
// -> Only the anonymized visitorHash and country code are stored.`}
            />
          </div>

          <div>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium text-black mb-4">
              3. Web Performance & Core Web Vitals
            </h2>
            <p className="font-display text-[15px] sm:text-[16px] leading-[26px] text-zinc-800 mb-4">
              Google Analytics 4 loads approximately 45 KB of JavaScript and executes complex tracking logic on the browser main thread. On mobile devices, this causes measurable delays in Largest Contentful Paint (LCP) and Interaction to Next Paint (INP).
            </p>
            <p className="font-display text-[15px] sm:text-[16px] leading-[26px] text-zinc-800">
              Our tracker weighs only 1.15 KB gzipped, executes in under 2 milliseconds, and sends non-blocking beacon requests, keeping your Lighthouse performance score at 100%.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <FaqAccordion items={faqs} title="Privacy & Compliance FAQ" />

        {/* CTA */}
        <div className="my-16 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Switch to Privacy-First Analytics in 60 Seconds
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Create an account, add your domain, and enjoy clean analytics with 25,000 monthly events free.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              START FREE NOW
            </ButtonSecondaryMint>
          </Link>
        </div>

        <RelatedLinks type="feature" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
