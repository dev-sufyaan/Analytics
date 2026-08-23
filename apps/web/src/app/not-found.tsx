import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonPrimary, ButtonOutline } from '@analytics/ui';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">404 · NOT FOUND</span>
      <h1 className="font-display text-[32px] font-medium text-black mb-2">Page not found</h1>
      <p className="font-display text-[15px] text-[#71717a] mb-6 max-w-md">The page you’re looking for doesn’t exist or you don’t have access to it.</p>
      <div className="flex gap-3">
        <Link href="/app"><ButtonPrimary>GO TO DASHBOARD</ButtonPrimary></Link>
        <Link href="/"><ButtonOutline>HOME</ButtonOutline></Link>
      </div>
    </div>
  );
}
