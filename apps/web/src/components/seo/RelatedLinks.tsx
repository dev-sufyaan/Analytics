import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, BookOpen, Wrench, Layers } from 'lucide-react';
import { COMPETITORS_DATA, FEATURES_DATA, USE_CASES_DATA, INTEGRATIONS_DATA } from '@/lib/seo/marketing-data';
import { HOW_TO_GUIDES } from '@/lib/seo/how-to-data';
import { TOOLS_DATA } from '@/lib/seo/tools-data';

export function RelatedLinks({
  currentSlug,
  type,
}: {
  currentSlug?: string;
  type?: 'competitor' | 'feature' | 'integration' | 'how-to' | 'tool' | 'use-case';
}) {
  const competitors = Object.values(COMPETITORS_DATA).filter((c) => c.slug !== currentSlug).slice(0, 4);
  const features = Object.values(FEATURES_DATA).filter((f) => f.slug !== currentSlug).slice(0, 4);
  const guides = Object.values(HOW_TO_GUIDES).filter((g) => g.slug !== currentSlug).slice(0, 3);
  const tools = Object.values(TOOLS_DATA).filter((t) => t.slug !== currentSlug).slice(0, 3);

  return (
    <div className="border-t border-[#ebebeb] pt-12 mt-16 space-y-12">
      <div>
        <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">
          EXPLORE MORE COMPARISONS & ALTERNATIVES
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {competitors.map((c) => (
            <Link
              key={c.slug}
              href={`/alternatives/${c.slug}`}
              className="p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] hover:border-black transition-colors block group"
            >
              <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">VS {c.name}</span>
              <h4 className="font-display text-[15px] font-medium text-black group-hover:underline flex items-center justify-between">
                <span>{c.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#999999] group-hover:text-black transition-colors" />
              </h4>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-black" />
            <span>CORE FEATURES</span>
          </span>
          <ul className="space-y-2 font-display text-[14px]">
            {features.map((f) => (
              <li key={f.slug}>
                <Link href={`/features/${f.slug}`} className="text-black hover:underline flex items-center justify-between py-1 border-b border-[#ebebeb]/60">
                  <span className="truncate">{f.title}</span>
                  <ArrowRight className="w-3 h-3 text-[#999999] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-black" />
            <span>DEVELOPER GUIDES</span>
          </span>
          <ul className="space-y-2 font-display text-[14px]">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/how-to/${g.slug}`} className="text-black hover:underline flex items-center justify-between py-1 border-b border-[#ebebeb]/60">
                  <span className="truncate">{g.title}</span>
                  <ArrowRight className="w-3 h-3 text-[#999999] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-black" />
            <span>FREE DEVELOPER TOOLS</span>
          </span>
          <ul className="space-y-2 font-display text-[14px]">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className="text-black hover:underline flex items-center justify-between py-1 border-b border-[#ebebeb]/60">
                  <span className="truncate">{t.name}</span>
                  <ArrowRight className="w-3 h-3 text-[#999999] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
