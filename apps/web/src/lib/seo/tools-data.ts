/**
 * Analytics by Sufyaan Studio — Free Interactive Developer Tools Catalog
 */

export interface ToolData {
  slug: string;
  name: string;
  title: string;
  subtitle: string;
  directAnswer: string;
  description: string;
  metaDescription: string;
  iconName: string;
  category: 'Performance' | 'Marketing' | 'Compliance';
  features: string[];
  faq: { question: string; answer: string }[];
  updatedAt: string;
}

export const TOOLS_DATA: Record<string, ToolData> = {
  'ga4-speed-calculator': {
    slug: 'ga4-speed-calculator',
    name: 'GA4 Page Speed & Payload Impact Calculator',
    title: 'Google Analytics 4 vs Lightweight Analytics Speed Calculator',
    subtitle: 'Calculate how much JavaScript bundle bloat and page load delay GA4 adds to your website.',
    directAnswer:
      'The GA4 Speed Impact Calculator reveals that replacing Google Analytics 4 (45 KB) with Analytics by Sufyaan Studio (1.15 KB) eliminates ~43.85 KB of render-blocking JavaScript, saves up to 180ms in main-thread CPU execution time, and boosts mobile Google Lighthouse scores by 4 to 8 points.',
    description:
      'Calculate the real-world performance cost of running Google Analytics 4 on your website. Estimate bandwidth savings across your monthly visitors and see the impact on Core Web Vitals (LCP, INP, CLS).',
    metaDescription: 'Free GA4 Page Speed & Payload Impact Calculator: See how much bandwidth and CPU execution time you save by ditching heavy 45 KB GA4 scripts.',
    iconName: 'Zap',
    category: 'Performance',
    features: [
      'Interactive visitor volume slider (1k to 10M visitors/month).',
      'Real-time bandwidth savings calculator in Megabytes and Gigabytes.',
      'Main-thread JavaScript execution time reduction estimator.',
      'Core Web Vitals impact breakdown (LCP, INP, FID).',
    ],
    faq: [
      {
        question: 'How big is the GA4 script really?',
        answer: 'The core gtag.js loader is ~45 KB gzipped, and with Google Tag Manager containers and additional advertising tags, it frequently exceeds 100 KB.',
      },
      {
        question: 'How does script size affect mobile visitors?',
        answer: 'On low-power mobile devices and 4G networks, parsing and executing 45 KB of JavaScript can take 200–500ms of CPU time, delaying interactive elements and hurting your search ranking.',
      },
    ],
    updatedAt: '2026-08-24T00:00:00.000Z',
  },

  'utm-campaign-builder': {
    slug: 'utm-campaign-builder',
    name: 'UTM Campaign URL Builder & Validator',
    title: 'Clean UTM URL Campaign Builder & Parameter Validator',
    subtitle: 'Generate clean, error-free marketing URLs for Google Ads, Facebook Ads, newsletters, and social posts.',
    directAnswer:
      'The UTM Campaign Builder allows you to format and validate inbound URLs with utm_source, utm_medium, utm_campaign, utm_content, and utm_term parameters. Generated URLs are automatically parsed and attributed in Analytics by Sufyaan Studio.',
    description:
      'Build standardized marketing URLs that track campaign performance cleanly. Automatically convert uppercase strings to lowercase, remove illegal query characters, and test URL encoding.',
    metaDescription: 'Free UTM Campaign URL Builder: Build and validate clean campaign URLs with utm_source, utm_medium, utm_campaign, and click IDs.',
    iconName: 'Sparkles',
    category: 'Marketing',
    features: [
      'One-click presets for Twitter/X, LinkedIn, Google Ads, Facebook, Substack, and Reddit.',
      'Instant syntax validation and lowercase normalization.',
      'Live one-click URL copy and QR code preview.',
      'Automatic integration with Analytics by Sufyaan Studio Channels panel.',
    ],
    faq: [
      {
        question: 'What are the required UTM parameters?',
        answer: 'utm_source (e.g. twitter, google, newsletter) is essential. utm_medium (e.g. social, cpc, email) and utm_campaign (e.g. spring_launch) provide crucial context.',
      },
    ],
    updatedAt: '2026-08-24T00:00:00.000Z',
  },

  'gdpr-cookie-exemption-checker': {
    slug: 'gdpr-cookie-exemption-checker',
    name: 'Cookie Banner & GDPR Exemption Checker',
    title: 'Website Cookie Banner & Privacy Exemption Self-Audit Tool',
    subtitle: 'Check if your website is legally required to show a cookie consent banner under EU GDPR and ePrivacy laws.',
    directAnswer:
      'Under the European ePrivacy Directive, websites that only use cookie-free, anonymized analytics (like Analytics by Sufyaan Studio) with no third-party marketing pixels or persistent identifiers are legally exempt from displaying cookie consent banners.',
    description:
      'Answer 4 simple questions about your tech stack to discover if you can legally remove your cookie banner popup and improve user experience.',
    metaDescription: 'Free Cookie Banner & GDPR Exemption Checker: Audit your website tracking to see if you can legally remove cookie consent banners.',
    iconName: 'Shield',
    category: 'Compliance',
    features: [
      'Interactive 4-step compliance audit.',
      'Instant legal assessment based on GDPR Article 6 and ePrivacy Directive.',
      'Actionable recommendations to achieve 100% cookie banner exemption.',
    ],
    faq: [
      {
        question: 'What makes an analytics tool exempt from cookie banners?',
        answer: 'It must not store or access information on the user device (no cookies or localStorage tracking IDs), must not track across websites, and must anonymize user IP addresses immediately.',
      },
    ],
    updatedAt: '2026-08-24T00:00:00.000Z',
  },
};
