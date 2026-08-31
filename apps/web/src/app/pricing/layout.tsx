import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, honest privacy-first analytics pricing. Start free with 25,000 monthly events, 30-day raw retention, and public dashboards. High-volume tiers coming soon.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing · Analytics',
    siteName: 'Analytics',
    description:
      'Simple, honest privacy-first analytics pricing. Free forever core plan, with high-volume tiers coming soon.',
    url: '/pricing',
  },
  robots: { index: true, follow: true },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
