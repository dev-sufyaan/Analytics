/**
 * Analytics by Sufyaan Studio — How-To & Tutorial Guides Data Catalog
 */

export interface HowToStep {
  name: string;
  text: string;
  code?: string;
  language?: string;
}

export interface HowToGuide {
  slug: string;
  title: string;
  description: string;
  directAnswer: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  steps: HowToStep[];
  faq: { question: string; answer: string }[];
}

export const HOW_TO_GUIDES: Record<string, HowToGuide> = {
  'how-to-track-nextjs-spa-without-cookies': {
    slug: 'how-to-track-nextjs-spa-without-cookies',
    title: 'How to Track Next.js App Router Pageviews Without Cookies',
    description: 'A step-by-step developer tutorial for tracking Next.js 14/15 App Router applications without cookies or consent banners.',
    directAnswer:
      'To track Next.js App Router pageviews without cookies, add the 1.15 KB Analytics script to your root app/layout.tsx using next/script with strategy="afterInteractive". The script automatically hooks into history.pushState and history.replaceState to track client-side route changes seamlessly.',
    readTime: '3 min read',
    publishedAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Engineering',
    steps: [
      {
        name: 'Step 1: Obtain your Website UUID',
        text: 'Sign in to Analytics by Sufyaan Studio, click "Create Website", and copy your unique website UUID.',
      },
      {
        name: 'Step 2: Add Script to app/layout.tsx',
        text: 'Import the Script component from next/script and insert the lightweight tracking script into the <head> of your root layout.',
        language: 'tsx',
        code: `// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          src="https://analytics.sufyaan.studio/t.js"
          data-web="YOUR_WEBSITE_ID"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
      },
      {
        name: 'Step 3: Verify Route Navigation in DevTools',
        text: 'Open your browser Developer Tools (F12) -> Network tab, filter by /c, and navigate between pages in your Next.js application. You will see instant 204 No Content beacon responses for each client route change.',
      },
    ],
    faq: [
      {
        question: 'Does this track Next.js route transitions with useParams or searchParams?',
        answer: 'Yes! Any URL change triggered by next/link or useRouter().push() is automatically recorded.',
      },
    ],
  },

  'how-to-track-custom-conversion-events': {
    slug: 'how-to-track-custom-conversion-events',
    title: 'How to Track Custom Conversion Events & E-commerce Goals',
    description: 'Learn how to dispatch custom conversion events, signup milestones, and checkout revenue using window.analytics.track().',
    directAnswer:
      'Dispatch custom conversion events in your JavaScript frontend by calling window.analytics.track(eventName, properties). Event names can be up to 128 characters, and the optional properties payload supports up to 2 KB of structured JSON metadata.',
    readTime: '4 min read',
    publishedAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Engineering',
    steps: [
      {
        name: 'Step 1: Track Simple Button Clicks',
        text: 'Call window.analytics.track() directly in your button click handler.',
        language: 'javascript',
        code: `// Button Click
const ctaBtn = document.getElementById('pricing-cta');
ctaBtn.addEventListener('click', () => {
  window.analytics?.track('pricing_cta_clicked');
});`,
      },
      {
        name: 'Step 2: Attach Custom JSON Metadata',
        text: 'Send rich contextual properties such as subscription tiers, currency, and referral source.',
        language: 'javascript',
        code: `// Signup with Metadata
window.analytics?.track('user_registered', {
  plan: 'pro_annual',
  tier: 'business',
  amount: 240,
  currency: 'USD'
});`,
      },
      {
        name: 'Step 3: View Events in Realtime Dashboard',
        text: 'Navigate to your Analytics dashboard -> Events panel to view live event counts, breakdown by properties, and conversion trends.',
      },
    ],
    faq: [
      {
        question: 'Are event payloads sanitized against formula injection?',
        answer: 'Yes. Our server-side ingestion rejects event names starting with formula trigger characters (=, +, -, @) to prevent CSV formula injection.',
      },
    ],
  },

  'how-to-track-utm-campaign-channels': {
    slug: 'how-to-track-utm-campaign-channels',
    title: 'How to Track UTM Marketing Campaigns & Ad Click IDs',
    description: 'A complete guide to tracking Google Ads, Facebook Ads, newsletters, and social campaigns with automatic UTM parsing.',
    directAnswer:
      'To track UTM marketing campaigns, simply add standard UTM parameters (utm_source, utm_medium, utm_campaign) to your inbound links. Analytics by Sufyaan Studio automatically parses and indexes these parameters on page load with zero custom code required.',
    readTime: '3 min read',
    publishedAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Engineering',
    steps: [
      {
        name: 'Step 1: Construct your Tagged URL',
        text: 'Add standard query parameters to your destination URL.',
        language: 'text',
        code: `https://yourdomain.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale&utm_content=headline_a`,
      },
      {
        name: 'Step 2: Let the Tracker Capture Inbound Links',
        text: 'When a visitor arrives at your tagged URL, the tracker forwards the query string to our edge ingest endpoint.',
      },
      {
        name: 'Step 3: View Top Channels on Dashboard',
        text: 'Open your dashboard -> Channels panel to filter by source, medium, and campaign performance over time.',
      },
    ],
    faq: [
      {
        question: 'Which ad platform click IDs are automatically recognized?',
        answer: 'We auto-capture gclid (Google), fbclid (Meta/Facebook), msclkid (Microsoft/Bing), ttclid (TikTok), li_fat_id (LinkedIn), and twclid (X/Twitter).',
      },
    ],
  },

  'how-to-achieve-gdpr-compliance-without-cookie-banners': {
    slug: 'how-to-achieve-gdpr-compliance-without-cookie-banners',
    title: 'How to Achieve 100% GDPR Compliance Without Cookie Banners',
    description: 'Learn the legal and technical requirements for removing intrusive cookie consent popups from your website.',
    directAnswer:
      'Under the EU ePrivacy Directive and GDPR, websites are exempt from displaying cookie consent banners if they do not store persistent client cookies, do not track users across websites, and do not process personal data like raw IP addresses. Analytics by Sufyaan Studio meets all exemption criteria out of the box.',
    readTime: '5 min read',
    publishedAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Legal & Privacy Team',
    steps: [
      {
        name: 'Step 1: Eliminate Tracking Cookies',
        text: 'Replace cookie-based analytics scripts (like GA4 or Facebook Pixel) with Analytics by Sufyaan Studio.',
      },
      {
        name: 'Step 2: Drop Raw IP Logging',
        text: 'Ensure visitor identifiers are generated using daily-salted cryptographic hashes and that raw IPs are dropped at the edge.',
      },
      {
        name: 'Step 3: Remove the Cookie Consent Banner',
        text: 'With zero non-essential cookies and zero PII processing, remove your cookie banner plugin and enjoy faster page load speeds.',
      },
    ],
    faq: [
      {
        question: 'Do I still need a Privacy Policy page?',
        answer: 'Yes. You should always maintain a standard Privacy Policy explaining that you use privacy-friendly, cookie-free analytics to measure site traffic anonymously.',
      },
    ],
  },

  'how-to-send-server-side-events-from-nodejs-and-python': {
    slug: 'how-to-send-server-side-events-from-nodejs-and-python',
    title: 'How to Send Server-Side Analytics Events via REST API',
    description: 'Send custom conversion events directly from Node.js, Python, Go, or PHP backend servers to our edge ingest endpoint.',
    directAnswer:
      'Send server-side events by issuing a POST request to https://analytics.sufyaan.studio/c with a JSON payload containing w (website UUID), n (event name), u (path), and optional p (JSON properties).',
    readTime: '4 min read',
    publishedAt: '2026-04-05T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Engineering',
    steps: [
      {
        name: 'Step 1: Node.js / Express Implementation',
        text: 'Send a fetch request from your backend server or webhook receiver.',
        language: 'javascript',
        code: `async function trackBackendEvent(websiteId, eventName, path, properties = {}) {
  await fetch('https://analytics.sufyaan.studio/c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      w: websiteId,
      n: eventName,
      u: path,
      p: properties
    })
  });
}

// Example:
await trackBackendEvent('YOUR_WEBSITE_ID', 'stripe_subscription_created', '/checkout', {
  plan: 'enterprise',
  amount: 499
});`,
      },
      {
        name: 'Step 2: Python / Django / FastAPI Implementation',
        text: 'Use the requests or httpx library in Python.',
        language: 'python',
        code: `import requests

def track_event(website_id: str, event_name: str, path: str, properties: dict = None):
    payload = {
        "w": website_id,
        "n": event_name,
        "u": path,
        "p": properties or {}
    }
    requests.post("https://analytics.sufyaan.studio/c", json=payload, timeout=2)

# Example:
track_event("YOUR_WEBSITE_ID", "api_key_generated", "/settings/api", {"scope": "read_write"})`,
      },
    ],
    faq: [
      {
        question: 'What is the server response for ingested events?',
        answer: 'Our Cloudflare edge worker returns HTTP 204 No Content on successful validation.',
      },
    ],
  },

  'how-to-track-cloudflare-workers-edge-analytics': {
    slug: 'how-to-track-cloudflare-workers-edge-analytics',
    title: 'How to Track Traffic and APIs on Cloudflare Workers',
    description: 'A developer guide to server-side analytics, subrequest tracking, and HTMLRewriter script injection on Cloudflare Workers and Pages.',
    directAnswer:
      'To track traffic on Cloudflare Workers, send an asynchronous POST subrequest to https://analytics-collect.sufyaanstudio.workers.dev/api/send inside ctx.waitUntil(), or use HTMLRewriter to inject the 1.15 KB tracker into outgoing HTML responses.',
    readTime: '3 min read',
    publishedAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    author: 'Sufyaan Studio Engineering',
    steps: [
      {
        name: 'Step 1: Non-Blocking Subrequest via ctx.waitUntil',
        text: 'In your Cloudflare Worker fetch handler, invoke ctx.waitUntil() to dispatch the pageview without adding any response latency.',
        language: 'typescript',
        code: `export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const response = await fetch(request);
    const url = new URL(request.url);

    ctx.waitUntil(
      fetch('https://analytics-collect.sufyaanstudio.workers.dev/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          w: env.ANALYTICS_WEBSITE_ID,
          u: url.pathname + url.search,
          r: request.headers.get('Referer') || '',
        }),
      })
    );

    return response;
  }
};`,
      },
      {
        name: 'Step 2: Add Website UUID Secret in Wrangler',
        text: 'Save your website UUID to your Cloudflare Worker configuration.',
        language: 'bash',
        code: `npx wrangler secret put ANALYTICS_WEBSITE_ID`,
      },
      {
        name: 'Step 3: Monitor Ingestion in Live Realtime Dashboard',
        text: 'Open your Analytics dashboard to observe real-time pageviews and geographic distribution instantly.',
      },
    ],
    faq: [
      {
        question: 'Can I track both API endpoints and webpage visits with Cloudflare Workers?',
        answer: 'Yes! You can record server-side API requests, webhook deliveries, and frontend pageviews with the same unified website UUID.',
      },
    ],
  },
};
