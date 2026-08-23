import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Install Analytics on Next.js, React, Vue, SvelteKit, Astro, WordPress, and more. Cookie-free, one script tag, full event-tracking API reference.',
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'Documentation · Analytics by Sufyaan Studio',
    description:
      'Integration guides and the event-tracking API for Analytics — privacy-first, one script tag, zero cookie consent.',
    url: '/docs',
  },
  robots: { index: true, follow: true },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
