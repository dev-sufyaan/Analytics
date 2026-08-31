import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonPrimary, ButtonOutline } from '@analytics/ui';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: '404: Resource Not Found · Analytics',
  description: 'The requested resource was not found. Use our sitemap, llms.txt, or documentation index to find what you need.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-between">
      <SiteHeader forceLight={true} />

      <main className="max-w-[1000px] w-full mx-auto px-4 md:px-8 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">
          404 // RESOURCE NOT FOUND
        </span>
        <h1 className="font-display text-[36px] md:text-[44px] font-medium text-black tracking-[-0.6px] mb-3">
          Page or Resource Not Found
        </h1>
        <p className="font-display text-[16px] text-[#71717a] mb-8 max-w-lg">
          The requested page could not be located on this server. If you are an automated AI agent or developer, you can recover via the machine-readable links below.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link href="/">
            <ButtonPrimary className="h-10 px-5 text-[13px]">
              BACK TO HOME
            </ButtonPrimary>
          </Link>
          <Link href="/docs">
            <ButtonOutline className="h-10 px-5 text-[13px]">
              DOCUMENTATION
            </ButtonOutline>
          </Link>
          <Link href="/openapi.json">
            <ButtonOutline className="h-10 px-5 text-[13px] font-mono">
              OPENAPI SPEC
            </ButtonOutline>
          </Link>
        </div>

        {/* Agent & Crawler Recovery Index Grid */}
        <div className="w-full max-w-2xl bg-[#fafafa] border border-[#ebebeb] rounded-[4px] p-6 text-left space-y-4">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717a] block font-medium">
            DIRECTORY & AGENT DISCOVERY MAP
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-display text-[14px]">
            <Link href="/llms.txt" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/llms.txt</span>
              <span className="text-[12px] text-[#71717a]">Machine-readable LLM sitemap</span>
            </Link>
            <Link href="/openapi.json" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/openapi.json</span>
              <span className="text-[12px] text-[#71717a]">OpenAPI 3.1.0 JSON specification</span>
            </Link>
            <Link href="/mcp.json" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/mcp.json</span>
              <span className="text-[12px] text-[#71717a]">Model Context Protocol manifest</span>
            </Link>
            <Link href="/sitemap.xml" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/sitemap.xml</span>
              <span className="text-[12px] text-[#71717a]">XML search engine sitemap</span>
            </Link>
            <Link href="/features" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/features</span>
              <span className="text-[12px] text-[#71717a]">Feature breakdown & architecture</span>
            </Link>
            <Link href="/alternatives" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/alternatives</span>
              <span className="text-[12px] text-[#71717a]">Competitor comparison matrix</span>
            </Link>
            <Link href="/integrations" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/integrations</span>
              <span className="text-[12px] text-[#71717a]">Framework & Workers guides</span>
            </Link>
            <Link href="/tools" className="p-2.5 bg-white border border-[#ebebeb] rounded hover:border-black transition-colors">
              <span className="font-medium text-black block">/tools</span>
              <span className="text-[12px] text-[#71717a]">Free interactive developer utilities</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t border-[#ebebeb] text-center text-[#71717a] font-display text-[12px]">
        Analytics by Sufyaan Studio • Privacy-first, cookie-free web metrics.
      </footer>
    </div>
  );
}
