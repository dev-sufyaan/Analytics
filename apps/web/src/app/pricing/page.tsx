'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  NavBar,
  NavLink,
  ButtonPrimary,
  ButtonSecondaryMint,
  Footer,
  FooterWordmarkBanner,
} from '@analytics/ui';
import { Check, Clock, ChevronDown } from 'lucide-react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Is the Free Community plan really free forever?',
      a: 'Yes. The Free plan includes up to 25,000 monthly events, 30 days of granular raw event retention, permanent daily historical aggregates, and public dashboards with zero expiration date.',
    },
    {
      q: 'What happens if I exceed the 25,000 monthly event limit?',
      a: 'We do not unexpectedly shut off your site or charge your card. Ingestion will gracefully pause until the monthly quota resets on the 1st of the next month, and you will see a non-intrusive alert banner on your dashboard.',
    },
    {
      q: 'Can I track multiple domains on the Free tier?',
      a: 'Yes, you can create and manage multiple websites and domains from a single account on the free plan.',
    },
    {
      q: 'When will the Pro Scale plan be available?',
      a: 'Pro Scale is currently in active development. It will provide higher event quotas (250k+ events/month), 1-year raw retention, and automated CSV/JSON exports.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-between">
      <NavBar isScrolled={true}>
        <Link href="/" className="flex items-center gap-2 font-display text-[20px] font-medium tracking-tight">
          <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
          <span>analytics</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-display text-[15px]">
          <NavLink href="/#features">Features</NavLink>
          <NavLink href="/pricing" active={true}>Pricing</NavLink>
          <NavLink href="/docs">Documentation</NavLink>
          <NavLink href="/design">Design System</NavLink>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <span className="font-display text-[14px] font-medium text-black hover:text-black/70">
              Sign in
            </span>
          </Link>
          <Link href="/login">
            <ButtonPrimary className="text-[12px] h-9 px-4">
              GET STARTED
            </ButtonPrimary>
          </Link>
        </div>
      </NavBar>

      <main className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            TRANSPARENT PRICING
          </span>
          <h1 className="font-display text-[40px] md:text-[52px] font-medium tracking-[-1.2px] text-black mb-4">
            Simple, honest plans.
          </h1>
          <p className="font-display text-[16px] text-[#71717a]">
            Analytics is currently 100% free with all core features included. Paid high-volume tiers are coming soon.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {/* Free Tier - Active */}
          <div className="border-2 border-black rounded-[4px] p-8 flex flex-col justify-between bg-white relative shadow-xs">
            <div className="absolute top-4 right-4">
              <span className="font-mono text-[10px] uppercase bg-[#c8f6f9] text-black px-2.5 py-1 rounded-[2px] font-medium">
                AVAILABLE NOW
              </span>
            </div>

            <div>
              <span className="font-mono text-[12px] uppercase font-medium text-[#71717a] block mb-2">
                FREE / COMMUNITY TIER
              </span>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-[48px] font-medium tracking-[-1px] text-black">$0</span>
                <span className="font-display text-[15px] text-[#71717a]">/ month forever</span>
              </div>
              <p className="font-display text-[14px] text-[#71717a] mb-8 pb-6 border-b border-[#ebebeb]">
                Ideal for indie hackers, blogs, side projects, and personal websites.
              </p>

              <ul className="space-y-3.5 font-display text-[14px] text-black mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span>Up to <strong>25,000</strong> events / month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span><strong>30 days</strong> raw event data retention</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span>Permanent historical daily rollups</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span>Public share links with custom tokens</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span>Realtime visitor tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-black shrink-0" />
                  <span>No cookies & 100% GDPR compliant</span>
                </li>
              </ul>
            </div>

            <Link href="/login" className="w-full">
              <ButtonPrimary className="w-full">
                GET STARTED FREE
              </ButtonPrimary>
            </Link>
          </div>

          {/* Pro Tier - Coming Soon (Disabled) */}
          <div className="border border-[#ebebeb] rounded-[4px] p-8 flex flex-col justify-between bg-[#fafafa] relative opacity-90">
            <div className="absolute top-4 right-4">
              <span className="font-mono text-[10px] uppercase bg-[#26263a] text-white px-2.5 py-1 rounded-[2px] font-medium inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>COMING SOON</span>
              </span>
            </div>

            <div>
              <span className="font-mono text-[12px] uppercase font-medium text-[#71717a] block mb-2">
                PRO SCALE TIER
              </span>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-[48px] font-medium tracking-[-1px] text-black">$9</span>
                <span className="font-display text-[15px] text-[#71717a]">/ month (planned)</span>
              </div>
              <p className="font-display text-[14px] text-[#71717a] mb-8 pb-6 border-b border-[#ebebeb]">
                For fast-growing companies and agencies needing higher volume, extended retention, and CSV exports.
              </p>

              <ul className="space-y-3.5 font-display text-[14px] text-[#71717a] mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#71717a] shrink-0" />
                  <span>Up to <strong>250,000</strong> events / month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#71717a] shrink-0" />
                  <span><strong>1 Year</strong> raw event retention</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#71717a] shrink-0" />
                  <span>Unlimited websites & domains</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#71717a] shrink-0" />
                  <span>CSV & JSON data exports</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-[#71717a] shrink-0" />
                  <span>Priority edge ingest routing</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled
              className="w-full h-10 rounded-[4px] font-mono text-[13px] uppercase font-medium bg-[#ebebeb] text-[#71717a] cursor-not-allowed select-none transition-none"
            >
              SOON
            </button>
          </div>
        </div>

        {/* Feature matrix — Umami parity highlight */}
        <div className="max-w-4xl mx-auto mb-20">
          <h3 className="font-display text-[22px] font-medium text-black mb-4 text-center">Everything you need to replace GA — today</h3>
          <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-[#ebebeb] font-mono text-[11px] uppercase">
              <div className="bg-[#f7f7f7] p-3 text-[#71717a]">Feature</div>
              <div className="bg-black text-white p-3">Free ($0)</div>
              <div className="bg-[#f7f7f7] p-3 text-[#71717a]">Pro ($9/mo)</div>
            </div>
            {[
              ['Pageviews + Visitors', '✓', '✓'],
              ['UTM / gclid / fbclid auto-capture', '✓', '✓'],
              ['Top Pages / Referrers / Countries', '✓', '✓'],
              ['Entry / Exit tabs', '✓ (preview)', '✓'],
              ['Channels (utm_source)', '✓', '✓'],
              ['Devices — Browser / OS / Device', '✓', '✓'],
              ['World map + Region/City', 'Country live', 'Region/City live'],
              ['CSV export — per table + full', '✓', '✓'],
              ['Public share links', '✓', '✓'],
              ['Realtime (5s poll)', '✓', '✓'],
            ].map(([feat, free, pro]) => (
              <div key={feat} className="grid grid-cols-3 gap-px bg-[#ebebeb] font-display text-[13px]">
                <div className="bg-white p-3 font-medium">{feat}</div>
                <div className="bg-[#fafafa] p-3 font-mono text-[12px]">{free}</div>
                <div className="bg-white p-3 font-mono text-[12px] text-[#71717a]">{pro}</div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[11px] uppercase text-[#999999] text-center mt-3">
            Self-hosted? You own the Supabase DB + Cloudflare Worker. No vendor lock-in — wipe/export anytime from Settings.
          </p>
        </div>

        {/* Pricing FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              QUESTIONS & ANSWERS
            </span>
            <h3 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black">
              Pricing Details
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
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
