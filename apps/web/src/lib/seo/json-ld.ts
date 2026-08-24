import { SITE_CONFIG } from './seo-config';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.baseUrl,
    logo: `${SITE_CONFIG.baseUrl}/logo.png`,
    image: `${SITE_CONFIG.baseUrl}/logo.png`,
    description: SITE_CONFIG.entityStatement,
    sameAs: [
      SITE_CONFIG.socialHandles.github,
      SITE_CONFIG.socialHandles.twitter,
      SITE_CONFIG.socialHandles.linkedin,
    ],
  };
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.baseUrl,
    description: SITE_CONFIG.defaultDescription,
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.baseUrl,
      logo: `${SITE_CONFIG.baseUrl}/logo.png`,
    },
  };
}

export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_CONFIG.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'All',
    image: `${SITE_CONFIG.baseUrl}/logo.png`,
    screenshot: `${SITE_CONFIG.baseUrl}/opengraph-image`,
    description: SITE_CONFIG.entityStatement,
    offers: [
      {
        '@type': 'Offer',
        name: 'Community Free Plan',
        price: '0',
        priceCurrency: 'USD',
        description: 'Up to 25,000 monthly events, 30 days granular raw retention, permanent daily aggregates, public share links, cookie-free & 100% GDPR compliant.',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro Scale Plan',
        price: '9',
        priceCurrency: 'USD',
        description: 'Up to 250,000 monthly events, 1-year raw retention, unlimited websites, CSV exports, priority edge routing.',
        availability: 'https://schema.org/InStock',
      },
    ],
  };
}

export function getFaqSchema(faq: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_CONFIG.baseUrl,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.baseUrl}${item.url}`,
      })),
    ],
  };
}

export function getItemListSchema(title: string, items: { name: string; url: string; description?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.baseUrl}${item.url}`,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function getHowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string; code?: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.code ? { text: `${step.text} Example:\n${step.code}` } : {}),
    })),
  };
}
