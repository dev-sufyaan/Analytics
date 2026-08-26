// scripts/test/tracker.test.mjs
// Sandboxed DOM test of the REAL built tracker (apps/web/public/t.js — synced
// byte-for-byte from packages/tracker/dist by the build). Loads the minified
// IIFE with stubbed browser globals and asserts exact payloads for: initial
// pageview, SPA nav (push/replace/popstate), custom events, batching, heartbeat
// deltas (hide + periodic), dedupe, DNT, localhost, and malformed input.
// No network.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test, eq, ok, run } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACKER = path.resolve(__dirname, '../../apps/web/public/t.js');
const DIST = path.resolve(__dirname, '../../packages/tracker/dist/t.js');

const BASE_NOW = 1_700_000_000_000;

function loadTracker(attrs = {}, locOverride = {}) {
  const calls = []; // every post attempt: { url, body, transport }
  const NOW = { value: BASE_NOW };
  const docListeners = {};
  const winListeners = {};
  const timeouts = [];
  const intervals = [];

  const script = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    src: attrs.src || 'https://aether.dev/t.js',
  };

  const location = {
    hostname: locOverride.hostname || 'aether.dev',
    pathname: locOverride.pathname || '/',
    protocol: locOverride.protocol || 'https:',
    search: locOverride.search || '',
    href:
      (locOverride.protocol || 'https:') +
      '//' +
      (locOverride.hostname || 'aether.dev') +
      (locOverride.pathname || '/'),
  };

  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.console = console;
  sandbox.JSON = JSON;
  sandbox.Math = Math;
  sandbox.URL = URL;
  sandbox.Blob = class {
    constructor(parts) {
      this.parts = parts;
    }
  };
  sandbox.Date = class extends Date {
    static now() {
      return NOW.value;
    }
  };
  sandbox.setTimeout = (fn) => {
    timeouts.push(fn);
    return timeouts.length;
  };
  sandbox.clearTimeout = () => {};
  sandbox.setInterval = (fn) => {
    intervals.push(fn);
    return intervals.length;
  };
  sandbox.clearInterval = () => {};
  sandbox.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body), transport: 'fetch' });
    return Promise.resolve({ ok: true });
  };
  sandbox.location = location;
  sandbox.navigator = {
    language: 'en-US',
    doNotTrack: attrs.doNotTrack || null,
    sendBeacon: attrs.beaconFails
      ? () => false
      : (url, blob) => {
          calls.push({ url, body: JSON.parse(blob.parts[0]), transport: 'beacon' });
          return true;
        },
  };
  sandbox.screen = { width: 1920, height: 1080 };
  sandbox.history = {
    pushState: function (_s, _t, url) {
      location.pathname = String(url);
    },
    replaceState: function (_s, _t, url) {
      location.pathname = String(url);
    },
  };
  sandbox.document = {
    currentScript: script,
    referrer: attrs.referrer || '',
    title: 'Test Page',
    readyState: 'complete',
    visibilityState: 'visible',
    querySelector: () => script,
    addEventListener: (t, cb) => {
      docListeners[t] = cb;
    },
  };
  sandbox.addEventListener = (t, cb) => {
    winListeners[t] = cb;
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(TRACKER, 'utf8'), sandbox);

  return {
    sandbox,
    calls,
    setNow: (ms) => {
      NOW.value = ms;
    },
    advance: (ms) => {
      NOW.value += ms;
    },
    dispatchDoc: (type) => docListeners[type] && docListeners[type](),
    dispatchWin: (type) => winListeners[type] && winListeners[type](),
    flushQueuedTimers: () => {
      while (timeouts.length) timeouts.shift()();
    },
    tickInterval: () => intervals.forEach((fn) => fn()),
  };
}

// A call body is either a single event object or an array of events (batch).
function flatBodies(t) {
  return t.calls.flatMap((c) => (Array.isArray(c.body) ? c.body : [c.body]));
}

