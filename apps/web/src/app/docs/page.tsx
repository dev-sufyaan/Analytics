'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  NavBar,
  NavLink,
  ButtonPrimary,
  ButtonSecondaryWhite,
  CodeEditorMockup,
  Footer,
  FooterWordmarkBanner,
  TextInput,
} from '@aether/ui';
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
    nextjs: {
      title: 'Next.js (App Router & Pages Router)',
      badge: 'RECOMMENDED',
      description: 'Add the Script component in your root layout for automatic SPA route change tracking.',
      code: `// app/layout.tsx (App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          src="https://yourdomain.com/t.js"
          data-web="YOUR_WEBSITE_ID"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`,
    },
    html: {
      title: 'HTML5 / Static Websites & Local Files',
      badge: 'UNIVERSAL',
      description: 'Paste this single script tag into your HTML <head> on all pages. Works on live domains, localhost, and local files.',
      code: `<!-- Add inside the <head> section -->
<script
  defer
  src="https://yourdomain.com/t.js"
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
      src="https://yourdomain.com/t.js"
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
          src: 'https://yourdomain.com/t.js',
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
      src="https://yourdomain.com/t.js"
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
      src="https://yourdomain.com/t.js"
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
          src="https://yourdomain.com/t.js"
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
  src="https://yourdomain.com/t.js"
  data-web="YOUR_WEBSITE_ID"
></script>`,
    },
  };

  const backendSnippets: Record<string, { title: string; code: string }> = {
    node: {
      title: 'Node.js / Express',
      code: `// Track backend events or webhook conversions
async function trackEvent(websiteId, eventName, urlPath, properties = {}) {
  await fetch('https://yourdomain.com/c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      w: websiteId,
      n: eventName,
      u: urlPath,
      p: properties
    })
  });
}

// Example usage:
await trackEvent('YOUR_WEBSITE_ID', '${docEventName}', '/checkout', {
  ${docPropKey}: '${docPropVal}',
  amount: 240
});`,
    },
    python: {
      title: 'Python / Django / FastAPI',
      code: `import requests

def track_event(website_id: str, event_name: str, url_path: str, props: dict = None):
    payload = {
        "w": website_id,
        "n": event_name,
        "u": url_path,
        "p": props or {}
    }
    requests.post("https://yourdomain.com/c", json=payload, timeout=2)

# Example usage:
track_event("YOUR_WEBSITE_ID", "${docEventName}", "/checkout", {"${docPropKey}": "${docPropVal}"})`,
    },
    php: {
      title: 'PHP / Laravel',
      code: `// Laravel Http Client or PHP cURL
use Illuminate\\Support\\Facades\\Http;

Http::timeout(2)->post('https://yourdomain.com/c', [
    'w' => 'YOUR_WEBSITE_ID',
    'n' => '${docEventName}',
    'u' => '/checkout',
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
    "p": {"${docPropKey}": "${docPropVal}"}
  }'`,
    },
  };

  const dynamicJsCode = `// Dispatch in frontend:
window.aether.track('${docEventName}', {
  ${docPropKey}: '${docPropVal}'
});`;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Navbar */}
      <NavBar>
        <Link href="/" className="flex items-center gap-2 text-white font-display text-[20px] font-medium tracking-tight">
          <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
          <span>aether</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/" onDark>Overview</NavLink>
          <NavLink href="/pricing" onDark>Pricing</NavLink>
          <NavLink href="/docs" active onDark>Documentation</NavLink>
          <NavLink href="/design" onDark>Design System</NavLink>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <ButtonSecondaryWhite className="text-[12px] h-9 px-4">
              SIGN IN
            </ButtonSecondaryWhite>
          </Link>
          <Link href="/login">
            <ButtonPrimary className="bg-[#c8f6f9] text-black hover:bg-[#b0f0f4] text-[12px] h-9 px-4">
              GET STARTED
            </ButtonPrimary>
          </Link>
        </div>
      </NavBar>

      {/* Hero Section */}
      <section className="bg-[#010120] text-white py-16 md:py-20 border-b border-[#26263a]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-3">
              DEVELOPER DOCUMENTATION & GUIDES
            </span>
            <h1 className="font-display text-[38px] md:text-[52px] font-medium tracking-[-1px] text-white mb-4">
              Integration & Event API Reference
            </h1>
            <p className="font-display text-[16px] md:text-[18px] leading-[26px] text-zinc-300">
              Complete guides for installing Aether across modern web frameworks, static sites, local HTML files, and server-side runtimes with zero cookie consent banners.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-12 w-full flex-1">
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
                    <a href="#troubleshooting" className="hover:text-black transition-colors block py-1">
                      7. Testing & Troubleshooting
                    </a>
                  </li>
                  <li>
                    <a href="#best-practices" className="hover:text-black transition-colors block py-1">
                      8. Best Practices & CSP
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
                Add the lightweight script tag inside the <code className="bg-[#f2f2f2] px-1.5 py-0.5 rounded font-mono text-[13px] text-black">&lt;head&gt;</code> of your website. The script runs asynchronously, weighs only 939 bytes gzipped, and does not block page rendering.
              </p>

              <CodeEditorMockup
                code={`<script
  defer
  src="https://yourdomain.com/t.js"
  data-web="13921d15-5a3b-4b3d-ae89-b49255ee3381"
></script>`}
                title="UNIVERSAL HTML SNIPPET"
              />

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">ATTRIBUTE</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-web</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Your website UUID created in Aether.</p>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">ATTRIBUTE</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-dev="true"</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Optional. Forces tracking on localhost.</p>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-1">ATTRIBUTE</span>
                  <p className="font-mono text-[13px] text-black font-medium">data-host</p>
                  <p className="font-display text-[12px] text-[#71717a] mt-1">Optional. Custom proxy / collector URL.</p>
                </div>
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
                Track custom user interactions like signup buttons, modal triggers, billing tier upgrades, and checkout completions using <code className="font-mono text-[13px] bg-[#f2f2f2] px-1.5 py-0.5 rounded text-black">window.aether.track()</code>.
              </p>

              <div className="space-y-6">
                <CodeEditorMockup
                  title="EVENT TRACKING API SYNTAX"
                  code={`// Signature:
// window.aether.track(eventName: string, properties?: Record<string, any>)

// 1. Basic Button Click Event:
window.aether.track('pricing_cta_clicked');

// 2. Custom Conversion Event with Metadata:
window.aether.track('user_signed_up', {
  plan: 'pro_monthly',
  source: 'header_banner',
  currency: 'USD',
  amount: 29
});

// 3. E-commerce Checkout Completed:
window.aether.track('purchase_success', {
  order_id: 'ord_987654',
  items_count: 3,
  value: 149.50
});`}
                />

                <div className="p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <h4 className="font-display text-[15px] font-medium text-black mb-2">
                    Event Validation & Payload Limits:
                  </h4>
                  <ul className="space-y-1.5 font-display text-[13px] text-[#71717a]">
                    <li>• <strong>Name limit:</strong> Maximum 64 characters (alphanumeric, underscores, hyphens).</li>
                    <li>• <strong>Properties payload:</strong> Maximum 2 KB JSON payload.</li>
                    <li>• <strong>Rate limit:</strong> Rapid duplicate calls within 1 second are automatically debounced.</li>
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
    window.aether?.track('button_click', {
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
      window.aether?.track('scroll_depth', { percent: milestone });
    }
  });
});

// 3. Track modal open & close:
function openModal(modalName) {
  window.aether?.track('modal_opened', { modal: modalName });
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
            </section>

            {/* 7. Testing & Troubleshooting */}
            <section id="troubleshooting" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                07 // DEBUGGING & LOCAL TESTING
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
                    Type <code className="font-mono text-[12px] bg-[#f4f4f4] px-1 py-0.5 rounded text-black">window.aether.track('test_event', &#123; user: 'tester' &#125;)</code> in your browser console to immediately verify event delivery.
                  </p>
                </div>
              </div>
            </section>

            {/* 8. Best Practices & CSP */}
            <section id="best-practices" className="scroll-mt-24">
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
                08 // BEST PRACTICES & SECURITY
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
          </div>
        </div>
      </main>

      {/* Footer & Wordmark */}
      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
