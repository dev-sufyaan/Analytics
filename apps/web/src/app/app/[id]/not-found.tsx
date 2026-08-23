import Link from 'next/link';
import { ButtonPrimary } from '@analytics/ui';

export default function SiteNotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12 text-center">
      <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">WEBSITE NOT FOUND</span>
      <h1 className="font-display text-[28px] font-medium text-black mb-2">This website isn’t available</h1>
      <p className="font-display text-[14px] text-[#71717a] mb-6">It may have been deleted or you don’t have access.</p>
      <Link href="/app"><ButtonPrimary>GO TO MY SITES</ButtonPrimary></Link>
    </div>
  );
}
