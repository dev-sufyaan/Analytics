// packages/tracker/src/t.ts
// Aether Analytics Tracker - <= 1.5 KB gzip, 0 dependencies, privacy-first

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  const currentScript = document.currentScript as HTMLScriptElement | null;
  const scriptEl = currentScript || document.querySelector('script[data-web]');
  if (!scriptEl) return;

  const websiteId = scriptEl.getAttribute('data-web');
  if (!websiteId) return;

  const isDev = scriptEl.getAttribute('data-dev') === 'true';
  const respectDnt = scriptEl.getAttribute('data-respect-dnt') === 'true';
  const customHost = scriptEl.getAttribute('data-host');

  // Check DNT
  if (respectDnt && (navigator as any).doNotTrack === '1') {
    return;
  }

  // Check localhost / file: protocol
  const loc = window.location;
  const isFile = loc.protocol === 'file:';
  const isLocalhost =
    loc.hostname === 'localhost' ||
    loc.hostname === '127.0.0.1' ||
    loc.hostname === '::1' ||
    loc.hostname.endsWith('.local');

  // Ignore localhost only if not in dev mode and not a local file test
  if (!isDev && !isFile && isLocalhost) {
    return;
  }

  // Resolve collect URL:
  // 1. data-host attribute if provided
  // 2. script tag's origin (e.g. http://localhost:3000 or https://aether.dev)
  // 3. Fallback to current domain relative /c
  let collectHost = customHost;
  if (!collectHost && (scriptEl as HTMLScriptElement).src) {
    try {
      const srcUrl = new URL((scriptEl as HTMLScriptElement).src, window.location.href);
      if (srcUrl.protocol.startsWith('http')) {
        collectHost = srcUrl.origin;
      }
    } catch (_) {}
  }
  const collectUrl = collectHost ? `${collectHost.replace(/\/$/, '')}/c` : '/c';

  let lastPayload: string | null = null;
  let lastTime = Date.now();
  let beatCursor = Date.now();
  let hasSentHide = false;

  function send(payload: Record<string, any>) {
    const json = JSON.stringify(payload);
    // 1s debounce for exact duplicate payloads
    if (json === lastPayload && Date.now() - lastTime < 1000) {
      return;
    }
    lastPayload = json;
    lastTime = Date.now();

    // Use fetch with CORS & keepalive
    if (typeof fetch === 'function') {
      fetch(collectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        credentials: 'omit',
        mode: 'cors',
      }).catch(function () {});
    } else if (navigator.sendBeacon) {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        navigator.sendBeacon(collectUrl, blob);
      } catch (_) {}
    }
  }

  function getPayload(eventName?: string, eventData?: Record<string, any>, deltaSeconds?: number) {
    const l = window.location;
    // For file:// URLs, extract the filename/clean path
    const urlPath = l.protocol === 'file:'
      ? (l.pathname.split('/').pop() ? `/${l.pathname.split('/').pop()}` : '/')
      : l.pathname;

    return {
      w: websiteId,
      n: eventName || 'pageview',
      u: urlPath || '/',
      h: l.hostname || 'localhost',
      q: l.search || null,
      r: document.referrer || null,
      t: document.title || null,
      s: `${window.screen.width}x${window.screen.height}`,
      l: navigator.language || (navigator as any).userLanguage || null,
      d: deltaSeconds !== undefined ? deltaSeconds : null,
      p: eventData || null,
    };
  }

  function trackPageview() {
    beatCursor = Date.now();
    hasSentHide = false;
    send(getPayload('pageview'));
  }

  function trackEvent(name: string, props?: Record<string, any>) {
    if (!name) return;
    send(getPayload(name, props));
  }

  function sendHeartbeat() {
    if (hasSentHide) return;
    const now = Date.now();
    const elapsedSeconds = Math.round((now - beatCursor) / 1000);
    if (elapsedSeconds > 0) {
      hasSentHide = true;
      send(getPayload('heartbeat', undefined, Math.min(elapsedSeconds, 120)));
      beatCursor = now;
    }
  }

  // SPA navigation hook
  let currentPath = window.location.pathname;

  function handleNavigation() {
    if (currentPath !== window.location.pathname) {
      currentPath = window.location.pathname;
      trackPageview();
    }
  }

  // Intercept history.pushState and replaceState
  const origPush = history.pushState;
  if (origPush) {
    history.pushState = function () {
      origPush.apply(this, arguments as any);
      handleNavigation();
    };
  }

  const origReplace = history.replaceState;
  if (origReplace) {
    history.replaceState = function () {
      origReplace.apply(this, arguments as any);
      handleNavigation();
    };
  }

  window.addEventListener('popstate', handleNavigation);

  // Heartbeat & duration on hide/unload
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      sendHeartbeat();
    } else {
      beatCursor = Date.now();
      hasSentHide = false;
    }
  });

  window.addEventListener('pagehide', sendHeartbeat);

  // Initial pageview
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    trackPageview();
  } else {
    document.addEventListener('DOMContentLoaded', trackPageview);
  }

  // Expose global aether tracker
  (window as any).aether = {
    track: trackEvent,
    pageview: trackPageview,
  };
})();
