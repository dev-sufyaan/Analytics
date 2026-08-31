import type { Metadata } from 'next';
import { SITE_CONFIG } from './seo-config';

interface BuildMetadataParams {
  title: string | { absolute: string };
  description?: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
}

/**
 * Builds standard, canonical metadata for Next.js App Router pages.
 * Ensures consistent canonical URLs, Open Graph, Twitter cards, and crawler directives.
 */
export function buildMetadata({
  title,
  description = SITE_CONFIG.defaultDescription,
  path,
  image = '/logo.png',
  noIndex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  keywords,
}: BuildMetadataParams): Metadata {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = cleanPath === '/' ? SITE_CONFIG.baseUrl : `${SITE_CONFIG.baseUrl}${cleanPath}`;
  const ogImageUrl = image.startsWith('http') ? image : `${SITE_CONFIG.baseUrl}${image}`;
  const resolvedTitle = typeof title === 'string' ? title : title.absolute;
  const titleTemplate = typeof title === 'string' ? undefined : { absolute: title.absolute };

  const allKeywords = Array.from(
    new Set([...(keywords || []), ...SITE_CONFIG.keywords])
  );

  return {
    applicationName: SITE_CONFIG.name,
    appleWebApp: {
      title: SITE_CONFIG.name,
      capable: true,
      statusBarStyle: 'default',
    },
    title: titleTemplate ?? resolvedTitle,
    description,
    keywords: allKeywords,
    metadataBase: new URL(SITE_CONFIG.baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      locale: 'en_US',
      alternateLocale: ['en_GB', 'en_CA', 'en_AU', 'en_IN', 'en_IE', 'en_NZ', 'en_SG', 'de_DE', 'fr_FR'],
      type,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: resolvedTitle,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authors ? { authors } : {}),
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon.png', sizes: '32x32', type: 'image/png' },
        { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: [ogImageUrl],
    },
  };
}
