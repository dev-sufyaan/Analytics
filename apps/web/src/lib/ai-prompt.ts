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
  const today = new Date().toISOString().slice(0, 10);

  return `# Analytics by Sufyaan Studio — AI Agent Integration Instructions
Generated: ${today} | Website: ${siteName || domain} (${domain}) | ID: ${websiteId} | Origin: ${origin}
Source of truth: packages/tracker/src/t.ts (1.15KB gzipped, ≤1.5KB budget) + apps/web/lib/ingest-guards.mjs + supabase/migrations

## 1. GOAL
Add privacy-first, cookie-less pageview + custom-event tracking to this codebase. The install must be framework-aware, idempotent, and verifiable in <2 minutes.

## 2. PROJECT CONTEXT
- Product: Analytics by Sufyaan Studio — Best-in-class privacy-first website analytics. Tiny tracker, edge ingest, instant dashboard.
- Tracker: vanilla JS, 0 deps, window.analytics (not window.aether/umami). Global: window.analytics.track(name, props), window.analytics.pageview(), window.analytics.flush()
- Collect: POST ${origin}/c (Cloudflare Worker, also /t.js). 16KB body cap, 10 events/batch. Returns 204 always (never 500). Validate via ingest-guards.mjs logic — do NOT proxy through Next.js /api.
- Privacy: No cookies, no localStorage ID, no raw IP stored. visitor_hash = sha256(websiteId:ip:ua:salt) salt rotates daily (SALT_ROTATION=day|week|month, default day). Do not fingerprint.
- Limits: event_name ≤128 chars, title ≤512, path ≤1024, query ≤512, event_data ≤2KB, hostname ≤255. Names starting with = + - @ tab are rejected (CSV guard). Bots + empty UA dropped. Dedupe 1s same-path pageview.

## 3. REQUIRED ACTION — INSTALL THE SNIPPET
Website ID (REAL, do not invent): ${websiteId}
Domain (REAL): ${domain}
Snippet to paste:
\`\`\`html
${snippet}
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
Attributes (only these):
- data-web="${websiteId}" REQUIRED
- data-host="${origin}" OPTIONAL — custom collector origin (defaults to script origin)
- data-dev="true" OPTIONAL — allow localhost/127.0.0.1/::1/*.local
- data-respect-dnt="true" OPTIONAL — honor navigator.doNotTrack=1

## 4. SPA HANDLING (CRITICAL)
Tracker auto patches history.pushState/replaceState + popstate. No extra code needed. On route change it fires pageview with new pathname. Keep pathname-only in u (query in q). For hash routers, hash is kept as part of path.

## 5. WHAT IS AUTO-CAPTURED (no code)
Per pageview: u=pathname (/pricing), q=search (?utm_source=google&utm_medium=cpc&gclid=xyz — UTMs auto-parsed server-side → utm_source/medium/campaign/content/term,gclid/fbclid/msclkid/ttclid/lifatid/twclid), r=document.referrer (host+path dropped if self), t=document.title (512, formula-guarded), s=screen WxH, l=navigator.language, h=hostname, browser/os/device from UA. hostname stored per-event for multi-domain.

## 6. CUSTOM EVENTS — MANDATORY (pageviews are automatic, events are NOT)
You MUST add custom event tracking for key interactions. Scan the codebase for buttons, forms, CTAs, and instrument them. Do not skip — dashboard Events panel will be empty without this.

API (global is window.analytics, NOT umami/aether):
\`\`\`js
// Basic:
window.analytics.track('cta_clicked')
window.analytics.track('signup_completed', { plan: 'pro', source: 'pricing_cta' })
window.analytics.track('purchase_success', { order_id: 'ord_123', amount: 240, currency: 'USD' })

// Framework examples — add to actual onClick / onSubmit handlers in this repo:
// React/Next.js:
<button onClick={() => window.analytics.track('signup_clicked', { location: 'hero' })}>Sign up</button>
// Vue:
<button @click="() => window.analytics.track('checkout_started', { amount: 99 })">Buy</button>
// HTML/vanilla:
document.querySelector('#pricing-cta')?.addEventListener('click', () => window.analytics.track('pricing_cta_clicked'));
// Form:
form.addEventListener('submit', () => window.analytics.track('form_submitted', { form: 'contact' }));
\`\`\`
Recommended events to add (pick at least 3-5 that exist in this site):
- signup_clicked / signup_completed, login_clicked, pricing_cta_clicked, checkout_started, purchase_success, contact_form_submitted, demo_requested, newsletter_subscribed
Validation: name trimmed, ≤128 chars, no =+-@ prefix (CSV guard). Props must be plain object ≤2KB (arrays wrapped as {value: ...}). Identical payload within 1s deduped client-side. Verify via console: window.analytics.track('test_event', {from: 'ai_agent'}) → Network /c 204 → Dashboard Events panel within 30s.

## 6b. FULL WEBSITE AUTO-TRACKING PACK — COPY-PASTE FOR 100% COVERAGE
Add this ONE robust pack after the snippet (or as /public/analytics-auto.js) to auto-track scroll, all buttons, forms, external links, file downloads, and outbound clicks for ANY stack. It uses delegation, so it works for SPA route changes without edits.

\`\`\`html
<!-- Add AFTER the Analytics snippet in <head> or before </body> -->
<script>
// Analytics Auto-Track — scroll, clicks, forms, links, downloads (robust, no deps)
(function(){
  if (typeof window==='undefined' || !window.analytics) return;
  var track = function(n,p){ try{window.analytics.track(n,p)}catch(e){} };
  // 1. Scroll depth 25/50/75/100 — once per page
  var maxScroll=0, sent={}; function onScroll(){
    var h=document.documentElement, st=window.scrollY||h.scrollTop, sh=h.scrollHeight - window.innerHeight;
    var pct= sh>0 ? Math.round((st/sh)*100) : 0;
    [25,50,75,100].forEach(function(m){
      if(pct>=m && maxScroll<m && !sent[m]){
        sent[m]=1; maxScroll=m; track('scroll_depth',{percent:m, path: location.pathname});
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
