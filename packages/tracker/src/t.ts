// packages/tracker/src/t.ts
// Analytics Tracker — 0 dependencies, privacy-first, no cookies.
// Budget: <= 1.5 KB gzip (checked by build.mjs).
//
// Behaviour:
//   - auto pageview on load; pushState/replaceState/popstate SPA hooks
//   - window.analytics.track(name, props) custom events
//   - events are queued and flushed as ONE beacon every ~200ms (or when 10
//     are pending); flush is immediate on hide/pagehide
//   - duration = delta seconds since the last beat, sent on hide/pagehide;
//     a 90s interval beat while visible keeps realtime + duration honest
//     (deltas are clamped to <=120s server-side, so accuracy is preserved
//     while halving heartbeat request volume on free-tier hosting)
//   - sendBeacon first, fetch(keepalive) fallback
//   - identical payload within 1s is deduped; DNT + localhost respected

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var scriptEl =
    document.currentScript ||
    (document.querySelector && document.querySelector('script[data-web]'));
  if (!scriptEl) return;

  var websiteId = scriptEl.getAttribute('data-web');
  if (!websiteId) return;

  var isDev = scriptEl.getAttribute('data-dev') === 'true';
  var respectDnt = scriptEl.getAttribute('data-respect-dnt') === 'true';
  var customHost = scriptEl.getAttribute('data-host');

  if (respectDnt && navigator.doNotTrack === '1') return;

  var loc = window.location;
  var isLocalhost =
    loc.hostname === 'localhost' ||
    loc.hostname === '127.0.0.1' ||
    loc.hostname === '::1' ||
    loc.hostname.endsWith('.local');
  if (!isDev && isLocalhost) return;

  // Collect URL: data-host > script src origin > same-origin /c
  var collectHost = customHost;
  if (!collectHost && scriptEl.src) {
    try {
      var srcUrl = new URL(scriptEl.src, loc.href);
      if (srcUrl.protocol.indexOf('http') === 0) collectHost = srcUrl.origin;
    } catch (_) {}
  }
  var collectUrl = (collectHost || '').replace(/\/$/, '') + '/c';

  var lastPayload = '';
  var lastTime = 0;
  var beatCursor = Date.now();
  var queue = [];
  var flushTimer = null;

  function makePayload(eventName, eventData, deltaSeconds) {
    return {
      w: websiteId,
      n: eventName || 'pageview',
      u: (loc.pathname || '/') + (loc.hash || ''),
      h: loc.hostname || '',
      q: loc.search || null,
      r: document.referrer || null,
      t: document.title || null,
      s: screen.width + 'x' + screen.height,
      l: navigator.language || null,
      d: deltaSeconds === undefined ? null : deltaSeconds,
      p: eventData || null,
    };
  }

  function post(json) {
    try {
      if (navigator.sendBeacon) {
        if (navigator.sendBeacon(collectUrl, new Blob([json], { type: 'application/json' }))) return;
      }
      fetch(collectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (_) {}
  }

  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!queue.length) return;
    var body = queue.length === 1 ? queue[0] : JSON.stringify(queue.map(JSON.parse));
    queue = [];
    post(body);
  }

  function enqueue(payload) {
    var json = JSON.stringify(payload);
    // 1s dedupe of identical payloads
    if (json === lastPayload && Date.now() - lastTime < 1000) return;
    lastPayload = json;
    lastTime = Date.now();
    queue.push(json);
    if (queue.length >= 10) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 200);
  }

  function trackPageview() {
    beatCursor = Date.now();
    enqueue(makePayload('pageview'));
  }

  function trackEvent(name, props) {
    if (!name || typeof name !== 'string') return;
    enqueue(makePayload(name, props && typeof props === 'object' ? props : null));
  }

  function beat() {
    var now = Date.now();
    var delta = Math.round((now - beatCursor) / 1000);
    beatCursor = now;
    if (delta > 0) enqueue(makePayload('heartbeat', null, delta > 120 ? 120 : delta));
  }

  // SPA navigation
  var currentPath = (loc.pathname || '/') + (loc.hash || '');
  function handleNavigation() {
    var newPath = (loc.pathname || '/') + (loc.hash || '');
    if (currentPath !== newPath) {
      currentPath = newPath;
      trackPageview();
    }
  }

  var origPush = history.pushState;
  if (origPush)
    history.pushState = function () {
      origPush.apply(this, arguments);
      handleNavigation();
    };
  var origReplace = history.replaceState;
  if (origReplace)
    history.replaceState = function () {
      origReplace.apply(this, arguments);
      handleNavigation();
    };
  window.addEventListener('popstate', handleNavigation);
  window.addEventListener('hashchange', handleNavigation);

  // Duration on hide; immediate flush so nothing is lost on unload.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      beat();
      flush();
    } else {
      beatCursor = Date.now();
    }
  });
  window.addEventListener('pagehide', function () {
    beat();
    flush();
  });

  // Periodic visible heartbeat keeps "active visitors" and duration fresh.
  setInterval(function () {
    if (document.visibilityState === 'visible') beat();
  }, 90000);

  if (document.readyState === 'complete' || document.readyState === 'interactive') trackPageview();
  else document.addEventListener('DOMContentLoaded', trackPageview);

  window.analytics = { track: trackEvent, pageview: trackPageview, flush: flush };
})();
