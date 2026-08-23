// apps/web/lib/ingest-guards.mjs
// Analytics by Sufyaan Studio — Pure, framework-free collect validation helpers.
// Single source of truth shared by:
//   - apps/web/src/app/c/route.ts (Vercel / Next.js route)
//   - apps/collect/src/index.ts   (Cloudflare Worker, bundled by wrangler/esbuild)
//   - scripts/test/*              (the tests exercise the EXACT same logic)
// No Cloudflare/Next deps. node:crypto only (workers: nodejs_compat).

import crypto from 'node:crypto';

// ---- Limits (server-side truth; the client is untrusted) ----
export const LIMITS = {
  MAX_BODY_BYTES: 16384, // 16 KB hard cap per beacon
  MAX_BATCH: 10, // max events per batched beacon
  PATH: 1024,
  QUERY: 512,
  TITLE: 512,
  EVENT_NAME: 128,
  REFERRER: 255,
  REFERRER_PATH: 500,
  HOSTNAME: 255,
  BROWSER: 64,
  OS: 64,
  DEVICE: 32,
  SCREEN: 32,
  LANGUAGE: 35,
  COUNTRY: 8,
  VISITOR_HASH: 64,
  UTM: 255,
  CLICK_ID: 255,
  EVENT_DATA_BYTES: 2048, // jsonb cap enforced again in the RPC
};

// ---- Bot detection — expanded to mirror Umami isbot coverage ----
export const BOT_PATTERN =
  /bot|crawler|spider|crawl|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|facebookexternalhit|whatsapp|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|twitterbot|slurp|headless|phantomjs|axios|curl|wget|python|go-http|java|node-fetch|httpclient|okhttp|scrapy/i;

export function isBot(ua) {
  if (!ua) return true;
  return BOT_PATTERN.test(ua);
}

// ---- CSV formula injection guard (defense-in-depth, Umami: send/route.ts:19) ----
export const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;
export function isSafeString(s) {
  if (typeof s !== 'string') return true;
  return !FORMULA_TRIGGER_RE.test(s.trim());
}

// ---- User-Agent parsing (tiny, no deps) ----
export function parseUA(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };

  let device = 'Desktop';
  if (/tablet|ipad/i.test(ua)) device = 'Tablet';
  else if (/mobile|iphone|ipod|android|windows phone|blackberry|opera mini/i.test(ua)) device = 'Mobile';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'Chrome OS';

  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  return { browser, os, device };
}

// ---- String helpers ----
function str(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

// ---- Env helper (works on Node + Cloudflare Worker with nodejs_compat) ----
function getEnv(name) {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name] != null) {
      return String(process.env[name]);
    }
  } catch {}
  try {
    // Worker may expose via globalThis bindings when set manually
    if (typeof globalThis !== 'undefined' && globalThis[name] != null) return String(globalThis[name]);
  } catch {}
  return undefined;
}

// ---- IP helpers — mirrors Umami src/lib/ip.ts + detect.ts -----------------
export const IP_ADDRESS_HEADERS = [
  'cf-connecting-ip', // Cloudflare (highest priority for CF route)
  'true-client-ip', // CDN
  'x-real-ip', // nginx
  'fastly-client-ip',
  'x-nf-client-connection-ip',
  'do-connecting-ip',
  'x-appengine-user-ip',
  'x-forwarded-for',
  'forwarded',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
];

export function stripPort(ip) {
  if (!ip) return ip;
  const trimmed = String(ip).trim();
  // IPv6 bracketed with port: [2001:db8::1]:8080 -> 2001:db8::1
  if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']');
    if (endBracket !== -1) {
      // keep inside brackets only, drop port after ]
      return trimmed.slice(1, endBracket);
    }
  }
  // IPv4-mapped IPv6 must not be treated as host:port (e.g. ::ffff:1.2.3.4)
  if (trimmed.includes('::')) {
    // Contains :: -> IPv6, not a port suffix. Return as-is (brackets stripped already)
    return trimmed.replace(/^\[/, '').replace(/\]$/, '');
  }
  // IPv4 with port: 1.2.3.4:8080 or hostname:port
  const idx = trimmed.lastIndexOf(':');
  if (idx !== -1) {
    const after = trimmed.slice(idx + 1);
    // Only strip if after colon is numeric port (1-5 digits) and before is IPv4/hostname
    if (/^\d{1,5}$/.test(after)) {
      const before = trimmed.slice(0, idx);
      // IPv4 check or hostname check
      if (before.includes('.') || /^[a-zA-Z0-9.-]+$/.test(before)) {
        return before;
      }
    }
  }
  return trimmed.replace(/^\[/, '').replace(/\]$/, '');
}

