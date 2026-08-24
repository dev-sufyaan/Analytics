'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HeroBandDark,
  ResearchBandDark,
  ResearchCard,
  StatsCardTinted,
  StatsCardPlain,
  CodeEditorMockup,
  ButtonSecondaryMint,
  ButtonSecondaryWhite,
  ButtonPrimary,
  Footer,
  FooterWordmarkBanner,
  LiveDot,
  SegmentedProgressBar,
  TrendBadge,
} from '@analytics/ui';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { HeroAnalyticsVisual } from '@/components/hero/HeroAnalyticsVisual';
import {
  Shield,
  Zap,
  Database,
  Check,
  ArrowRight,
  Sparkles,
  Server,
  Lock,
  ChevronDown,
  Globe,
  Smartphone,
  Eye,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function MarketingHomePage() {
  const [activeSnippetTab, setActiveSnippetTab] = useState<'nextjs' | 'html' | 'react' | 'event'>('nextjs');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Simulated live visitors counter for hero widget
  const [simulatedVisitors, setSimulatedVisitors] = useState(482);
  const [simulatedViews, setSimulatedViews] = useState(1284);

  useEffect(() => {
    // Gentle live counter tick for demo realism
    const interval = setInterval(() => {
      setSimulatedVisitors((prev) => prev + (Math.random() > 0.6 ? 1 : 0));
      setSimulatedViews((prev) => prev + (Math.random() > 0.4 ? 2 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const snippets = {
    nextjs: `// app/layout.tsx (Next.js 14 / 15 App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          src="https://analytics.sufyaan.studio/t.js"
          data-web="13921d15-5a3b-4b3d-ae89-b49255ee3381"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
    html: `<!-- Standard HTML5 / Static Web Page -->
<script
  defer
  src="https://analytics.sufyaan.studio/t.js"
  data-web="13921d15-5a3b-4b3d-ae89-b49255ee3381"
></script>`,
    react: `<!-- React / Vite index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <script
      defer
      src="https://analytics.sufyaan.studio/t.js"
      data-web="13921d15-5a3b-4b3d-ae89-b49255ee3381"
    ></script>
  </head>
  <body><div id="root"></div></body>
</html>`,
    event: `// Custom Conversion Tracking (e-commerce, signups)
window.analytics.track('checkout_completed', {
  plan: 'pro_annual',
  amount: 240,
  currency: 'USD'
});`,
  };

  const faqs = [
    {
      q: 'Do I really not need a cookie consent banner?',
      a: 'Yes, 100%. Because Analytics does not use cookies, does not store raw IP addresses, and does not track users across days or separate websites, you are exempt from GDPR, ePrivacy, and CCPA consent banner mandates.',
    },
    {
      q: 'How does Analytics count unique visitors without cookies?',
      a: 'Analytics hashes the client IP, User-Agent and a secret daily salt at the Cloudflare edge. The raw IP is discarded immediately — the hash cannot be linked across days, preserving user anonymity while keeping daily visitor metrics honest.',
    },
    {
      q: 'Will the tracker slow down my website?',
      a: 'Not at all. The tracker is 1.15 KB gzipped (≤1.5 KB budget, 45× smaller than GA4, 0 dependencies). It loads asynchronously with defer and uses non-blocking sendBeacon requests, maintaining 100% Google Lighthouse scores.',
    },
    {
      q: 'Can I track single-page apps (Next.js, React, Vue, SvelteKit, Astro)?',
      a: 'Yes. The tracker automatically intercepts window history (pushState and replaceState) to track pageviews seamlessly on client-side route transitions with zero extra configuration.',
    },
    {
      q: 'Can I share my analytics publicly with clients or investors?',
      a: 'Yes! Every website comes with an optional public share link (/s/[share_token]) that lets you showcase your live traffic metrics without requiring viewers to sign in or create an account.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-between">
      {/* Responsive Site Header with Mobile Hamburger Menu */}
      <SiteHeader />

      {/* Hero Band Dark */}
      <HeroBandDark>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Headline & CTA */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-2 bg-[#26263a] px-3 py-1 rounded-[4px]">
                <LiveDot />
                <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff]">
                  PRIVACY-FIRST ANALYTICS • ZERO COOKIES
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1 rounded-[4px] font-mono text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-[#fc4c02]" />
                <span>1.15 KB TRACKER • 100% GDPR EXEMPT</span>
              </div>
            </div>

            <h1 className="font-display text-[44px] sm:text-[56px] lg:text-[64px] font-medium leading-[1.08] tracking-[-1.92px] text-white mb-6">
              Simple privacy-first website analytics.
            </h1>

            <p className="font-display text-[18px] md:text-[20px] leading-[28px] text-[#999999] max-w-xl mb-8">
              No cookies. No fingerprint theatre. A lightweight, instant dashboard you actually enjoy opening. Built with Supabase Postgres and Cloudflare Workers edge ingest.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login">
                <ButtonSecondaryMint>
                  GET STARTED FREE ($0)
                </ButtonSecondaryMint>
              </Link>
              <Link href="/alternatives">
                <ButtonSecondaryWhite>
                  COMPARE ALTERNATIVES
                </ButtonSecondaryWhite>
              </Link>
            </div>
          </div>

          {/* Right Minimal High-Class Analytics Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <HeroAnalyticsVisual />
          </div>
        </div>
      </HeroBandDark>

      {/* Answer Block for AEO & Quick Verdict */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 w-full pt-8">
        <AnswerBlock
          title="What is Analytics by Sufyaan Studio?"
          directAnswer="Analytics by Sufyaan Studio is a best-in-class, privacy-first web analytics platform that delivers real-time traffic intelligence, custom conversion tracking, and automatic UTM marketing attribution with a 1.15 KB tracker and 100% cookie-free GDPR compliance."
          keyTakeaways={[
            '100% Cookie-free with zero cookie consent popups required',
            'Sub-1.5 KB tracking script (45x lighter than GA4)',
            'Instant Cloudflare edge ingestion with live 5-second polling',
            'PostgreSQL data ownership on Supabase with strict Row Level Security',
          ]}
        />
      </div>

      {/* "Works with" grayscale logo bar */}
      <div className="w-full border-y border-[#ebebeb] bg-[#fafafa] py-8 my-8">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <p className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] text-center mb-6">
            WORKS SEAMLESSLY WITH EVERY MODERN WEB FRAMEWORK
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-80">
            <Link href="/integrations/nextjs" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">Next.js</Link>
            <Link href="/integrations/react" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">React & Vite</Link>
            <Link href="/integrations/astro" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">Astro</Link>
            <Link href="/integrations/sveltekit" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">SvelteKit</Link>
            <Link href="/integrations/remix" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">Remix & Vue</Link>
            <Link href="/integrations/wordpress" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">WordPress</Link>
            <Link href="/integrations/webflow" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">Webflow</Link>
            <Link href="/integrations/shopify" className="font-display font-medium text-[15px] text-[#71717a] hover:text-black transition-colors">Shopify</Link>
          </div>
        </div>
      </div>

      {/* Interactive Live Dashboard Preview Section */}
      <section className="py-20 max-w-[1280px] mx-auto px-4 md:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            LIVE INTERACTION
          </span>
          <h2 className="font-display text-[36px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            The analytics UI you will look forward to checking.
          </h2>
          <p className="font-display text-[16px] text-[#71717a] mt-3">
            Designed for clarity, fast scans, and instant comprehension.
          </p>
        </div>

        {/* Live Mockup UI Container */}
        <div className="border border-[#ebebeb] rounded-[8px] bg-[#fafafa] p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[#ebebeb] gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#c8f6f9]" />
              <div>
                <span className="font-mono text-[11px] uppercase text-[#71717a] block">DEMO SITE</span>
                <h4 className="font-display text-[20px] font-medium text-black">saas-app.dev</h4>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase">
                <LiveDot />
                <span>LIVE FEED</span>
              </span>
            </div>
          </div>

          {/* 4 Interactive Mock KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#c8f6f9] p-6 rounded-[4px]">
              <span className="font-mono text-[11px] uppercase text-black/75 block mb-2">VISITORS TODAY</span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[32px] font-medium tracking-tight text-black">{simulatedVisitors.toLocaleString()}</span>
                <TrendBadge value="+14.2%" />
              </div>
            </div>
            <div className="bg-[#bdbbff] p-6 rounded-[4px]">
              <span className="font-mono text-[11px] uppercase text-black/75 block mb-2">TOTAL PAGEVIEWS</span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[32px] font-medium tracking-tight text-black">{simulatedViews.toLocaleString()}</span>
                <TrendBadge value="+8.6%" />
              </div>
            </div>
            <div className="bg-white border border-[#ebebeb] p-6 rounded-[4px]">
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">BOUNCE RATE</span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[32px] font-medium tracking-tight text-black">28.4%</span>
                <span className="font-display text-[13px] text-[#71717a]">48 single views</span>
              </div>
            </div>
            <div className="bg-white border border-[#ebebeb] p-6 rounded-[4px]">
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">AVG VISIT TIME</span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[32px] font-medium tracking-tight text-black">3m 14s</span>
                <span className="font-display text-[13px] text-[#71717a]">412 sessions</span>
              </div>
            </div>
          </div>

          {/* Two-up Mini Table Previews */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#ebebeb] rounded-[4px] p-5">
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-3">TOP PAGES</span>
              <div className="space-y-2.5 font-display text-[13px]">
                <div className="flex items-center justify-between p-2 bg-[#f9f9f9] rounded-[3px]">
                  <span className="truncate flex-1 font-medium">/</span>
                  <span className="font-mono text-[12px] font-medium">682 views (53%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#f9f9f9] rounded-[3px]">
                  <span className="truncate flex-1 font-medium">/pricing</span>
                  <span className="font-mono text-[12px] font-medium">314 views (24%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#f9f9f9] rounded-[3px]">
                  <span className="truncate flex-1 font-medium">/docs/quickstart</span>
                  <span className="font-mono text-[12px] font-medium">188 views (15%)</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#ebebeb] rounded-[4px] p-5">
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-3">HARDWARE RATIO</span>
              <SegmentedProgressBar
                segments={[
                  { label: 'Desktop', value: 68, color: '#000000' },
                  { label: 'Mobile', value: 28, color: '#bdbbff' },
                  { label: 'Tablet', value: 4, color: '#c8f6f9' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mid-Page Key Metric Cards */}
      <section className="py-16 max-w-[1280px] mx-auto px-4 md:px-8 w-full" id="features">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            PERFORMANCE AT SCALE
          </span>
          <h2 className="font-display text-[36px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            Engineered for speed, privacy, and zero operational overhead.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatsCardTinted
            label="TRACKER SCRIPT SIZE"
            value="≤1.5 KB"
            delta="gzip • 0 dependencies"
            variant="mint"
          />
          <StatsCardTinted
            label="COOKIES REQUIRED"
            value="0"
            delta="100% GDPR compliant"
            variant="periwinkle"
          />
          <StatsCardPlain
            label="INGEST LATENCY"
            value="204"
            delta="Cloudflare edge response"
          />
          <StatsCardPlain
            label="DATABASE COST"
            value="$0"
            delta="Supabase Free tier"
          />
        </div>

        {/* Live Snippet Mockup with Framework Switcher */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#fafafa] border border-[#ebebeb] rounded-[4px] p-8 md:p-12">
          <div className="lg:col-span-6">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              ONE-LINE INSTALLATION
            </span>
            <h3 className="font-display text-[28px] md:text-[32px] font-medium tracking-[-0.6px] text-black mb-4">
              Paste once. Done forever.
            </h3>
            <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
              Just add our featherlight script tag. No complex cookie consent banners, no heavy SDK imports, and no impact on your Core Web Vitals score.
            </p>
            <ul className="space-y-3 font-display text-[14px] text-black mb-6">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-black shrink-0" />
                <span>Automatic pageview tracking on SPA navigation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-black shrink-0" />
                <span>Non-blocking Beacon API delivery</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-black shrink-0" />
                <span>Custom event tracking via <code className="font-mono text-[12px] bg-[#ebebeb] px-1 py-0.5 rounded">window.analytics.track()</code></span>
              </li>
            </ul>

            <Link href="/docs">
              <span className="font-mono text-[11px] uppercase text-black font-medium hover:underline inline-flex items-center gap-1">
                <span>EXPLORE ALL GUIDES & LIBRARIES</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 mb-3">
              {(['nextjs', 'html', 'react', 'event'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSnippetTab(tab)}
                  className={`px-3 py-1 font-mono text-[11px] uppercase rounded-[3.25px] transition-colors cursor-pointer ${
                    activeSnippetTab === tab
                      ? 'bg-black text-white'
                      : 'bg-white border border-[#ebebeb] text-[#71717a] hover:text-black'
                  }`}
                >
                  {tab === 'nextjs' ? 'NEXT.JS' : tab === 'html' ? 'HTML' : tab === 'react' ? 'REACT' : 'CUSTOM EVENT'}
                </button>
              ))}
            </div>
            <CodeEditorMockup
              code={snippets[activeSnippetTab]}
              title={`${activeSnippetTab.toUpperCase()} CODE`}
            />
          </div>
        </div>
      </section>

      {/* Dark Research & Architecture Band */}
      <ResearchBandDark id="architecture">
        <div className="mb-12">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-2">
            ARCHITECTURE & ETHICS
          </span>
          <h2 className="font-display text-[32px] md:text-[38px] font-medium tracking-[-0.8px] text-white">
            Why privacy-first architecture matters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ResearchCard
            tag="01 // IDENTITY"
            title="Salted Visitor Hashes"
            description="Visitor ID = hash(website + IP + UA + salt). Salt rotates daily by default (SALT_ROTATION=day|week|month). Raw IP is dropped at the edge — no cross-period tracking."
          />
          <ResearchCard
            tag="02 // INFRASTRUCTURE"
            title="Instant Edge Ingest"
            description="Collect endpoints run on Cloudflare Workers. Requests are validated, sanitized, and acknowledged with an instant 204 response without taxing your database."
          />
          <ResearchCard
            tag="03 // OWNERSHIP"
            title="Complete Data Control"
            description="Your analytics data lives in your Supabase Postgres database with strict Row Level Security (RLS). You can wipe, export, or audit your data at any time."
          />
        </div>
      </ResearchBandDark>

      {/* Comparison Table Section */}
      <section className="py-20 max-w-[1280px] mx-auto px-4 md:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            COMPARISON
          </span>
          <h2 className="font-display text-[36px] font-medium tracking-[-0.8px] text-black">
            How Analytics compares
          </h2>
          <p className="font-display text-[15px] text-[#71717a] mt-2">
            See why developers and founders are switching from legacy analytics tools.
          </p>
        </div>

        {/* Competitor quick-links bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <Link href="/alternatives/ga4" className="px-3.5 py-1.5 bg-[#fafafa] border border-[#ebebeb] hover:border-black rounded-[4px] font-mono text-[11px] uppercase transition-colors">
            vs Google Analytics 4 →
          </Link>
          <Link href="/alternatives/plausible" className="px-3.5 py-1.5 bg-[#fafafa] border border-[#ebebeb] hover:border-black rounded-[4px] font-mono text-[11px] uppercase transition-colors">
            vs Plausible →
          </Link>
          <Link href="/alternatives/fathom" className="px-3.5 py-1.5 bg-[#fafafa] border border-[#ebebeb] hover:border-black rounded-[4px] font-mono text-[11px] uppercase transition-colors">
            vs Fathom →
          </Link>
          <Link href="/alternatives/umami" className="px-3.5 py-1.5 bg-[#fafafa] border border-[#ebebeb] hover:border-black rounded-[4px] font-mono text-[11px] uppercase transition-colors">
            vs Umami →
          </Link>
          <Link href="/alternatives" className="px-3.5 py-1.5 bg-black text-white rounded-[4px] font-mono text-[11px] uppercase transition-colors hover:bg-[#26263a]">
            View All 8 Comparisons →
          </Link>
        </div>

        <div className="border border-[#ebebeb] rounded-[4px] overflow-x-auto mb-20">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#f7f7f7] border-b border-[#ebebeb] font-mono text-[11px] uppercase text-[#71717a]">
              <tr>
                <th className="p-4">Feature</th>
                <th className="p-4 bg-black text-white">Analytics</th>
                <th className="p-4">Google Analytics 4</th>
                <th className="p-4">Standard SaaS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb] font-display">
              <tr>
                <td className="p-4 font-medium">Script Size</td>
                <td className="p-4 bg-black/5 font-mono text-[13px] font-medium">1.15 KB gzipped (≤1.5 KB)</td>
                <td className="p-4 text-[#71717a]">~45 KB</td>
                <td className="p-4 text-[#71717a]">15–30 KB</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Requires Cookie Banner</td>
                <td className="p-4 bg-black/5 font-medium">No (Exempt)</td>
                <td className="p-4 text-[#71717a]">Yes (Mandatory)</td>
                <td className="p-4 text-[#71717a]">Usually</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">IP Address Storage</td>
                <td className="p-4 bg-black/5 font-medium">Never (dropped at edge)</td>
                <td className="p-4 text-[#71717a]">Processed by Google</td>
                <td className="p-4 text-[#71717a]">Often stored</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">UTM & Channel Attribution</td>
                <td className="p-4 bg-black/5 font-medium">Auto (utm_source/medium/campaign + gclid/fbclid)</td>
                <td className="p-4 text-[#71717a]">Manual / GA4 UI</td>
                <td className="p-4 text-[#71717a]">Often paid</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Entry / Exit Pages</td>
                <td className="p-4 bg-black/5 font-medium">Top Pages + Entry/Exit tabs</td>
                <td className="p-4 text-[#71717a]">Yes</td>
                <td className="p-4 text-[#71717a]">Varies</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Geography Drill-Down</td>
                <td className="p-4 bg-black/5 font-medium">Country + Region/City (CF headers)</td>
                <td className="p-4 text-[#71717a]">City-level</td>
                <td className="p-4 text-[#71717a]">Country only</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Public Share Links</td>
                <td className="p-4 bg-black/5 font-medium">Included</td>
                <td className="p-4 text-[#71717a]">No</td>
                <td className="p-4 text-[#71717a]">Paid tier only</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Self-Host Option</td>
                <td className="p-4 bg-black/5 font-medium">Supabase + Cloudflare (you own DB)</td>
                <td className="p-4 text-[#71717a]">No</td>
                <td className="p-4 text-[#71717a]">Rare</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Hosting Cost</td>
                <td className="p-4 bg-black/5 font-mono text-[13px] font-medium">$0 (Free tier)</td>
                <td className="p-4 text-[#71717a]">Free (Ad monetization)</td>
                <td className="p-4 text-[#71717a]">$10–$50 / month</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Frequently Asked Questions Accordion */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              FAQ
            </span>
            <h3 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#ebebeb] rounded-[4px] overflow-hidden bg-white transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#fafafa]"
                  >
                    <span className="font-display text-[16px] font-medium text-black">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#71717a] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 font-display text-[14px] leading-[22px] text-[#71717a] border-t border-[#ebebeb] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-20 bg-[#010120] text-white rounded-[4px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Start tracking your website in under 2 minutes.
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Create your account, add your domain, and enjoy clean analytics.
          </p>
          <Link href="/login">
            <ButtonSecondaryMint>
              CREATE FREE ACCOUNT
            </ButtonSecondaryMint>
          </Link>
        </div>
      </section>

      {/* Footer & Wordmark */}
      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