const tests = [
  test('build hygiene: served t.js === dist bundle (single source of truth)', () => {
    eq(fs.readFileSync(TRACKER, 'utf8'), fs.readFileSync(DIST, 'utf8'));
  }),

  test('tracker: fires an initial pageview via sendBeacon to script origin /c', () => {
    const t = loadTracker({ 'data-web': 'WEBID' });
    t.flushQueuedTimers(); // 200ms batch timer
    eq(t.calls.length, 1, 'one call after flush');
    eq(t.calls[0].transport, 'beacon', 'sendBeacon is the primary transport');
    const p = flatBodies(t)[0];
    eq(p.w, 'WEBID', 'website id from data-web');
    eq(p.n, 'pageview', 'initial is pageview');
    eq(p.u, '/', 'path defaults to /');
    eq(p.h, 'aether.dev', 'hostname captured');
    eq(p.s, '1920x1080', 'screen captured');
    eq(p.l, 'en-US', 'language captured');
    eq(t.calls[0].url, 'https://aether.dev/c', 'posts to script origin /c');
  }),

  test('tracker: falls back to fetch(keepalive) when sendBeacon fails', () => {
    const t = loadTracker({ 'data-web': 'W', beaconFails: true });
    t.flushQueuedTimers();
    eq(t.calls.length, 1, 'exactly one delivery attempt resolved to fetch');
    eq(t.calls[0].transport, 'fetch', 'fetch keepalive used');
  }),

  test('tracker: data-host override changes collect URL', () => {
    const t = loadTracker({ 'data-web': 'W', 'data-host': 'https://collect.other.com/' });
    t.flushQueuedTimers();
    eq(t.calls[0].url, 'https://collect.other.com/c', 'uses data-host (trailing slash stripped)');
  }),

  test('tracker: batches rapid events into ONE request (200ms window)', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers(); // flush initial pageview first
    eq(t.calls.length, 1, 'initial pageview sent alone');
    t.sandbox.window.analytics.track('signup', { plan: 'pro' });
    t.sandbox.window.analytics.track('click', { x: 1 });
    t.sandbox.window.analytics.track('scroll');
    eq(t.calls.length, 1, 'nothing sent before flush window');
    t.flushQueuedTimers();
    eq(t.calls.length, 2, 'one additional batched request');
    ok(Array.isArray(t.calls[1].body), 'batch body is an array');
    eq(t.calls[1].body.length, 3, 'all three events in transit');
    eq(t.calls[1].body[0].n, 'signup');
    eq(t.calls[1].body[0].p.plan, 'pro', 'event props forwarded');
    eq(t.calls[1].body[2].n, 'scroll');
  }),

  test('tracker: SPA pushState fires pageview with new path', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.history.pushState({}, '', '/pricing');
    t.flushQueuedTimers();
    const pv = flatBodies(t).find((b) => b.u === '/pricing');
    ok(pv, 'pageview for /pricing sent');
    eq(pv.n, 'pageview');
  }),

  test('tracker: replaceState + popstate navigations tracked', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.history.replaceState({}, '', '/replaced');
    t.sandbox.location.pathname = '/back';
    t.dispatchWin('popstate');
    t.flushQueuedTimers();
    const paths = flatBodies(t).map((b) => b.u);
    ok(paths.includes('/replaced'), 'replaceState nav tracked');
    ok(paths.includes('/back'), 'popstate nav tracked');
  }),

  test('tracker: hash navigation tracked via hashchange', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.location.hash = '#section-2';
    t.dispatchWin('hashchange');
    t.flushQueuedTimers();
    const paths = flatBodies(t).map((b) => b.u);
    ok(paths.includes('/#section-2'), 'hashchange nav tracked');
  }),

  test('tracker: same-path navigation does NOT double count', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.history.pushState({}, '', '/'); // same path, only query changes
    t.flushQueuedTimers();
    eq(flatBodies(t).filter((b) => b.n === 'pageview').length, 1, 'only initial pageview');
  }),

  test('tracker: hide sends heartbeat delta once and flushes immediately', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.advance(5000);
    t.sandbox.document.visibilityState = 'hidden';
    t.dispatchDoc('visibilitychange');
    const hbs = flatBodies(t).filter((b) => b.n === 'heartbeat');
    eq(hbs.length, 1, 'exactly one heartbeat on hide');
    eq(hbs[0].d, 5, 'delta = 5s');
    // immediate second hide: cursor was reset -> 0s delta suppressed
    t.dispatchDoc('visibilitychange');
    eq(flatBodies(t).filter((b) => b.n === 'heartbeat').length, 1, 'zero-delta beat suppressed');
  }),

  test('tracker: heartbeat clamps to 120s max', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.advance(999999);
    t.sandbox.document.visibilityState = 'hidden';
    t.dispatchDoc('visibilitychange');
    eq(flatBodies(t).find((b) => b.n === 'heartbeat').d, 120, 'clamped to 120');
  }),

  test('tracker: periodic visible beat keeps presence fresh (90s)', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.advance(90000);
    t.tickInterval(); // visible -> beat fires
    t.flushQueuedTimers();
    let hbs = flatBodies(t).filter((b) => b.n === 'heartbeat');
    eq(hbs.length, 1, 'interval beat sent while visible');
    eq(hbs[0].d, 90, 'delta = 90s');
    // hidden tab: interval must NOT beat
    t.sandbox.document.visibilityState = 'hidden';
    t.advance(90000);
    t.tickInterval();
    t.flushQueuedTimers();
    hbs = flatBodies(t).filter((b) => b.n === 'heartbeat');
    eq(hbs.length, 1, 'no beat while hidden');
  }),

  test('tracker: 1s dedupe of identical payloads', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.window.analytics.track('click', { x: 1 });
    t.sandbox.window.analytics.track('click', { x: 1 }); // identical, <1s
    t.flushQueuedTimers();
    eq(t.calls.length, 2, 'second identical event deduped (only initial + one batch)');
    const single = t.calls[1].body;
    ok(!Array.isArray(single), 'single event posts as an object');
    eq(single.n, 'click');
    t.advance(1001);
    t.sandbox.window.analytics.track('click', { x: 1 }); // identical but >1s
    t.flushQueuedTimers();
    eq(t.calls.length, 3, 'sent again after 1s');
  }),

  test('tracker: malformed track() calls are ignored safely', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.window.analytics.track('');
    t.sandbox.window.analytics.track(null);
    t.sandbox.window.analytics.track(undefined);
    t.sandbox.window.analytics.track(123);
    t.sandbox.window.analytics.track('ok', 'not-an-object');
    t.flushQueuedTimers();
    const events = flatBodies(t).filter((b) => b.n !== 'pageview');
    eq(events.length, 1, 'only the valid event got through');
    eq(events[0].n, 'ok');
    eq(events[0].p, null, 'non-object props normalized to null');
  }),

  test('tracker: respects DNT when data-respect-dnt set', () => {
    const t = loadTracker({ 'data-web': 'W', 'data-respect-dnt': 'true', doNotTrack: '1' });
    t.flushQueuedTimers();
    eq(t.calls.length, 0, 'no calls when DNT honored');
  }),

  test('tracker: ignores localhost unless data-dev', () => {
    const silent = loadTracker({ 'data-web': 'W' }, { hostname: 'localhost' });
    silent.flushQueuedTimers();
    eq(silent.calls.length, 0, 'localhost ignored by default');
    const dev = loadTracker({ 'data-web': 'W', 'data-dev': 'true' }, { hostname: 'localhost' });
    dev.flushQueuedTimers();
    eq(dev.calls.length, 1, 'localhost allowed with data-dev');
  }),

  test('tracker: nothing lost on unload — pagehide beats + flushes pending queue', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.window.analytics.track('exit_intent', { why: 'demo' }); // queued, not sent
    eq(t.calls.length, 1, 'still only the initial pageview so far');
    t.advance(3000);
    t.dispatchWin('pagehide');
    const flat = flatBodies(t);
    ok(flat.some((b) => b.n === 'exit_intent'), 'queued event flushed on pagehide');
    ok(flat.some((b) => b.n === 'heartbeat' && b.d === 3), 'final beat included');
  }),

  test('tracker: supports data-website-id alias and window.umami global', () => {
    const t = loadTracker({ 'data-website-id': 'UMAMI-WEBSITE-ID' });
    t.flushQueuedTimers();
    eq(t.calls.length, 1);
    eq(t.calls[0].body.w, 'UMAMI-WEBSITE-ID');
    ok(t.sandbox.window.umami, 'window.umami is defined');
    ok(t.sandbox.window.sa, 'window.sa is defined');

    // Test umami track with object payload
    t.sandbox.window.umami.track('custom_umami', { plan: 'growth' });
    t.flushQueuedTimers();
    const flat = flatBodies(t);
    const ev = flat.find((b) => b.n === 'custom_umami');
    ok(ev, 'umami custom event sent');
    eq(ev.p.plan, 'growth');
  }),

  test('tracker: supports identify API and persists distinct id', () => {
    const t = loadTracker({ 'data-web': 'W' });
    t.flushQueuedTimers();
    t.sandbox.window.analytics.identify('usr_999', { role: 'admin' });
    t.flushQueuedTimers();
    const flat = flatBodies(t);
    const idEv = flat.find((b) => b.n === 'identify');
    ok(idEv, 'identify event sent');
    eq(idEv.id, 'usr_999');
    eq(idEv.p.role, 'admin');

    // Subsequent events inherit the identified id
    t.advance(1001);
    t.sandbox.window.analytics.track('subsequent_action');
    t.flushQueuedTimers();
    const subEv = flatBodies(t).find((b) => b.n === 'subsequent_action');
    ok(subEv, 'subsequent action sent');
    eq(subEv.id, 'usr_999', 'retains identified distinctId');
  }),

  test('tracker: data-domains restricts tracking to specified hostnames', () => {
    const allowed = loadTracker({ 'data-web': 'W', 'data-domains': 'mysite.com, app.mysite.com' }, { hostname: 'app.mysite.com' });
    allowed.flushQueuedTimers();
    eq(allowed.calls.length, 1, 'allowed domain tracks');

    const blocked = loadTracker({ 'data-web': 'W', 'data-domains': 'mysite.com, app.mysite.com' }, { hostname: 'staging.other.com' });
    blocked.flushQueuedTimers();
    eq(blocked.calls.length, 0, 'non-allowed domain ignored');
  }),

  test('tracker: custom data-endpoint changes collect path', () => {
    const t = loadTracker({ 'data-web': 'W', 'data-endpoint': '/api/send' });
    t.flushQueuedTimers();
    eq(t.calls.length, 1);
    ok(t.calls[0].url.endsWith('/api/send'), 'posts to /api/send');
  }),
];

run('Tracker (sandbox, built t.js)', tests);