function normalizeIp(ip) {
  if (!ip) return ip;
  // ::ffff:1.2.3.4 -> 1.2.3.4
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) return m[1];
  return ip;
}

function resolveIp(raw) {
  if (!raw) return raw;
  const stripped = stripPort(String(raw).trim());
  return normalizeIp(stripped);
}

function parseHeaderValue(header, value) {
  if (!value) return undefined;
  const lower = header.toLowerCase();
  if (lower === 'x-forwarded-for') {
    return resolveIp(value.split(',')[0].trim());
  }
  if (lower === 'forwarded') {
    const match = value.match(/for=("[^"]+"|\[?[0-9a-fA-F:.]+\]?)/i);
    if (match) {
      let v = match[1].replace(/^"/, '').replace(/"$/, '');
      // remove port/brackets
      return resolveIp(v);
    }
    return undefined;
  }
  return resolveIp(value);
}

export function getIpAddress(headers) {
  // Allow override via CLIENT_IP_HEADER env (Umami parity)
  const customHeader = getEnv('CLIENT_IP_HEADER');
  if (customHeader) {
    const v = headers.get(customHeader) || headers.get(customHeader.toLowerCase());
    if (v) {
      const parsed = parseHeaderValue(customHeader.toLowerCase(), v);
      if (parsed) return parsed;
    }
  }
  for (const name of IP_ADDRESS_HEADERS) {
    const v = headers.get(name) || headers.get(name.toLowerCase());
    if (v) {
      const parsed = parseHeaderValue(name, v);
      if (parsed) return parsed;
    }
  }
  return undefined;
}

// ---- CIDR / IGNORE_IP check — mirrors Umami detect.ts:hasBlockedIp --------
function ipToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (let i = 0; i < 4; i++) {
    const p = parseInt(parts[i], 10);
    if (isNaN(p) || p < 0 || p > 255) return null;
    n = (n << 8) | p;
  }
  return n >>> 0;
}

