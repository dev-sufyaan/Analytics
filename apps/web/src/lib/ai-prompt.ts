// apps/web/lib/ai-prompt.ts
// Single source of truth for the "Copy AI Prompt" feature.
// This prompt is what a vibe-coding agent (Cursor / Claude / Copilot) will
// receive. It must be self-contained, work for ANY stack, and embed the
// real websiteId/domain so the agent does not hallucinate.

export interface AiPromptParams {
  websiteId: string;
  domain: string;
  origin: string; // e.g. https://analytics.sufyaan.studio
  siteName?: string;
}

export function buildAiPrompt({ websiteId, domain, origin, siteName }: AiPromptParams): string {
  const snippet = `<script defer src="${origin}/t.js" data-web="${websiteId}"></script>`;
  const proxySnippet = `// 1. In next.config.js (or next.config.mjs):
module.exports = {
  async rewrites() {
    return [
      { source: '/stats.js', destination: '${origin}/t.js' },
      { source: '/api/send', destination: '${origin}/c' },
    ];
  },
};

// 2. In your HTML / layout:
<script defer src="/stats.js" data-web="${websiteId}" data-endpoint="/api/send"></script>`;
  const today = new Date().toISOString().slice(0, 10);

  return `# Analytics by Sufyaan Studio — AI Agent Integration Instructions
Generated: ${today} | Website: ${siteName || domain} (${domain}) | ID: ${websiteId} | Origin: ${origin}
Source of truth: packages/tracker/src/t.ts (<2KB gzipped, 0 deps) + apps/web/lib/ingest-guards.mjs + apps/collect/src/index.ts

## 1. GOAL
Add privacy-first, cookie-less pageview + custom-event tracking to this codebase with 100% adblocker resilience (Brave Shields, uBlock Origin, EasyPrivacy). The install must be framework-aware, idempotent, and verifiable in <2 minutes.

## 2. PROJECT CONTEXT
- Product: Analytics by Sufyaan Studio — Privacy-first website analytics. Ultra-lightweight tracker, edge ingest, instant dashboard.
- Tracker: vanilla JS, 0 dependencies, multi-namespace (window.analytics, window.sa, window.umami).
- Collect: POST ${origin}/c or /api/send (Cloudflare Worker). 16KB body cap, 10 events/batch. Returns 204 No Content.
- Privacy: No cookies, no localStorage ID, no raw IP stored. Session hash = sha256(websiteId:ip:ua:salt) rotating daily.
- Compatibility: Drop-in replacement for Umami and Plausible. Supports declarative HTML tracking and identify API.

## 3. REQUIRED ACTION — INSTALL THE SNIPPET

### Option A: Standard Direct Snippet (Fastest, 10 seconds)
\`\`\`html
${snippet}
\`\`\`

### Option B: First-Party Proxy (100% Brave Shields & Adblocker Bypass — RECOMMENDED)
Configure a reverse proxy / rewrite on the project's own domain so browser adblockers cannot block requests:

- **Next.js** (\`next.config.mjs\`):
\`\`\`js
export default {
  async rewrites() {
    return [
      { source: '/stats.js', destination: '${origin}/t.js' },
      { source: '/api/send', destination: '${origin}/c' },
    ];
  },
};
\`\`\`

- **Nuxt 3 / Nitro** (\`nuxt.config.ts\`):
\`\`\`ts
export default defineNuxtConfig({
  routeRules: {
    '/stats.js': { proxy: '${origin}/t.js' },
    '/api/send': { proxy: '${origin}/c' },
  }
});
\`\`\`

- **Vercel** (\`vercel.json\` for Vite / React / Svelte):
\`\`\`json
{
  "rewrites": [
    { "source": "/stats.js", "destination": "${origin}/t.js" },
    { "source": "/api/send", "destination": "${origin}/c" }
  ]
}
\`\`\`

- **Netlify / Cloudflare Pages** (\`public/_redirects\`):
\`\`\`text
/stats.js    ${origin}/t.js    200
/api/send    ${origin}/c       200
\`\`\`

- **Astro** (\`astro.config.mjs\`):
\`\`\`js
export default defineConfig({
  redirects: {
    '/stats.js': '${origin}/t.js',
    '/api/send': '${origin}/c',
  }
});
\`\`\`

- **Nginx** (\`nginx.conf\` for WordPress / PHP / VPS):
\`\`\`nginx
location /stats.js { proxy_pass ${origin}/t.js; proxy_ssl_server_name on; }
location /api/send { proxy_pass ${origin}/c; proxy_ssl_server_name on; }
\`\`\`

Then paste this proxy script into the site's <head> / layout:
\`\`\`html
<script defer src="/stats.js" data-web="${websiteId}" data-endpoint="/api/send"></script>
\`\`\`

Placement (detect framework and do exactly one):
- **Next.js App Router**: app/layout.tsx → <Script defer src="${origin}/t.js" data-web="${websiteId}" strategy="afterInteractive" /> inside <head>
- **Next.js Pages**: pages/_app.tsx or pages/_document.tsx <Head>
- **HTML/Vite/CRA**: index.html <head>
- **Vue/Nuxt**: nuxt.config.ts app.head.script [{src:"${origin}/t.js", defer:true, 'data-web':"${websiteId}"}] or index.html <head>
- **SvelteKit**: src/app.html <head>
- **Astro**: src/layouts/Layout.astro <head>
- **Remix**: app/root.tsx <head>
- **WordPress/Shopify/Webflow**: Theme → Custom Code → Header injection

Supported Script Attributes:
- data-web="${websiteId}" or data-website-id="${websiteId}" (REQUIRED)
- data-host="${origin}" (OPTIONAL — collector host override)
- data-endpoint="/api/send" (OPTIONAL — custom collect endpoint, e.g. /api/send or /c)
- data-domains="mysite.com,app.mysite.com" (OPTIONAL — restrict tracking to specific domains)
- data-dev="true" (OPTIONAL — allow localhost / 127.0.0.1 tracking during local development)
- data-respect-dnt="true" (OPTIONAL — honor navigator.doNotTrack=1)
- data-tag="v1.0" (OPTIONAL — tag version or cohort)

## 4. SPA ROUTING & NAVIGATION
Tracker automatically patches history.pushState / history.replaceState, popstate, and hashchange. No custom router listeners needed.

## 5. DECLARATIVE HTML CLICK TRACKING (NO JAVASCRIPT NEEDED)
Add data-event attributes directly to any HTML elements:
\`\`\`html
<button data-event="upgrade_click" data-event-plan="pro">Upgrade to Pro</button>
<a href="/pricing" data-event="view_pricing" data-event-source="hero">See Pricing</a>
\`\`\`
*(Link clicks automatically use guaranteed navigation to prevent beacon drops during page unload).*

## 6. PROGRAMMATIC JAVASCRIPT TRACKING
Use window.analytics or window.umami anywhere in your code:
\`\`\`js
// Track custom events:
window.analytics.track('signup_completed', { plan: 'pro', source: 'pricing_page' });
// or Umami syntax:
window.umami.track('purchase', { amount: 49, currency: 'USD' });

// Identify logged-in users (persists across subsequent pageviews):
window.analytics.identify('user_12345', { role: 'admin', tier: 'premium' });
\`\`\`

      }
    });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  // 2. All button/link clicks via delegation — captures text, href, id
  document.addEventListener('click', function(e){
    var el=e.target.closest('button, a, [data-track], [role="button"]'); if(!el) return;
    var text=(el.innerText||el.textContent||'').trim().slice(0,40) || el.id || el.getAttribute('aria-label') || 'unknown';
    var href=el.getAttribute('href')||'';
    // External link
    if(el.tagName==='A' && href && /^https?:\/\//.test(href) && !href.includes(location.hostname)){
      track('outbound_link_clicked',{ href: href.slice(0,200), text: text });
      return;
    }
    // File download
    if(href && /\.(pdf|zip|csv|xlsx|docx|mp4|mp3)$/i.test(href)){
      track('file_downloaded',{ file: href.split('/').pop().slice(0,80), href: href.slice(0,200) });
      return;
    }
    // Generic button/CTA
    var name=el.getAttribute('data-track') || (el.id ? el.id+'_clicked' : text.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,30)+'_clicked');
    track(name,{ text: text, id: el.id||null, href: href||null });
  }, true);
  // 3. Form submissions — captures form id/name, no PII
  document.addEventListener('submit', function(e){
    var form=e.target; if(!form || form.tagName!=='FORM') return;
    var id=form.id||form.getAttribute('name')||form.action||'unknown_form';
    track('form_submitted',{ form: String(id).slice(0,40), path: location.pathname });
  }, true);
  // 4. Reset scroll on SPA nav
  var _push=history.pushState, _replace=history.replaceState;
  function resetScroll(){ maxScroll=0; sent={}; }
  if(_push) history.pushState=function(){ var r=_push.apply(this,arguments); resetScroll(); return r; };
  if(_replace) history.replaceState=function(){ var r=_replace.apply(this,arguments); resetScroll(); return r; };
  window.addEventListener('popstate', resetScroll);
})();
</script>
\`\`\`
What it gives you: \`scroll_depth\` (25/50/75/100), \`outbound_link_clicked\`, \`file_downloaded\`, \`form_submitted\`, plus every button as \`*_clicked\` (e.g., \`pricing_cta_clicked\`, \`signup_clicked\`). Rename \`data-track="purchase_success"\` on any element to override name. All props are safe (no PII, ≤2KB, CSV-guarded). For React/Vue, you can keep the pack AND add explicit \`onClick={() => track(...)}\` for critical CTAs — both dedupe within 1s so no double count.

Docs reference for every event type:
- scroll: \`track('scroll_depth',{percent:50, path})\`
- button: \`track('cta_clicked',{text,id})\` or \`data-track\` override
- form: \`track('form_submitted',{form})\`
- link: \`track('outbound_link_clicked',{href,text})\`
- file: \`track('file_downloaded',{file,href})\`
- custom: \`track('purchase_success',{order_id,amount})\`

## 7. SERVER-SIDE (optional, webhooks)
POST ${origin}/c — same endpoint, any language:
\`\`\`json
{
  "w": "${websiteId}",
  "n": "pageview",
  "u": "/checkout",
  "q": "?utm_source=google&utm_medium=cpc&gclid=xyz",
  "r": "https://google.com/",
  "t": "Checkout",
  "s": "1920x1080",
  "l": "en-US",
  "p": { "plan": "pro" }
}
\`\`\`
Keys: w=websiteId, n=pageview|custom, u=path, q=query, r=referrer, t=title, s=screen, l=language, d=deltaSec (heartbeat only, 0-120), p=props. Server IP/UA/Country derived from 11 headers (cf-connecting-ip, true-client-ip, x-real-ip, x-forwarded-for, forwarded…), CIDR block via IGNORE_IP, country via cf-ipcountry/x-vercel-ip-country/cloudfront-viewer-country.

## 8. DURATION / REALTIME
Tracker sends delta seconds on visibilitychange=hidden/pagehide + every 45s when visible (clamped 0-120). No extra code.

## 9. VERIFICATION (must do after change — pageviews + events)
1. Open site → DevTools Network filter /c → POST 204 (beacon or fetch keepalive). No console errors. Click your main CTA → should see additional POST with n="your_event".
2. Console: window.analytics.track('test_event', {from: 'ai_agent'}) → Network /c 204 → Dashboard Events panel shows test_event within 30s (realtime 5s poll).
3. Dashboard: ${origin}/app/${websiteId} → Overview shows 1 pageview within 30s + Events panel shows your custom events. Or: curl -X POST ${origin}/c -H "Content-Type: application/json" -d '{"w":"${websiteId}","n":"pageview","u":"/ai-test","q":"?utm_source=ai","r":"https://google.com"}' → 204 and curl -X POST ${origin}/c -H "Content-Type: application/json" -d '{"w":"${websiteId}","n":"test_event","u":"/","p":{"from":"ai"}}' → 204
4. Channels panel should show utm_source if you used ?utm_source=...
5. If localhost, ensure snippet has data-dev="true" or test on deployed domain — otherwise pageviews are ignored.

## 10. BEST PRACTICES & PITFALLS — DO NOT VIOLATE
- ONE script tag per page, in <head> defer, not in body. Do not duplicate on layout + page.
- Do NOT proxy /c through Next.js /api — post directly to ${origin}/c (first-party route). Service role key never in client.
- Do NOT store raw IP, fingerprint, add cookies/localStorage ID.
- Do NOT add tag/extra accent colors, pill buttons (4px only), or pg_cron.
- Keep gzip ≤1.5KB — no deps, no console.log.
- Allowlist: ensure ${domain} and any allowed_domains are in websites.allowed_domains (site creation seeds it).
- For hash routers, keep hash as part of u.

## 11. FRAMEWORK DETECTION CHECKLIST (do before edit)
1. List files: app/layout.tsx, pages/_app.tsx, index.html, nuxt.config.ts, src/app.html, astro.config, app/root.tsx
2. Pick ONE insertion point, insert snippet exactly as above with real ID ${websiteId}
3. If repo already has snippet with different ID, REPLACE, do not duplicate
4. Run build/lint if present (npm run build) — no new dependencies

## 12. DONE DEFINITION (agent must verify all)
- Snippet present with correct ID ${websiteId}, pageview fires on load + SPA nav (history pushState), Network /c shows 204 for pageview
- At least 3 custom events instrumented on real buttons/forms in this codebase (e.g., signup/pricing_cta/purchase) — searching for <button, <form, onClick and adding window.analytics.track
- Custom event test: window.analytics.track('test_event') → Network 204 → Dashboard Events panel shows it
- No duplicate tags, respects DNT if configured, UTMs appear in Channels when using ?utm_source=...
- Build passes (npm run build), no new deps, no console errors

References: /docs (full guide), /pricing (limits: 25k/mo, 30d raw, rollups forever), tracker src packages/tracker/src/t.ts
`;
}

export function buildAiPromptShort({ websiteId, domain, origin }: AiPromptParams): string {
  // Fallback compact prompt for clipboard-limited contexts
  return `Add Analytics by Sufyaan Studio to ${domain}: Paste <script defer src="${origin}/t.js" data-web="${websiteId}"></script> in <head> (Next: Script afterInteractive). Auto tracks pageviews + SPA. Custom: window.analytics.track('event', {props}). Server: POST ${origin}/c {w:"${websiteId}",n:"pageview",u:"/path",q:"?utm_source=google"}. Verify: Network /c 204, dashboard ${origin}/app/${websiteId}. Do not proxy via /api, no cookies.`;
}
