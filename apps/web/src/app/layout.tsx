import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://analytics.sufyaan.studio';

const TITLE = 'Analytics by Sufyaan Studio — Privacy-First Website Analytics';
const DESCRIPTION =
  'Simple privacy-first analytics. No cookies. No fingerprint theatre. A dashboard you actually enjoy opening. Built by Sufyaan Studio.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Analytics by Sufyaan Studio',
  title: {
    default: TITLE,
    template: '%s · Analytics by Sufyaan Studio',
  },
  description: DESCRIPTION,
  keywords: [
    'privacy-first analytics',
    'cookie-free analytics',
    'website analytics',
    'GDPR compliant analytics',
    'Umami alternative',
    'Plausible alternative',
    'lightweight analytics',
    'edge ingest analytics',
    'Sufyaan Studio',
  ],
  authors: [{ name: 'Sufyaan Studio' }],
  creator: 'Sufyaan Studio',
  publisher: 'Sufyaan Studio',
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Analytics by Sufyaan Studio',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export const viewport: Viewport = {
  themeColor: '#010120',
  colorScheme: 'light',
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sufyaan Studio',
    url: SITE_URL,
    description: 'Independent studio behind Analytics — a privacy-first website analytics product.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Analytics by Sufyaan Studio',
    url: SITE_URL,
    inLanguage: 'en',
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-white text-black min-h-screen selection:bg-[#c8f6f9] selection:text-black">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