function isCidrMatch(ip, cidr) {
  const slash = cidr.indexOf('/');
  if (slash === -1) return false;
  const base = cidr.slice(0, slash).trim();
  const bits = parseInt(cidr.slice(slash + 1).trim(), 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function hasBlockedIp(clientIp, ignoreList) {
  if (!clientIp || !ignoreList) return false;
  const raw = Array.isArray(ignoreList) ? ignoreList : String(ignoreList).split(',');
  const ips = raw.map((s) => String(s).trim()).filter(Boolean);
  if (!ips.length) return false;
  for (const entry of ips) {
    if (entry === clientIp) return true;
    if (entry.includes('/')) {
      try {
        if (isCidrMatch(clientIp, entry)) return true;
      } catch {}
    }
  }
  return false;
}

export function getIgnoreList(envIgnore) {
  // envIgnore overrides process.env.IGNORE_IP so Worker can pass Env.IGNORE_IP
  if (envIgnore != null) return envIgnore;
  return getEnv('IGNORE_IP') || getEnv('IGNORE_IPS') || '';
}

// ---- Path normalization: strip query, default to "/" ----
export function sanitizePath(rawPath, opts) {
  const removeTrailingSlash =
    (opts && typeof opts.removeTrailingSlash === 'boolean'
      ? opts.removeTrailingSlash
      : getEnv('REMOVE_TRAILING_SLASH') === 'true');

  const capped = str(rawPath, LIMITS.PATH) || '/';
  try {
    const url = new URL(capped, 'http://dummy.local');
    let p = url.pathname || '/';
    // Keep hash for hash-router SPAs (Umami: pathname + hash)
    if (url.hash) p += url.hash;
    if (removeTrailingSlash && p.length > 1 && p.endsWith('/')) {
      // Never strip root "/"; handle "/path/#hash" -> "/path#hash"
      if (p.includes('#')) {
        const hashIdx = p.indexOf('#');
        const before = p.slice(0, hashIdx);
        const after = p.slice(hashIdx);
        p = before.replace(/\/$/, '') + after;
      } else {
        p = p.replace(/\/$/, '');
      }
    }
    if (!p.startsWith('/')) p = '/' + p;
    return p;
  } catch {
    let base = capped.split('?')[0] || '/';
    // fallback hash keep
    const hashIdx = base.indexOf('#');
    let hash = '';
    if (hashIdx !== -1) {
      hash = base.slice(hashIdx);
      base = base.slice(0, hashIdx);
    }
    if (removeTrailingSlash && base.length > 1 && base.endsWith('/')) base = base.slice(0, -1);
    return (base || '/') + hash;
  }
}

// ---- Referrer host; drop self-referrals ----
export function getReferrerDomain(referrer, siteDomain) {
  const ref = str(referrer, LIMITS.REFERRER);
  if (!ref) return null;
  try {
    const refUrl = new URL(ref);
    const host = refUrl.hostname.toLowerCase();
    if (siteDomain && (host === siteDomain.toLowerCase() || host.endsWith(`.${siteDomain.toLowerCase()}`))) {
      return null;
    }
    return host.slice(0, LIMITS.REFERRER);
  } catch {
    return null;
  }
}

// ---- UTM / click-ID extraction (Umami parity: send/route.ts:150) ----
function getQueryParam(q, key) {
  if (!q || typeof q !== 'string') return null;
  try {
    const s = q.startsWith('?') ? q : `?${q}`;
    const params = new URLSearchParams(s);
    const v = params.get(key);
    return v ? v.trim() || null : null;
  } catch {
    return null;
  }
}

export function extractUtmParams(queryString) {
  if (!queryString) return {};
  return {
    utm_source: str(getQueryParam(queryString, 'utm_source'), LIMITS.UTM),
    utm_medium: str(getQueryParam(queryString, 'utm_medium'), LIMITS.UTM),
    utm_campaign: str(getQueryParam(queryString, 'utm_campaign'), LIMITS.UTM),
    utm_content: str(getQueryParam(queryString, 'utm_content'), LIMITS.UTM),
    utm_term: str(getQueryParam(queryString, 'utm_term'), LIMITS.UTM),
    gclid: str(getQueryParam(queryString, 'gclid'), LIMITS.CLICK_ID),
    fbclid: str(getQueryParam(queryString, 'fbclid'), LIMITS.CLICK_ID),
    msclkid: str(getQueryParam(queryString, 'msclkid'), LIMITS.CLICK_ID),
    ttclid: str(getQueryParam(queryString, 'ttclid'), LIMITS.CLICK_ID),
    lifatid: str(getQueryParam(queryString, 'li_fat_id'), LIMITS.CLICK_ID),
    twclid: str(getQueryParam(queryString, 'twclid'), LIMITS.CLICK_ID),
  };
}

export function getReferrerDetails(referrer, siteDomain) {
  const ref = str(referrer, LIMITS.REFERRER);
  if (!ref) return { domain: null, path: null, query: null };
  try {
    const refUrl = new URL(ref);
    const host = refUrl.hostname.toLowerCase();
    const isSelf =
      siteDomain &&
      (host === siteDomain.toLowerCase() || host.endsWith(`.${siteDomain.toLowerCase()}`));
    return {
      domain: isSelf ? null : host.slice(0, LIMITS.REFERRER),
      path: isSelf ? null : str(refUrl.pathname || '/', LIMITS.REFERRER_PATH),
      query: isSelf ? null : str(refUrl.search ? refUrl.search.slice(1) : null, LIMITS.QUERY),
    };
  } catch {
    return { domain: null, path: null, query: null };
  }
}

// ---- AI chatbot referrer classification (Core 5) ---------------------------
// Canonical source labels for known AI assistant referral hosts. Matching is
// case-insensitive and covers subdomains via dot-boundary suffix (so
// chat.openai.com -> chatgpt, but notchatgpt.com does NOT match).
//
// KNOWN LIMITATION (accepted): Google AI Overview clicks arrive with a plain
// www.google.com referrer — indistinguishable from organic search client-side.
// They stay classified as regular google.com referrals rather than guessing.
export const AI_SOURCES = {
  chatgpt: ['chatgpt.com', 'openai.com'],
  perplexity: ['perplexity.ai'],
  gemini: ['gemini.google.com'],
  claude: ['claude.ai'],
  copilot: ['copilot.microsoft.com'],
};

const AI_SOURCE_HOSTS = Object.entries(AI_SOURCES).flatMap(([source, hosts]) =>
  hosts.map((h) => [h.toLowerCase(), source]),
);

export function classifyAiSource(referrerDomain) {
  if (!referrerDomain || typeof referrerDomain !== 'string') return null;
  const host = referrerDomain.trim().toLowerCase();
  if (!host) return null;
  for (const [h, source] of AI_SOURCE_HOSTS) {
    if (host === h || host.endsWith('.' + h)) return source;
  }
  return null;
}

// ---- Salt rotation helpers (Umami crypto.ts:getSalt) -----------------------
function startOfDayUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfWeekUTC(d) {
  // date-fns startOfWeek default Sunday
  const day = d.getUTCDay(); // 0=Sun
  const diff = day;
  const s = new Date(d);
  s.setUTCDate(d.getUTCDate() - diff);
  return startOfDayUTC(s);
}
function startOfMonthUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function startOfHourUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
}

export function getSalt(rotation, date) {
  const d = date instanceof Date ? date : new Date(date);
  let start;
  if (rotation === 'week') start = startOfWeekUTC(d);
  else if (rotation === 'month') start = startOfMonthUTC(d);
  else start = startOfDayUTC(d); // 'day' default
  // Umami: hash(start.toUTCString())
  return crypto.createHash('sha512').update(start.toUTCString()).digest('hex');
}

export function getSaltRotation() {
  const v = (getEnv('SALT_ROTATION') || 'day').toLowerCase();
  if (v === 'week' || v === 'month' || v === 'hour') return v;
  return 'day';
}

// ---- Visitor hash — supports both legacy YYYY-MM-DD and new rotation -------
export function generateVisitorHash(websiteId, ip, ua, dateStrOrDate, rotation) {
  // Backward compat: 4th arg may be '2026-01-01' string or Date
  let salt;
  if (dateStrOrDate instanceof Date) {
    const rot = rotation || getSaltRotation();
    salt = getSalt(rot, dateStrOrDate);
  } else if (typeof dateStrOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStrOrDate)) {
    // Legacy path — keep sha256(website:ip:ua:YYYY-MM-DD) for test compat
    // but if rotation != day we must compute proper salt for that date
    const rot = rotation || getSaltRotation();
    if (rot === 'day') {
      const msg = `${websiteId}:${ip}:${ua}:${dateStrOrDate}`;
      return crypto.createHash('sha256').update(msg).digest('hex');
    }
    // For week/month, derive salt from that calendar day
    const d = new Date(dateStrOrDate + 'T00:00:00Z');
    salt = getSalt(rot, d);
  } else if (typeof dateStrOrDate === 'string') {
    // treat as already-computed salt or raw
    salt = dateStrOrDate;
  } else {
    // no date provided — use now
    salt = getSalt(getSaltRotation(), new Date());
  }

  if (salt && !/^\d{4}-\d{2}-\d{2}$/.test(salt)) {
    // New path: hash(website:ip:ua:salt) with sha256 for fixed 64 hex length
    const msg = `${websiteId}:${ip}:${ua}:${salt}`;
    return crypto.createHash('sha256').update(msg).digest('hex');
  }
  // fallback legacy (should not happen)
  const msg = `${websiteId}:${ip}:${ua}:${salt}`;
  return crypto.createHash('sha256').update(msg).digest('hex');
}

