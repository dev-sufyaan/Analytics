// scripts/test/guards.test.mjs
// Pure unit tests for collect validation logic — no network required.
import {
  isBot,
  parseUA,
  sanitizePath,
  getReferrerDomain,
  generateVisitorHash,
  requestHost,
  preflight,
  extractEvents,
  buildEventParams,
  classifyAiSource,
  LIMITS,
  UUID_RE,
} from '../../apps/web/lib/ingest-guards.mjs';
import { test, assert, eq, ok, run } from './lib.mjs';

const SITE = { domain: 'example.com', allowed_domains: ['mirror.example.com'] };
const CTX = { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', ip: '1.2.3.4', country: 'US', host: 'example.com' };
const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const tests = [
  test('isBot: detects known crawlers', () => {
    assert(isBot('Googlebot/2.1'), 'googlebot');
    assert(isBot('Mozilla/5.0 (compatible; bingbot/2.0)'), 'bingbot');
    assert(isBot(''), 'empty UA is a bot');
    assert(isBot(null), 'null UA is a bot');
    assert(!isBot('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537'), 'real chrome not bot');
  }),

  test('isBot: case-insensitive, catches "bot" substring', () => {
    assert(isBot('Mozilla/5.0 WhatsApp/2.0'), 'whatsapp');
    assert(isBot('facebookexternalhit/1.1'), 'fb external hit');
  }),

  test('parseUA: browser/os/device resolution', () => {
    eq(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604').device, 'Mobile');
    eq(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604').os, 'iOS');
    eq(parseUA('Mozilla/5.0 (Windows NT 10.0) Chrome/120').os, 'Windows');
    eq(parseUA('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/604').os, 'macOS');
    eq(parseUA('Mozilla/5.0 (Linux; Android 13) Chrome/120').os, 'Android');
    eq(parseUA('Mozilla/5.0 (iPad; CPU OS 17_0) Safari/604').device, 'Tablet');
    eq(parseUA('curl/8.0').browser, 'Other');
    eq(parseUA(null).device, 'Desktop');
    // Edge must win over Chrome
    eq(parseUA('Mozilla/5.0 (Windows NT 10.0) Edge/120 Chrome/120').browser, 'Edge');
    eq(parseUA('Mozilla/5.0 (Windows NT 10.0) OPR/120').browser, 'Opera');
  }),

  test('sanitizePath: strips query, defaults to /', () => {
    eq(sanitizePath('/pricing?utm_source=news&gclid=x'), '/pricing');
    eq(sanitizePath('/a/b?x=1&y=2'), '/a/b');
    eq(sanitizePath(''), '/');
    eq(sanitizePath(null), '/');
    eq(sanitizePath('/'), '/');
  }),

  test('getReferrerDomain: drops self-referral, keeps others', () => {
    eq(getReferrerDomain('https://google.com/search', 'example.com'), 'google.com');
    eq(getReferrerDomain('https://example.com/page', 'example.com'), null, 'self referral dropped');
    eq(getReferrerDomain('https://sub.example.com/x', 'example.com'), null, 'subdomain self dropped');
    eq(getReferrerDomain('https://OTHER.com', 'example.com'), 'other.com');
    eq(getReferrerDomain(null, 'example.com'), null);
    eq(getReferrerDomain('not a url', 'example.com'), null);
  }),

  test('generateVisitorHash: deterministic + daily salt rotates', () => {
    const a = generateVisitorHash('w', '1.2.3.4', 'UA', '2026-01-01');
    const b = generateVisitorHash('w', '1.2.3.4', 'UA', '2026-01-01');
    eq(a, b, 'same inputs -> same hash');
    const c = generateVisitorHash('w', '1.2.3.4', 'UA', '2026-01-02');
    assert(a !== c, 'different UTC date -> different hash');
    const d = generateVisitorHash('w', '1.2.3.5', 'UA', '2026-01-01');
    assert(a !== d, 'different IP -> different hash');
    assert(/^[0-9a-f]{64}$/.test(a), 'sha256 hex');
  }),

  test('UUID_RE: validates website id', () => {
    ok(UUID_RE.test('f47ac10b-58cc-4372-a567-0e02b2c3d479'));
    assert(!UUID_RE.test('not-a-uuid'), 'rejects garbage');
    assert(!UUID_RE.test('F47AC10B-58CC-4372-A567-0E02B2C3D479'.toLowerCase().slice(0, 10)), 'rejects short');
  }),

  test('requestHost: prefers Origin, falls back to Referer', () => {
    const r1 = new Request('https://x/c', { method: 'POST', headers: { Origin: 'https://site.com' } });
    eq(requestHost(r1, null), 'site.com');
    const r2 = new Request('https://x/c', { method: 'POST', headers: { Referer: 'https://ref.com/p' } });
    eq(requestHost(r2, null), 'ref.com');
    const r3 = new Request('https://x/c', { method: 'POST', headers: { Referer: 'https://ref.com/p' } });
    eq(requestHost(r3, 'https://payload.com'), 'ref.com', 'origin empty -> referer');
  }),

  test('preflight: rejects bots, oversize, non-POST', async () => {
    const bot = new Request('https://x/c', { method: 'POST', headers: { 'user-agent': 'Googlebot/2.1' } });
    eq((await preflight(bot)).ok, false);
    const big = new Request('https://x/c', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0', 'content-length': '99999' },
      body: 'x',
    });
    eq((await preflight(big)).ok, false, 'oversize rejected');
    const get = new Request('https://x/c', { method: 'GET', headers: { 'user-agent': 'Mozilla/5.0' } });
    eq((await preflight(get)).ok, false, 'non-POST rejected');
  }),

  test('preflight: accepts a normal browser POST and extracts ip/country', async () => {
    const req = new Request('https://x/c', {
      method: 'POST',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
        'x-forwarded-for': '9.9.9.9, 10.0.0.1',
        'x-vercel-ip-country': 'DE',
        'content-length': '200',
      },
      body: '{}',
    });
    const p = await preflight(req);
    ok(p.ok, 'ok');
    eq(p.ip, '9.9.9.9', 'first hop of x-forwarded-for');
    eq(p.country, 'DE');
    ok(!isBot(p.ua));
  }),

  test('preflight: falls back to cf-connecting-ip', async () => {
    const req = new Request('https://x/c', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '5.5.5.5', 'content-length': '10' },
      body: '{}',
    });
    eq((await preflight(req)).ip, '5.5.5.5');
  }),

  // ---- batch extraction ----

  test('extractEvents: single object, array, and junk handling', () => {
    eq(extractEvents({ w: UUID }).length, 1, 'single object -> [event]');
    eq(extractEvents([{ w: UUID }, { w: UUID }]).length, 2, 'array passes through');
    eq(extractEvents('junk').length, 0, 'string rejected');
    eq(extractEvents(null).length, 0, 'null rejected');
    eq(extractEvents([null, 42, { w: UUID }]).length, 1, 'non-object entries filtered');
    const big = Array.from({ length: 50 }, () => ({ w: UUID }));
    eq(extractEvents(big).length, LIMITS.MAX_BATCH, 'batch capped at MAX_BATCH');
  }),

  // ---- buildEventParams ----

  test('buildEventParams: pageview mapped to null event_name with clean fields', () => {
    const c = buildEventParams(
      { w: UUID, n: 'pageview', u: '/pricing?utm_source=x&gclid=y', t: 'Pricing', s: '1920x1080', l: 'en-US' },
      SITE,
      CTX
    );
    ok(c && c.type === 'event' && c.rpc === 'ingest_event');
    eq(c.payload.p_event_name, null, 'pageview -> null event_name');
    eq(c.payload.p_url_path, '/pricing', 'query stripped from path');
    eq(c.payload.p_title, 'Pricing');
    eq(c.payload.p_country, 'US');
    eq(c.payload.p_browser, 'Chrome');
    ok(/^[0-9a-f]{64}$/.test(c.payload.p_visitor_hash), 'sha256 visitor hash');
  }),

  test('buildEventParams: heartbeat branch clamps delta', () => {
    const hi = buildEventParams({ w: UUID, d: 1000 }, SITE, CTX);
    eq(hi.type, 'heartbeat');
    eq(hi.rpc, 'ingest_heartbeat');
    eq(hi.payload.p_delta_seconds, 120, 'clamped high');
    const lo = buildEventParams({ w: UUID, n: 'heartbeat', d: -50 }, SITE, CTX);
    eq(lo.payload.p_delta_seconds, 0, 'clamped low');
    const nan = buildEventParams({ w: UUID, d: 'not-a-number' }, SITE, CTX);
    ok(!nan || nan.type === 'event', 'non-numeric d is not a heartbeat');
  }),

  test('buildEventParams: rejects bad website ids and junk names', () => {
    eq(buildEventParams({ w: 'not-a-uuid', u: '/' }, SITE, CTX), null, 'bad uuid dropped');
    eq(buildEventParams(null, SITE, CTX), null, 'null event dropped');
    eq(buildEventParams({ w: UUID, n: '   ' }, SITE, CTX), null, 'whitespace event name dropped');
  }),

  test('buildEventParams: truncates oversized free-text fields (server-side caps)', () => {
    const c = buildEventParams(
      {
        w: UUID,
        u: '/' + 'a'.repeat(5000),
        t: 'T'.repeat(5000),
        n: 'E'.repeat(5000),
        q: '?' + 'q'.repeat(5000),
        r: 'https://' + 'r'.repeat(5000) + '.com',
        l: 'L'.repeat(500),
      },
      SITE,
      CTX
    );
    ok(c.payload.p_url_path.length <= LIMITS.PATH, `path capped (${c.payload.p_url_path.length})`);
    ok(c.payload.p_title.length <= LIMITS.TITLE, `title capped (${c.payload.p_title.length})`);
    ok(c.payload.p_event_name.length <= LIMITS.EVENT_NAME, `event_name capped (${c.payload.p_event_name.length})`);
    ok(c.payload.p_url_query.length <= LIMITS.QUERY, `query capped (${c.payload.p_url_query.length})`);
    ok(c.payload.p_referrer_domain.length <= LIMITS.REFERRER, `referrer capped`);
    ok(c.payload.p_language.length <= LIMITS.LANGUAGE, `language capped`);
  }),

  test('buildEventParams: event props normalized to a JSON object', () => {
    eq(buildEventParams({ w: UUID, n: 'e', p: { a: 1 } }, SITE, CTX).payload.p_event_data.a, 1, 'object kept');
    eq(
      buildEventParams({ w: UUID, n: 'e', p: '42' }, SITE, CTX).payload.p_event_data.value,
      42,
      'JSON scalar wrapped'
    );
    eq(buildEventParams({ w: UUID, n: 'e', p: '{bad json' }, SITE, CTX).payload.p_event_data, null, 'junk nulled');
    eq(buildEventParams({ w: UUID, n: 'e', p: 'raw string' }, SITE, CTX).payload.p_event_data, null, 'non-JSON string nulled');
    eq(buildEventParams({ w: UUID, n: 'e' }, SITE, CTX).payload.p_event_data, null, 'absent nulled');
  }),

  test('buildEventParams: self-referral dropped via payload referrer too', () => {
    const c = buildEventParams(
      { w: UUID, r: 'https://www.example.com/landing' },
      SITE,
      { ...CTX, host: '' }
    );
    eq(c.payload.p_referrer_domain, null, 'self-referral nulled');
    eq(c.payload.p_hostname, 'example.com', 'hostname falls back to site domain');
  }),

  // ---- AI referrer classification (Core 5) ----

  test('classifyAiSource: exact hosts map to canonical labels', () => {
    eq(classifyAiSource('chatgpt.com'), 'chatgpt');
    eq(classifyAiSource('openai.com'), 'chatgpt');
    eq(classifyAiSource('perplexity.ai'), 'perplexity');
    eq(classifyAiSource('gemini.google.com'), 'gemini');
    eq(classifyAiSource('claude.ai'), 'claude');
    eq(classifyAiSource('copilot.microsoft.com'), 'copilot');
  }),

  test('classifyAiSource: subdomains, case, whitespace', () => {
    eq(classifyAiSource('chat.openai.com'), 'chatgpt', 'subdomain of openai.com');
    eq(classifyAiSource('www.perplexity.ai'), 'perplexity');
    eq(classifyAiSource('CHATGPT.COM'), 'chatgpt', 'case-insensitive');
    eq(classifyAiSource('  claude.ai  '), 'claude', 'trimmed');
  }),

  test('classifyAiSource: non-AI and boundary cases return null', () => {
    eq(classifyAiSource('google.com'), null, 'AI Overview stays organic (accepted limitation)');
    eq(classifyAiSource('notchatgpt.com'), null, 'no partial-suffix match');
    eq(classifyAiSource('chatgpt.com.evil.io'), null, 'suffix must be subdomain-boundary');
    eq(classifyAiSource('example.com'), null);
    eq(classifyAiSource(''), null);
    eq(classifyAiSource(null), null);
    eq(classifyAiSource(undefined), null);
    eq(classifyAiSource(12345), null);
  }),

  test('buildEventParams: attaches p_referrer_source from referrer', () => {
    const ai = buildEventParams({ w: UUID, u: '/x', r: 'https://chatgpt.com/backend-api/link' }, SITE, CTX);
    eq(ai.payload.p_referrer_source, 'chatgpt', 'AI referral tagged');
    const organic = buildEventParams({ w: UUID, u: '/x', r: 'https://www.google.com/search?q=x' }, SITE, CTX);
    eq(organic.payload.p_referrer_source, null, 'organic search untagged');
  }),

  // ---- Umami schema normalization & Adblocker evasion ----

  test('extractEvents: normalizes Umami format payload to standard internal schema', () => {
    const umamiPayload = {
      type: 'event',
      payload: {
        website: UUID,
        url: '/pricing?plan=pro',
        title: 'Pricing Plan',
        hostname: 'example.com',
        referrer: 'https://google.com/search',
        screen: '1920x1080',
        language: 'en-US',
        name: 'custom_conversion',
        data: { plan: 'pro', value: 99 },
      },
    };
    const events = extractEvents(umamiPayload);
    eq(events.length, 1, 'Umami payload extracted');
    const e = events[0];
    eq(e.w, UUID);
    eq(e.n, 'custom_conversion');
    eq(e.u, '/pricing');
    eq(e.q, '?plan=pro');
    eq(e.t, 'Pricing Plan');
    eq(e.h, 'example.com');
    eq(e.r, 'https://google.com/search');
    eq(e.s, '1920x1080');
    eq(e.l, 'en-US');
    eq(e.p.plan, 'pro');
    eq(e.p.value, 99);

    const call = buildEventParams(e, SITE, CTX);
    ok(call, 'built event params successfully');
    eq(call.payload.p_event_name, 'custom_conversion');
    eq(call.payload.p_event_data.value, 99);
  }),

  test('extractEvents: handles Umami identify payload', () => {
    const umamiIdentify = {
      type: 'identify',
      payload: {
        website: UUID,
        id: 'user_12345',
        data: { email: 'user@example.com', tier: 'premium' },
      },
    };
    const events = extractEvents(umamiIdentify);
    eq(events.length, 1);
    eq(events[0].w, UUID);
    eq(events[0].n, 'identify');
    eq(events[0].id, 'user_12345');
    eq(events[0].p.tier, 'premium');
  }),
];

run('Collect guards (unit, no network)', tests);

