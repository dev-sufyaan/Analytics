import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner } from '@analytics/ui';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { INTEGRATIONS_DATA } from '@/lib/seo/marketing-data';
import { buildMetadata } from '@/lib/seo/metadata';
import { getItemListSchema } from '@/lib/seo/json-ld';
import { ArrowRight, Code, Layers } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Framework & Platform Integrations · Analytics',
  description: 'Copy-paste integration guides for Next.js, React, Vue, Nuxt, SvelteKit, Astro, Remix, WordPress, Webflow, Shopify, and HTML5 static websites.',
  path: '/integrations',
  keywords: [
    'Next.js analytics',
    'React analytics',
    'Astro analytics',
    'WordPress privacy analytics',
    'SvelteKit analytics',
    'Shopify analytics',
  ],
});

export default function IntegrationsHubPage() {
  const integrations = Object.values(INTEGRATIONS_DATA);
  const itemListSchema = getItemListSchema(
    'Framework & Platform Analytics Integrations',
    integrations.map((i) => ({
      name: `${i.name} Analytics Integration`,
      url: `/integrations/${i.slug}`,
      description: i.directAnswer,
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
        <Breadcrumbs items={[{ name: 'Integrations', url: '/integrations' }]} />

        <div className="max-w-3xl my-8">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            FRAMEWORK GUIDES
          </span>
          <h1 className="font-display text-[38px] md:text-[50px] font-medium tracking-[-1px] text-black mb-4">
            Framework & Platform Integrations
          </h1>
          <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-[#71717a]">
            Connect Analytics to your favorite web framework, static site generator, or CMS in under 2 minutes with zero impact on page load speed.
          </p>
        </div>

        <AnswerBlock
          title="Universal Compatibility"
          directAnswer="Analytics by Sufyaan Studio is framework-agnostic. Because the 1.15 KB tracker automatically intercepts browser history pushState and popstate, it tracks page transitions across all modern SPAs (Next.js, React, Vue, SvelteKit, Astro, Remix) as well as traditional CMS platforms (WordPress, Shopify, Webflow)."
          keyTakeaways={[
            'Single script tag setup on all platforms',
            'Automatic SPA route change detection',
            'Non-blocking sendBeacon payload delivery',
            'Zero cookie consent banners required',
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
          {integrations.map((i) => (
            <Link
              key={i.slug}
              href={`/integrations/${i.slug}`}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[2px] bg-[#ebebeb] text-black font-medium">
                  {i.category}
                </span>
                <span className="font-mono text-[11px] text-emerald-700 font-medium">2 Min Setup</span>
              </div>
              <h2 className="font-display text-[22px] font-medium text-black mb-2 group-hover:underline">
                {i.name}
              </h2>
              <p className="font-display text-[14px] text-[#71717a] leading-[22px] mb-6">
                {i.description}
              </p>

              <div className="flex items-center text-xs font-mono uppercase text-black font-medium group-hover:translate-x-1 transition-transform">
                <span>VIEW SETUP SNIPPET</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        <RelatedLinks type="integration" />
      </main>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