// ---- UUID validation for the website id payload field ----
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- Resolve the request host from Origin or Referer ----
export function requestHost(request, payloadReferrer) {
  const origin = request.headers.get('origin') || '';
  const referrer = request.headers.get('referer') || payloadReferrer || '';
  let host = '';
  if (origin) {
    try {
      host = new URL(origin).hostname.toLowerCase();
    } catch {}
  } else if (referrer) {
    try {
      host = new URL(referrer).hostname.toLowerCase();
    } catch {}
  }
  return host;
}

// ---- Synchronous, cheap gates. Returns { ok:false, status } to reject early,
// or { ok:true, ua, ip, country } with the validated basics. ----
export function preflight(request, opts) {
  if (request.method !== 'POST') return { ok: false, status: 204 };

  const length = parseInt(request.headers.get('content-length') || '0', 10);
  if (length > LIMITS.MAX_BODY_BYTES) return { ok: false, status: 204 };

  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) return { ok: false, status: 204 };

  // Robust IP extraction (11 headers, strip port, ipv4-mapped) — Umami parity
  const ip = getIpAddress(request.headers) || '127.0.0.1';

  // IP block — check IGNORE_IP (env or opts.ignoreList for Worker)
  const ignoreList = (opts && opts.ignoreList) || getIgnoreList(opts && opts.envIgnore);
  if (hasBlockedIp(ip, ignoreList)) return { ok: false, status: 204 };

  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cloudfront-viewer-country') ||
    request.headers.get('eo-ipcountry') ||
    request.headers.get('x-umami-client-country') ||
    null;

  return { ok: true, ua, ip, country };
}

