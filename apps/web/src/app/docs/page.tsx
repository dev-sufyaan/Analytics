'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ButtonPrimary,
  ButtonSecondaryWhite,
  CodeEditorMockup,
  Footer,
  FooterWordmarkBanner,
  TextInput,
} from '@analytics/ui';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import {
  Code,
  Zap,
  Globe,
  Layers,
  Terminal,
  Shield,
  Server,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export default function DocsPage() {
  const [selectedFramework, setSelectedFramework] = useState('nextjs');
  const [selectedBackend, setSelectedBackend] = useState('node');

  // Interactive Live Event Generator in Docs
  const [docEventName, setDocEventName] = useState('upgrade_plan_selected');
  const [docPropKey, setDocPropKey] = useState('tier');
  const [docPropVal, setDocPropVal] = useState('enterprise');

  const frameworks: Record<
    string,
    { title: string; badge: string; description: string; code: string; install?: string }
  > = {
    nextjsProxy: {
      title: 'Next.js 1st-Party Proxy (100% Adblocker & Brave Shields Bypass)',
      badge: '100% BYPASS',
      description: 'Serve tracking through your Next.js domain so Brave Shields and uBlock Origin cannot block requests.',
      code: `// next.config.mjs (or next.config.js)
const nextConfig = {
  async rewrites() {
    return [
      { source: '/stats.js', destination: 'https://analytics-collect.sufyaanstudio.workers.dev/t.js' },
      { source: '/api/send', destination: 'https://analytics-collect.sufyaanstudio.workers.dev/c' },
    ];
  },
};
export default nextConfig;

// In app/layout.tsx (App Router) or <head>:
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
/>`,
    },
    nuxtProxy: {
      title: 'Nuxt 3 / Nitro 1st-Party Proxy',
      badge: '100% BYPASS',
      description: 'Proxy tracking via Nuxt routeRules so all beacons stay strictly on your domain.',
      code: `// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/stats.js': { proxy: 'https://analytics-collect.sufyaanstudio.workers.dev/t.js' },
    '/api/send': { proxy: 'https://analytics-collect.sufyaanstudio.workers.dev/c' },
  },
  app: {
    head: {
      script: [
        {
          src: '/stats.js',
          defer: true,
          'data-web': 'YOUR_WEBSITE_ID',
          'data-endpoint': '/api/send'
        }
      ]
    }
  }
});`,
    },
    vercelProxy: {
      title: 'Vercel / React / Vite / Svelte (vercel.json)',
      badge: '100% BYPASS',
      description: 'Add edge rewrites in vercel.json for any frontend framework hosted on Vercel.',
      code: `// vercel.json
{
  "rewrites": [
    { "source": "/stats.js", "destination": "https://analytics-collect.sufyaanstudio.workers.dev/t.js" },
    { "source": "/api/send", "destination": "https://analytics-collect.sufyaanstudio.workers.dev/c" }
  ]
}

<!-- In index.html <head>: -->
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
></script>`,
    },
    netlifyProxy: {
      title: 'Netlify & Cloudflare Pages (_redirects)',
      badge: '100% BYPASS',
      description: 'Drop a 2-line _redirects file into your public folder for 1st-party edge rewrites.',
      code: `# public/_redirects
/stats.js    https://analytics-collect.sufyaanstudio.workers.dev/t.js    200
/api/send    https://analytics-collect.sufyaanstudio.workers.dev/c       200

<!-- In your HTML <head>: -->
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
></script>`,
    },
    astroProxy: {
      title: 'Astro (astro.config.mjs)',
      badge: '100% BYPASS',
      description: 'Configure SSR/SSG redirects in astro.config.mjs for zero adblocker interference.',
      code: `// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  redirects: {
    '/stats.js': 'https://analytics-collect.sufyaanstudio.workers.dev/t.js',
    '/api/send': 'https://analytics-collect.sufyaanstudio.workers.dev/c',
  }
});

<!-- In src/layouts/Layout.astro: -->
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
></script>`,
    },
    nginxProxy: {
      title: 'Nginx / WordPress / Apache / VPS',
      badge: '100% BYPASS',
      description: 'Reverse proxy tracking requests through Nginx for WordPress, PHP, Django, Rails, or custom backends.',
      code: `# nginx.conf
location /stats.js {
    proxy_pass https://analytics-collect.sufyaanstudio.workers.dev/t.js;
    proxy_set_header Host analytics-collect.sufyaanstudio.workers.dev;
    proxy_ssl_server_name on;
}

location /api/send {
    proxy_pass https://analytics-collect.sufyaanstudio.workers.dev/c;
    proxy_set_header Host analytics-collect.sufyaanstudio.workers.dev;
    proxy_ssl_server_name on;
}

<!-- In your HTML or WordPress header.php: -->
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
></script>`,
    },
    cloudflareProxy: {
      title: 'Cloudflare Rules (Shopify, Webflow, Ghost)',
      badge: 'NO-CODE BYPASS',
      description: 'Add Transform/Rewrite Rules in your Cloudflare dashboard for any no-code site on a custom domain.',
      code: `/* Cloudflare Rules -> Transform Rules -> Rewrite URL:
   Rule 1: If URI Path equals "/stats.js" -> Rewrite to "https://analytics-collect.sufyaanstudio.workers.dev/t.js"
   Rule 2: If URI Path equals "/api/send" -> Rewrite to "https://analytics-collect.sufyaanstudio.workers.dev/c"
*/

<!-- In your Webflow/Shopify/Ghost Custom Code Header: -->
<script
  defer
  src="/stats.js"
  data-web="YOUR_WEBSITE_ID"
  data-endpoint="/api/send"
></script>`,
    },
    nextjs: {
      title: 'Next.js (App Router & Pages Router)',
      badge: 'DIRECT',
      description: 'Add the Script component in your root layout for automatic SPA route change tracking.',
      code: `// app/layout.tsx (App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
          data-web="YOUR_WEBSITE_ID"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
    },
    umami: {
      title: 'Umami Drop-in Replacement',
      badge: 'DROP-IN',
      description: 'Migrate seamlessly from Umami without altering your tracking tags or existing window.umami.track() calls.',
      code: `<!-- Umami Drop-in Snippet -->
<script
  defer
  src="https://analytics-collect.sufyaanstudio.workers.dev/script.js"
  data-website-id="YOUR_WEBSITE_ID"
></script>

<!-- Programmatic usage works out of the box: -->
<script>
  window.umami.track('signup', { plan: 'growth' });
</script>`,
    },
    html: {
      title: 'HTML5 / Static Websites & Local Files',
      badge: 'UNIVERSAL',
      description: 'Paste this single script tag into your HTML <head> on all pages. Works on live domains, localhost, and local files.',
      code: `<!-- Add inside the <head> section -->
<script
  defer
  src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
  data-web="YOUR_WEBSITE_ID"
></script>`,
    },
    react: {
      title: 'React + Vite / CRA',
      badge: 'SPA',
      description: 'Embed the tag in your index.html or inject programmatically on app mount.',
      code: `<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Vite App</title>
    <script
      defer
      src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
      data-web="YOUR_WEBSITE_ID"
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    vue: {
      title: 'Vue 3 / Nuxt 3',
      badge: 'SSR / SPA',
      description: 'In Nuxt 3, configure the script in your nuxt.config.ts head options.',
      code: `// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: 'https://analytics-collect.sufyaanstudio.workers.dev/t.js',
          defer: true,
          'data-web': 'YOUR_WEBSITE_ID'
        }
      ]
    }
  }
});`,
    },
    svelte: {
      title: 'SvelteKit / Svelte',
      badge: 'FULL-STACK',
      description: 'Add the script to your src/app.html template inside the <head> element.',
      code: `<!-- src/app.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script
      defer
      src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
      data-web="YOUR_WEBSITE_ID"
    ></script>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>`,
    },
    astro: {
      title: 'Astro',
      badge: 'SSG / SSR',
      description: 'Place the script in your main Layout component or global BaseHead.',
      code: `---
// src/layouts/Layout.astro
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
    <script
      defer
      src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
      data-web="YOUR_WEBSITE_ID"
    ></script>
  </head>
  <body>
    <slot />
  </body>
</html>`,
    },
    remix: {
      title: 'Remix / React Router v7',
      badge: 'FULL-STACK',
      description: 'Include the script inside the root.tsx HTML document.',
      code: `// app/root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <script
          defer
          src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
          data-web="YOUR_WEBSITE_ID"
        />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}`,
    },
    cms: {
      title: 'WordPress, Shopify, Webflow, Ghost',
      badge: 'CMS / NO-CODE',
      description: 'Paste into your theme custom code header or Google Tag Manager.',
      code: `<!-- Custom Code / Header Injection -->
<script
  defer
  src="https://analytics-collect.sufyaanstudio.workers.dev/t.js"
  data-web="YOUR_WEBSITE_ID"
></script>`,
    },

  };

  const backendSnippets: Record<string, { title: string; code: string }> = {
    node: {
      title: 'Node.js / Express',
      code: `// Track backend events or webhook conversions — UTM auto-extracted from q
async function trackEvent(websiteId, eventName, urlPath, queryString = '', properties = {}) {
  await fetch('https://yourdomain.com/c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      w: websiteId,
      n: eventName,                 // 'pageview' or custom name (≤128 chars, no =+-@)
      u: urlPath,                   // '/pricing' — pathname only
      q: queryString,               // '?utm_source=google&utm_medium=cpc&gclid=xyz' — UTMs parsed server-side
      r: 'https://google.com/',     // referrer — host extracted, self-referrals dropped
      t: 'Pricing',                 // title — 512 chars, formula-guarded
      p: properties                 // 2 KB JSON
    })
  });
}

// Example usage:
await trackEvent('YOUR_WEBSITE_ID', '${docEventName}', '/checkout', '?utm_source=google&utm_medium=cpc', {
  ${docPropKey}: '${docPropVal}',
  amount: 240
});`,
    },
    python: {
      title: 'Python / Django / FastAPI',
      code: `import requests

def track_event(website_id: str, event_name: str, url_path: str, query: str = '', props: dict = None):
    payload = {
        "w": website_id,
        "n": event_name,            # 'pageview' or custom (≤128 chars)
        "u": url_path,              # '/pricing'
        "q": query,                 # '?utm_source=google&gclid=xyz' — UTMs auto-parsed
        "r": "https://google.com/", # referrer
        "p": props or {}            # 2 KB JSON
    }
    requests.post("https://yourdomain.com/c", json=payload, timeout=2)

# Example usage:
track_event("YOUR_WEBSITE_ID", "${docEventName}", "/checkout", "?utm_source=google", {"${docPropKey}": "${docPropVal}"})`,
    },
    php: {
      title: 'PHP / Laravel',
      code: `// Laravel Http Client or PHP cURL — UTM via q
use Illuminate\\Support\\Facades\\Http;

Http::timeout(2)->post('https://yourdomain.com/c', [
    'w' => 'YOUR_WEBSITE_ID',
    'n' => '${docEventName}',
    'u' => '/checkout',
    'q' => '?utm_source=google&utm_medium=cpc&gclid=xyz',
    'r' => 'https://google.com/',
    'p' => ['${docPropKey}' => '${docPropVal}']
]);`,
    },
    curl: {
      title: 'cURL / Bash',
      code: `curl -X POST https://yourdomain.com/c \\
  -H "Content-Type: application/json" \\
  -d '{
    "w": "YOUR_WEBSITE_ID",
    "n": "${docEventName}",
    "u": "/checkout",
    "q": "?utm_source=google&utm_medium=cpc&gclid=xyz",
    "r": "https://google.com/",
    "p": {"${docPropKey}": "${docPropVal}"}
  }'`,
    },
  };

  const dynamicJsCode = `// Dispatch in frontend:
window.analytics.track('${docEventName}', {
  ${docPropKey}: '${docPropVal}'
});`;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <SiteHeader forceDark={true} />

      {/* Hero Section */}
      <section className="bg-[#010120] text-white py-16 md:py-20 border-b border-[#26263a]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-3">
              DEVELOPER DOCUMENTATION & API REFERENCE
            </span>
            <h1 className="font-display text-[38px] md:text-[52px] font-medium tracking-[-1px] text-white mb-4">
              Integration & Event API Reference
            </h1>
            <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-zinc-300">
              Complete guides for installing Analytics across modern web frameworks, static sites, local HTML files, and server-side runtimes with zero cookie consent banners.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-12 w-full flex-1">
        <div className="mb-8">
          <AnswerBlock
            title="Developer Documentation Summary"
            directAnswer="Analytics by Sufyaan Studio provides an ultra-lightweight (1.15 KB gzipped), cookie-free JavaScript client and REST API. Install via a single script tag with defer for automatic SPA pageview capture, or use window.analytics.track() for custom conversion events."
            keyTakeaways={[
              'Universal script tag installation in under 2 minutes',
              'Automatic SPA history pushState/replaceState tracking',
              'Full custom event properties API (2 KB JSON payload capacity)',
              'Automatic UTM marketing source and ad click ID attribution',
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Sticky Table of Contents */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div>
                <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">
                  SECTIONS
                </span>
                <ul className="space-y-2 font-display text-[14px] text-[#71717a]">
                  <li>
                    <a href="#quickstart" className="hover:text-black transition-colors block py-1">
                      1. Quickstart (Under 2 Min)
                    </a>
                  </li>
                  <li>
                    <a href="#frameworks" className="hover:text-black transition-colors block py-1">
                      2. Framework Integrations
                    </a>
                  </li>
                  <li>
                    <a href="#custom-events" className="hover:text-black transition-colors block py-1">
                      3. Custom Event Tracking
                    </a>
                  </li>
                  <li>
                    <a href="#interactive-builder" className="hover:text-black transition-colors block py-1">
                      4. Event Code Generator
                    </a>
                  </li>
                  <li>
                    <a href="#event-recipes" className="hover:text-black transition-colors block py-1">
                      5. Common Event Recipes
                    </a>
                  </li>
                  <li>
                    <a href="#server-tracking" className="hover:text-black transition-colors block py-1">
                      6. Server-Side Tracking
                    </a>
                  </li>
                  <li>
                    <a href="#utm-channels" className="hover:text-black transition-colors block py-1">
                      7. UTM & Channel Attribution
                    </a>
                  </li>
                  <li>
                    <a href="#troubleshooting" className="hover:text-black transition-colors block py-1">
                      8. Testing & Troubleshooting
                    </a>
                  </li>
                  <li>
                    <a href="#best-practices" className="hover:text-black transition-colors block py-1">
                      9. Best Practices & CSP
                    </a>
                  </li>
                  <li>
                    <a href="#android-app" className="hover:text-black transition-colors block py-1 font-medium text-black inline-flex items-center gap-1.5">
                      <span>10. Android Mobile App</span>
                      <span className="bg-[#c8f6f9] text-[#010120] font-mono text-[9px] px-1 py-0.5 rounded font-bold uppercase">v2.0</span>
                    </a>
                  </li>
                </ul>
              </div>


              <div className="p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">
                  NEED A WEBSITE ID?
                </span>
                <p className="font-display text-[13px] text-black mb-3">
                  Create your first site in your dashboard to obtain your unique site UUID.
                </p>
                <Link href="/app/sites/new">
                  <span className="font-mono text-[11px] uppercase text-black font-medium hover:underline inline-flex items-center gap-1">
                    <span>CREATE SITE</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Content Stream */}
          <div className="lg:col-span-9 space-y-16">
            {/* 1. Quickstart */}
            <section id="quickstart" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                01 // GETTING STARTED
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                One-Line Quickstart
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Add the lightweight script tag inside the <code className="bg-[#f2f2f2] px-1.5 py-0.5 rounded font-mono text-[13px] text-black">&lt;head&gt;</code> of your website. The script runs asynchronously, weighs 1.15 KB gzipped (≤1.5 KB budget, 0 dependencies), and does not block page rendering. Uses <code className="font-mono text-[12px] bg-[#f2f2f2] px-1 py-0.5 rounded">sendBeacon</code> → <code className="font-mono text-[12px] bg-[#f2f2f2] px-1 py-0.5 rounded">fetch(keepalive)</code> fallback.
              </p>

              <CodeEditorMockup
                code={`<script
  defer
  src="https://yourdomain.com/t.js"
  data-web="13921d15-5a3b-4b3d-ae89-b49255ee3381"
></script>`}
                title="UNIVERSAL HTML SNIPPET"
              />

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">REQUIRED</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-web</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Your website UUID. Pageviews auto-tracked, SPA via pushState.</p>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">OPTIONAL</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-host</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Custom collector origin. Defaults to script origin + <code className="font-mono text-[11px]">/c</code>.</p>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">OPTIONAL</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-dev="true"</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Allow <code className="font-mono text-[11px]">localhost</code> / <code className="font-mono text-[11px]">127.0.0.1</code> / <code className="font-mono text-[11px]">*.local</code>.</p>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">OPTIONAL</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-respect-dnt="true"</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Honor <code className="font-mono text-[11px]">navigator.doNotTrack=1</code>.</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] text-[#71717a]">
                Auto-captured per pageview: <span className="text-black">url (pathname)</span> + <span className="text-black">query (?utm_*)</span> + <span className="text-black">referrer</span> + <span className="text-black">title</span> + <span className="text-black">screen</span> + <span className="text-black">language</span> + <span className="text-black">hostname</span>. UTM/click-IDs extracted server-side, referrer self-check drops your own domain.
              </div>
            </section>

            {/* 2. Framework Integrations */}
            <section id="frameworks" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                02 // FRAMEWORKS & LANGUAGES
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Frontend Framework Integrations
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Select your framework to view tailored copy-paste implementation snippets.
              </p>

              {/* Framework Selector Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-[#ebebeb]">
                {Object.entries(frameworks).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedFramework(key)}
                    className={`px-3.5 py-1.5 font-mono text-[12px] uppercase rounded-[3.25px] transition-colors cursor-pointer ${
                      selectedFramework === key
                        ? 'bg-black text-white font-medium'
                        : 'bg-[#f7f7f7] text-[#71717a] hover:text-black hover:bg-[#ececec]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Active Framework Content */}
              <div className="bg-white border border-[#ebebeb] rounded-[4px] p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-[20px] font-medium text-black">
                    {frameworks[selectedFramework].title}
                  </h3>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[2px] bg-black text-white">
                    {frameworks[selectedFramework].badge}
                  </span>
                </div>
                <p className="font-display text-[14px] text-[#71717a] mb-4">
                  {frameworks[selectedFramework].description}
                </p>
                <CodeEditorMockup
                  code={frameworks[selectedFramework].code}
                  title={`${selectedFramework.toUpperCase()} IMPLEMENTATION`}
                />
              </div>
            </section>

            {/* 3. Custom Event Tracking */}
            <section id="custom-events" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                03 // EVENT TRACKING API
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Custom Events & Conversion Tracking
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Track custom user interactions like signup buttons, modal triggers, billing tier upgrades, and checkout completions using <code className="font-mono text-[13px] bg-[#f2f2f2] px-1.5 py-0.5 rounded text-black">window.analytics.track()</code>.
              </p>

              <div className="space-y-6">
                <CodeEditorMockup
                  title="EVENT TRACKING API SYNTAX"
                  code={`// Signature:
// window.analytics.track(eventName: string, properties?: Record<string, any>)

// 1. Basic Button Click Event:
window.analytics.track('pricing_cta_clicked');

// 2. Custom Conversion Event with Metadata:
window.analytics.track('user_signed_up', {
  plan: 'pro_monthly',
  source: 'header_banner',
  currency: 'USD',
  amount: 29
});

// 3. E-commerce Checkout Completed:
window.analytics.track('purchase_success', {
  order_id: 'ord_987654',
  items_count: 3,
  value: 149.50
});`}
                />

                <div className="p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[15px] font-medium text-black mb-2">
                    Event Validation & Payload Limits (server-enforced):
                  </h4>
                  <ul className="space-y-1.5 font-display text-[13px] text-[#71717a]">
                    <li>• <strong>Name limit:</strong> 128 chars (trimmed, <code className="font-mono text-[11px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">p_event_name</code>). Names starting with <code className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded">= + - @</code> rejected (CSV injection guard).</li>
                    <li>• <strong>Properties payload:</strong> 2 KB JSON (`pg_column_size` cap) — objects kept, arrays/scalars wrapped as <code className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded">{`{value: ...}`}</code>, oversized truncated server-side.</li>
                    <li>• <strong>Path/Title/Query caps:</strong> 1024 / 512 / 512 chars. Bot User-Agents dropped, empty UA dropped.</li>
                    <li>• <strong>Dedupe:</strong> Identical payload within 1s (client) + same-path pageview within 1s (server, only if last event was pageview) debounced.</li>
                    <li>• <strong>Queue:</strong> 200 ms batch window, max 10 events/request, <code className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded">sendBeacon</code> → <code className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded">fetch keepalive</code>, flushed on <code className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded">visibilitychange/pagehide</code>.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Interactive Live Event Code Generator */}
            <section id="interactive-builder" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                04 // INTERACTIVE GENERATOR
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Generate Custom Event Code
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Enter your event details to generate live snippets in JavaScript, Node.js, Python, PHP, and cURL.
              </p>

              <div className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextInput
                    label="EVENT NAME"
                    value={docEventName}
                    onChange={(e) => setDocEventName(e.target.value)}
                  />
                  <TextInput
                    label="PROPERTY KEY"
                    value={docPropKey}
                    onChange={(e) => setDocPropKey(e.target.value)}
                  />
                  <TextInput
                    label="PROPERTY VALUE"
                    value={docPropVal}
                    onChange={(e) => setDocPropVal(e.target.value)}
                  />
                </div>

                <CodeEditorMockup code={dynamicJsCode} title="CLIENT JAVASCRIPT CODE" />
              </div>
            </section>

            {/* 5. Common Event Recipes */}
            <section id="event-recipes" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                05 // READY-TO-USE RECIPES
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Common Tracking Recipes
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Plug-and-play patterns for tracking clicks, forms, scroll depth, and modal engagement.
              </p>

              <div className="space-y-6">
                <CodeEditorMockup
                  title="CLICK & SCROLL DEPTH TRACKING"
                  code={`// 1. Track all button clicks automatically:
document.querySelectorAll('button, .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    window.analytics?.track('button_click', {
      text: btn.innerText.trim(),
      id: btn.id || null
    });
  });
});

// 2. Track scroll depth milestones (25%, 50%, 75%, 100%):
let maxScroll = 0;
window.addEventListener('scroll', () => {
  const depth = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
  [25, 50, 75, 100].forEach(milestone => {
    if (depth >= milestone && maxScroll < milestone) {
      maxScroll = milestone;
      window.analytics?.track('scroll_depth', { percent: milestone });
    }
  });
});

// 3. Track modal open & close:
function openModal(modalName) {
  window.analytics?.track('modal_opened', { modal: modalName });
}`}
                />
              </div>
            </section>

            {/* 6. Server-Side Tracking */}
            <section id="server-tracking" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                06 // BACKEND & API
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Server-Side Event Ingestion
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Send events from your backend, webhooks, CLI tools, or serverless workers by sending a <code className="font-mono text-[13px] bg-[#f2f2f2] px-1.5 py-0.5 rounded text-black">POST /c</code> request.
              </p>

              <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-[#ebebeb]">
                {Object.entries(backendSnippets).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedBackend(key)}
                    className={`px-3.5 py-1.5 font-mono text-[12px] uppercase rounded-[3.25px] transition-colors cursor-pointer ${
                      selectedBackend === key
                        ? 'bg-black text-white font-medium'
                        : 'bg-[#f7f7f7] text-[#71717a] hover:text-black hover:bg-[#ececec]'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              <CodeEditorMockup
                code={backendSnippets[selectedBackend].code}
                title={`${selectedBackend.toUpperCase()} SERVER EXAMPLE`}
              />
              <div className="mt-4 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] text-[#71717a]">
                <span className="text-black font-medium">Payload keys:</span> <code className="bg-white border border-[#ebebeb] px-1 py-0.5 rounded text-black">w</code> website UUID, <code className="bg-white border px-1 py-0.5 rounded text-black">n</code> event name (null=pageview), <code className="bg-white border px-1 py-0.5 rounded text-black">u</code> pathname, <code className="bg-white border px-1 py-0.5 rounded text-black">q</code> query (UTMs auto-parsed → <code className="bg-white border px-1 py-0.5 rounded text-black">utm_source</code> etc), <code className="bg-white border px-1 py-0.5 rounded text-black">r</code> referrer (host+path extracted, self dropped), <code className="bg-white border px-1 py-0.5 rounded text-black">t</code> title, <code className="bg-white border px-1 py-0.5 rounded text-black">p</code> JSON props (2 KB). Server IP/UA/Country derived from headers (11 headers, CIDR block via <code className="bg-white border px-1 py-0.5 rounded text-black">IGNORE_IP</code>), hostname from <code className="bg-white border px-1 py-0.5 rounded text-black">Origin/Referer</code>.
              </div>
            </section>

            {/* 7. UTM & Channel Attribution */}
            <section id="utm-channels" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                07 // UTM & CHANNEL ATTRIBUTION
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                UTM & Channel Attribution
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Marketing attribution is automatic. Every pageview captures <code className="font-mono text-[13px] bg-[#f2f2f2] px-1.5 py-0.5 rounded text-black">utm_source / utm_medium / utm_campaign / utm_content / utm_term</code> and click IDs <code className="font-mono text-[13px] bg-[#f2f2f2] px-1.5 py-0.5 rounded text-black">gclid / fbclid / msclkid / ttclid / li_fat_id / twclid</code> from the URL query string. No code change needed — just use tagged URLs.
              </p>

              <div className="space-y-6">
                <CodeEditorMockup
                  title="EXAMPLE TAGGED URL"
                  code={`https://yourdomain.com/pricing?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale&utm_content=hero_cta&gclid=abc123`}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                    <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">DASHBOARD</span>
                    <p className="font-display text-[13px] text-black font-medium">Top Channels (utm_source)</p>
                    <p className="font-display text-[12px] text-[#71717a] mt-1">Overview → Channels panel. Filtered by date range and drill-down. Export includes channels CSV.</p>
                  </div>
                  <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                    <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">API</span>
                    <p className="font-mono text-[12px] text-black">get_top_utm_sources(website_id, start, end)</p>
                    <p className="font-display text-[12px] text-[#71717a] mt-1">Also: utm_medium, utm_campaign. Public share uses get_public_top_utm_sources.</p>
                  </div>
                </div>

                <div className="p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[15px] font-medium text-black mb-2">What is stored per pageview:</h4>
                  <ul className="space-y-1.5 font-display text-[13px] text-[#71717a]">
                    <li>• <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">utm_source</code> <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">utm_medium</code> <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">utm_campaign</code> — truncated to 255 chars, indexed.</li>
                    <li>• <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">referrer_path</code> / <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">referrer_query</code> — full referrer path alongside host, self-referrals nulled.</li>
                    <li>• <code className="font-mono text-[12px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded">hostname</code> — per-event host for multi-domain allowed_domains.</li>
                    <li>• <strong>Privacy:</strong> raw IP never stored, visitor_hash salted, all fields capped server-side. See dashboard Filters for retention-bound breakdowns.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 8. Testing & Troubleshooting */}
            <section id="troubleshooting" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                08 // DEBUGGING & LOCAL TESTING
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Testing & Troubleshooting
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                How to verify event delivery in local files, development servers, and staging environments.
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-white border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[16px] font-medium text-black mb-1">
                    1. Testing on Local Files (<code className="font-mono text-[13px]">file:///...</code>)
                  </h4>
                  <p className="font-display text-[14px] leading-[22px] text-[#71717a]">
                    When opening local HTML files directly, the tracker automatically detects the script source origin (e.g. <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">http://localhost:3000</code>) and routes events via CORS.
                  </p>
                </div>

                <div className="p-5 bg-white border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[16px] font-medium text-black mb-1">
                    2. Check the Browser Network Tab
                  </h4>
                  <p className="font-display text-[14px] leading-[22px] text-[#71717a]">
                    Open Browser DevTools (<kbd className="font-mono text-[11px] bg-[#ebebeb] px-1 py-0.5 rounded">F12</kbd> or <kbd className="font-mono text-[11px] bg-[#ebebeb] px-1 py-0.5 rounded">Cmd+Opt+I</kbd>) $\rightarrow$ Network. Filter by <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">/c</code> to see the outgoing <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">POST</code> request returning <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">204 No Content</code>.
                  </p>
                </div>

                <div className="p-5 bg-white border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[16px] font-medium text-black mb-1">
                    3. Trigger Events via DevTools Console
                  </h4>
                  <p className="font-display text-[14px] leading-[22px] text-[#71717a]">
                    Type <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">window.analytics.track('test_event', &#123; user: 'tester' &#125;)</code> in your browser console to immediately verify event delivery.
                  </p>
                </div>
              </div>
            </section>

            {/* 9. Best Practices & CSP */}
            <section id="best-practices" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                09 // BEST PRACTICES & SECURITY
              </span>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Content Security Policy (CSP) & Proxying
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                If your website enforces strict Content Security Policy headers, add our origin to your directives:
              </p>

              <CodeEditorMockup
                code={`# Content-Security-Policy header
Content-Security-Policy: script-src 'self' https://yourdomain.com; connect-src 'self' https://yourdomain.com;`}
                title="CSP HEADERS"
              />
            </section>

            {/* 10. Android Mobile App */}
            <section id="android-app" className="scroll-mt-24">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
                  10 // NATIVE ANDROID MOBILE APP
                </span>
                <span className="bg-[#c8f6f9] text-[#010120] font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  v2.1.0 APK
                </span>
              </div>
              <h2 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black mb-4">
                Official Android App &amp; APK Sideloading
              </h2>
              <p className="font-display text-[15px] leading-[24px] text-[#71717a] mb-6">
                Analytics by Sufyaan Studio offers an official high-performance native Android application built with React Native and the Hermes engine. It features native 60fps charts, sub-50ms cold start, persistent offline caching, hardware Keystore biometric encryption, and in-app self-updating.
              </p>

              <div className="space-y-6">
                <div className="p-6 bg-[#010120] text-white rounded-[6px] border border-[#26263a] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#c8f6f9] block">
                      OFFICIAL DIRECT DISTRIBUTION
                    </span>
                    <h3 className="font-display text-[20px] font-medium">
                      Download Analytics v2.1.0 APK (76.0 MB)
                    </h3>
                    <p className="font-display text-[13px] text-[#999999] max-w-md">
                      Universal signed APK for Android 10 through 15. Distributed exclusively via our official website to eliminate Google Play store telemetry.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="/analytics-latest.apk"
                      download="analytics-latest.apk"
                      className="px-5 py-3 bg-[#c8f6f9] text-[#010120] font-mono text-[12px] uppercase font-bold rounded-[4px] hover:bg-[#b0f0f4] transition-colors inline-flex items-center gap-2"
                    >
                      <span>Download APK</span>
                    </a>
                    <Link
                      href="/download"
                      className="px-4 py-3 bg-[#151538] text-white border border-[#26263a] font-mono text-[12px] uppercase rounded-[4px] hover:bg-[#202048] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>QR Code &amp; Guide →</span>
                    </Link>
                  </div>
                </div>

                <CodeEditorMockup
                  code={`# 1. Download official APK
curl -O https://analytics.sufyaan.studio/analytics-latest.apk

# 2. Verify SHA-256 Checksum
sha256sum analytics-latest.apk
# Expected: 1e188e8b993b2507d0d6baa7ee89f68552e301b59a8057a604c585df74f88fe6

# 3. Optional: Install via ADB directly to a connected device
adb install -r analytics-latest.apk`}
                  title="CLI DOWNLOAD &amp; SHA-256 VERIFICATION"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                    <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">SECURITY</span>
                    <p className="font-display text-[13px] text-black font-medium">Hardware Keystore</p>
                    <p className="font-display text-[12px] text-[#71717a] mt-1">Biometric Fingerprint &amp; Face Unlock using Android hardware enclave.</p>
                  </div>
                  <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                    <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">NOTIFICATIONS</span>
                    <p className="font-display text-[13px] text-black font-medium">Daily Digest &amp; Spikes</p>
                    <p className="font-display text-[12px] text-[#71717a] mt-1">Receive automated traffic spike notifications powered by FCM topics.</p>
                  </div>
                  <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                    <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">UPDATES</span>
                    <p className="font-display text-[13px] text-black font-medium">In-App Self-Updater</p>
                    <p className="font-display text-[12px] text-[#71717a] mt-1">Checks releases bucket on startup and installs in-place with 1 tap.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>


      {/* Footer & Wordmark */}
      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
