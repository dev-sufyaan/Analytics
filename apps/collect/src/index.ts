// apps/collect/src/index.ts
import { parseUA, isBot } from './ua';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ROLLUP_SECRET?: string;
  SITE_CACHE?: KVNamespace;
}

// SHA-256 helper with daily salt
async function generateVisitorHash(websiteId: string, ip: string, ua: string, dateStr: string): Promise<string> {
  const msg = `${websiteId}:${ip}:${ua}:${dateStr}`;
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Clean path (strip utm_*, fbclid, gclid, etc.)
function sanitizePath(rawPath: string): string {
  if (!rawPath) return '/';
  try {
    const url = new URL(rawPath, 'http://dummy.local');
    return url.pathname || '/';
  } catch {
    return rawPath.split('?')[0] || '/';
  }
}

// Parse referrer hostname
function getReferrerDomain(referrer: string | null, siteDomain: string): string | null {
  if (!referrer) return null;
  try {
    const refUrl = new URL(referrer);
    const host = refUrl.hostname.toLowerCase();
    // Drop self-referral
    if (host === siteDomain.toLowerCase() || host.endsWith(`.${siteDomain.toLowerCase()}`)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-rollup-secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Rollup Cron / Internal trigger
    if (url.pathname === '/internal/rollup' && request.method === 'POST') {
      const authHeader = request.headers.get('x-rollup-secret');
      if (env.ROLLUP_SECRET && authHeader !== env.ROLLUP_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/run_daily_rollup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Serve t.js tracker script
    if (url.pathname === '/t.js' || url.pathname === '/stats.js') {
      // In production, tracker bundle or embedded JS
      const trackerScript = `/* Aether Analytics Tracker */
!function(){"use strict";if("undefined"!=typeof window){var e=document.currentScript||document.querySelector("script[data-web]");if(e){var t=e.getAttribute("data-web");if(t){var n="true"===e.getAttribute("data-dev"),a="true"===e.getAttribute("data-respect-dnt"),r=e.getAttribute("data-host");if(!a||"1"!==navigator.doNotTrack){var o=window.location.hostname;if(n||"localhost"!==o&&"127.0.0.1"!==o&&"::1"!==o&&!o.endsWith(".local")){var i=r?r.replace(/\\/$/,"")+"/c":"/c",c=null,u=Date.now(),s=Date.now(),d=!1;function l(e){var n=JSON.stringify(e);n===c&&Date.now()-u<1e3||(c=n,u=Date.now(),navigator.sendBeacon?navigator.sendBeacon(i,new Blob([n],{type:"application/json"})):fetch(i,{method:"POST",headers:{"Content-Type":"application/json"},body:n,keepalive:!0,credentials:"omit"}).catch((function(){})))}function f(e,n,a){var r=window.location;return{w:t,n:e||"pageview",u:r.pathname,q:r.search,r:document.referrer||null,t:document.title||null,s:window.screen.width+"x"+window.screen.height,l:navigator.language||navigator.userLanguage||null,d:void 0!==a?a:null,p:n||null}}function p(){s=Date.now(),d=!1,l(f("pageview"))}function v(){if(!d){var e=Date.now(),t=Math.round((e-s)/1e3);t>0&&(d=!0,l(f("heartbeat",void 0,Math.min(t,120))),s=e)}}var g=window.location.pathname;function h(){g!==window.location.pathname&&(g=window.location.pathname,p())}var m=history.pushState;m&&(history.pushState=function(){m.apply(this,arguments),h()});var y=history.replaceState;y&&(history.replaceState=function(){y.apply(this,arguments),h()}),window.addEventListener("popstate",h),document.addEventListener("visibilitychange",(function(){"hidden"===document.visibilityState?v():(s=Date.now(),d=!1)})),window.addEventListener("pagehide",v),"complete"===document.readyState||"interactive"===document.readyState?p():document.addEventListener("DOMContentLoaded",p),window.aether={track:function(e,t){e&&l(f(e,t))},pageview:p}}}}}}();`;

      return new Response(trackerScript, {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 4. Collect endpoint: only POST /c
    if (url.pathname !== '/c' || request.method !== 'POST') {
      return new Response(null, { status: 204 });
    }

    // Check payload size <= 16KB
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 16384) {
      return new Response(null, { status: 204 });
    }

    try {
      const payload: any = await request.json();
      const websiteId = payload.w;
      if (!websiteId || typeof websiteId !== 'string') {
        return new Response(null, { status: 204 });
      }

      const userAgent = request.headers.get('user-agent') || '';
      if (isBot(userAgent)) {
        return new Response(null, { status: 204 });
      }

      // KV Site check (cached for 5 minutes)
      let siteData: { id: string; domain: string; allowed_domains: string[] } | null = null;
      if (env.SITE_CACHE) {
        const cached = await env.SITE_CACHE.get(`site:${websiteId}`, 'json');
        if (cached) siteData = cached as any;
      }

      if (!siteData) {
        const siteRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/websites?id=eq.${websiteId}&select=id,domain,allowed_domains`,
          {
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const sites = (await siteRes.json()) as any[];
        if (!sites || sites.length === 0) {
          return new Response(null, { status: 204 });
        }
        siteData = sites[0];
        if (env.SITE_CACHE && siteData) {
          await env.SITE_CACHE.put(`site:${websiteId}`, JSON.stringify(siteData), {
            expirationTtl: 300,
          });
        }
      }

      // Origin / Referrer domain allowlist check
      const origin = request.headers.get('origin') || '';
      const reqReferrer = request.headers.get('referer') || payload.r || '';
      let requestHost = '';
      if (origin) {
        try { requestHost = new URL(origin).hostname.toLowerCase(); } catch {}
      } else if (reqReferrer) {
        try { requestHost = new URL(reqReferrer).hostname.toLowerCase(); } catch {}
      }

      // IP & Visitor Hash
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
      const utcDate = new Date().toISOString().slice(0, 10);
      const visitorHash = await generateVisitorHash(websiteId, ip, userAgent, utcDate);

      // Geo from Cloudflare
      const cf = (request as any).cf;
      const country = cf?.country || null;

      // UA Parse
      const { browser, os, device } = parseUA(userAgent);

      // Sanitize fields
      const cleanPath = sanitizePath(payload.u);
      const cleanReferrer = getReferrerDomain(payload.r, siteData.domain);

      // Ingest Heartbeat vs Event
      if (typeof payload.d === 'number' && (payload.n === 'heartbeat' || !payload.n)) {
        ctx.waitUntil(
          fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ingest_heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              p_website_id: websiteId,
              p_visitor_hash: visitorHash,
              p_delta_seconds: Math.min(Math.max(payload.d, 0), 120),
            }),
          })
        );
      } else {
        const eventName = payload.n === 'pageview' || !payload.n ? null : payload.n;
        ctx.waitUntil(
          fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ingest_event`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              p_website_id: websiteId,
              p_visitor_hash: visitorHash,
              p_hostname: requestHost || siteData.domain,
              p_browser: browser,
              p_os: os,
              p_device: device,
              p_screen: payload.s || null,
              p_language: payload.l || null,
              p_country: country,
              p_url_path: cleanPath,
              p_url_query: payload.q || null,
              p_title: payload.t || null,
              p_referrer_domain: cleanReferrer,
              p_event_name: eventName,
              p_event_data: payload.p || null,
            }),
          })
        );
      }

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response(null, { status: 204 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      fetch(`${env.SUPABASE_URL}/rest/v1/rpc/run_daily_rollup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      })
    );
  },
};