// ---- Normalize one raw beacon event into RPC params (or null to drop).
// `site` = { domain, allowed_domains }. `ctx` = { ua, ip, country, host }. ----
export function buildEventParams(raw, site, ctx) {
  if (!raw || typeof raw !== 'object') return null;

  const websiteId = raw.w;
  if (!websiteId || !UUID_RE.test(websiteId)) return null;

  const parsedUA = parseUA(ctx.ua);
  // Salted visitor hash — rotation-aware (day/week/month), Umami parity
  const now = new Date();
  const rotation = (ctx && ctx.saltRotation) || getSaltRotation();
  // Keep compatibility: generateVisitorHash handles Date + rotation
  const visitorHash = generateVisitorHash(websiteId, ctx.ip, ctx.ua, now, rotation);

  // Heartbeat: delta seconds, clamped 0..120 by both layers.
  if (typeof raw.d === 'number' && Number.isFinite(raw.d) && (raw.n === 'heartbeat' || !raw.n)) {
    return {
      type: 'heartbeat',
      rpc: 'ingest_heartbeat',
      payload: {
        p_website_id: websiteId,
        p_visitor_hash: visitorHash,
        p_delta_seconds: Math.min(Math.max(Math.round(raw.d), 0), 120),
      },
    };
  }

  const eventName = raw.n === 'pageview' || !raw.n ? null : str(raw.n, LIMITS.EVENT_NAME);
  if (raw.n && raw.n !== 'pageview' && !eventName) return null; // junk name

  // CSV formula injection defense — reject names starting with = + - @ tab
  if (eventName && !isSafeString(eventName)) return null;
  // Also reject titles that look like formulas (defense-in-depth, not breaking path)
  const titleRaw = str(raw.t, LIMITS.TITLE);
  if (titleRaw && !isSafeString(titleRaw) && raw.t && FORMULA_TRIGGER_RE.test(String(raw.t).trim())) {
    // drop title but keep event — title is not security-critical for pageview counting
    // we null it rather than dropping whole event to keep analytics resilient
  }

  let eventData = null;
  if (raw.p !== null && raw.p !== undefined) {
    try {
      const asJson = typeof raw.p === 'string' ? JSON.parse(raw.p) : raw.p;
      eventData = asJson && typeof asJson === 'object' && !Array.isArray(asJson) ? asJson : { value: asJson };
    } catch {
      eventData = null;
    }
  }

  // Path handling — respect REMOVE_TRAILING_SLASH and keep hash
  const removeTrailingSlashOpt =
    ctx && typeof ctx.removeTrailingSlash === 'boolean'
      ? ctx.removeTrailingSlash
      : getEnv('REMOVE_TRAILING_SLASH') === 'true';
  const sanitizedPath = sanitizePath(raw.u, { removeTrailingSlash: removeTrailingSlashOpt });

  // Final title safeness: if title starts with formula trigger, null it
  let finalTitle = titleRaw;
  if (finalTitle && FORMULA_TRIGGER_RE.test(finalTitle.trim())) finalTitle = null;

  // UTM + click IDs from url_query (e.g. ?utm_source=google&gclid=xyz)
  const utm = extractUtmParams(raw.q);
  const refDetails = getReferrerDetails(raw.r, site.domain);
  // AI chatbot source tag (chatgpt / perplexity / gemini / claude / copilot)
  const aiSource = classifyAiSource(refDetails.domain);

  return {
    type: 'event',
    rpc: 'ingest_event',
    payload: {
      p_website_id: websiteId,
      p_visitor_hash: visitorHash,
      p_hostname: str(ctx.host, LIMITS.HOSTNAME) || site.domain,
      p_browser: parsedUA.browser,
      p_os: parsedUA.os,
      p_device: parsedUA.device,
      p_screen: str(raw.s, LIMITS.SCREEN),
      p_language: str(raw.l, LIMITS.LANGUAGE),
      p_country: str(ctx.country, LIMITS.COUNTRY),
      p_url_path: sanitizedPath,
      p_url_query: str(raw.q, LIMITS.QUERY),
      p_title: finalTitle,
      p_referrer_domain: refDetails.domain,
      p_referrer_source: aiSource,
      p_referrer_path: refDetails.path,
      p_referrer_query: refDetails.query,
      p_utm_source: utm.utm_source,
      p_utm_medium: utm.utm_medium,
      p_utm_campaign: utm.utm_campaign,
      p_utm_content: utm.utm_content,
      p_utm_term: utm.utm_term,
      p_gclid: utm.gclid,
      p_fbclid: utm.fbclid,
      p_msclkid: utm.msclkid,
      p_ttclid: utm.ttclid,
      p_lifatid: utm.lifatid,
      p_twclid: utm.twclid,
      p_event_name: eventName,
      p_event_data: eventData,
    },
  };
}

// ---- Accept either a single event object or a batch array (cap MAX_BATCH).
// Returns an array of raw events (possibly empty). ----
export function extractEvents(payload) {
  if (Array.isArray(payload)) return payload.slice(0, LIMITS.MAX_BATCH).filter((e) => e && typeof e === 'object');
  if (payload && typeof payload === 'object') return [payload];
  return [];
}

// ---- Build the ONE-request batch body for the ingest_events RPC.
// `calls` must be validated, non-empty buildEventParams outputs that all share
// the same website id (the collect endpoints enforce homogeneity before this).
// Each element drops p_website_id (hoisted to the top level) and tags its type;
// the RPC restores identical semantics to N sequential legacy calls.
export function buildBatchRequest(calls) {
  if (!Array.isArray(calls) || calls.length === 0 || !calls[0].payload) return null;
  const websiteId = calls[0].payload.p_website_id;
  const elements = calls.map((c) => {
    const { p_website_id, ...rest } = c.payload;
    return { type: c.type === 'heartbeat' ? 'heartbeat' : 'event', ...rest };
  });
  return { p_website_id: websiteId, p_events: elements };
}

// ---- Transport shared by the Cloudflare Worker and the Next.js /c route:
// try the batched ingest_events RPC first (ONE round trip per beacon); if the
// RPC is missing (migration pending) or any transient failure occurs, fall
// back to the legacy per-event fan-out so beacons are never lost during
// rolling deploys.
//
// Returns a health report so callers can record failures:
//   { mode: 'batch' | 'legacy' | 'none', total: <events attempted>, failed: <n> }
// Never throws; individual event failures stay non-fatal by design.
export async function postIngest(supabaseUrl, serviceKey, batchBody, legacyCalls) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  if (
    supabaseUrl &&
    serviceKey &&
    batchBody &&
    Array.isArray(batchBody.p_events) &&
    batchBody.p_events.length > 0
  ) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/ingest_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batchBody),
      });
      if (res.ok) return { mode: 'batch', total: batchBody.p_events.length, failed: 0 };
    } catch {}
  }

  // Fallback: legacy per-event RPC fan-out (also the path when batching is
  // unavailable). Failures are counted, never thrown.
  if (supabaseUrl && serviceKey && Array.isArray(legacyCalls)) {
    const results = await Promise.all(
      legacyCalls.map(async (c) => {
        try {
          const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${c.rpc}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(c.payload),
          });
          return r.ok ? 0 : 1;
        } catch {
          return 1;
        }
      })
    );
    return { mode: 'legacy', total: legacyCalls.length, failed: results.reduce((a, b) => a + b, 0) };
  }

  return { mode: 'none', total: 0, failed: 0 };
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  // Brave + credentials:include requires explicit origin, not '*'.
  // Always echo request origin when present (first-party via CF Worker or dev cross-port).
  if (origin) {
    // Validate origin is http(s) to avoid reflecting javascript: etc.
    try {
      const u = new URL(origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        };
      }
    } catch {}
  }
  return CORS_HEADERS;
}

export function isLocalhostHost(host) {
  if (!host) return false;
  const h = String(host).toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h === '0.0.0.0'
  );
}
