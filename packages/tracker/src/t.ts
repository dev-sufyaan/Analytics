// packages/tracker/src/t.ts
// Analytics Tracker — 0 dependencies, privacy-first, adblocker-resilient.
// Budget: <= 1.5 KB gzip (enforced by build.mjs).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var doc = document;
  var win = window as any;
  var loc = win.location;
  var nav = win.navigator;
  var scr = win.screen;
  var hist = win.history;

  var sEl = doc.currentScript || (doc.querySelector && doc.querySelector('script[data-web],script[data-website-id]'));
  if (!sEl) return;

  var attr = function (k: string) { return sEl.getAttribute(k); };
  var websiteId = attr('data-web') || attr('data-website-id');
  if (!websiteId) return;

  if (attr('data-respect-dnt') === 'true' || attr('data-do-not-track') === 'true') {
    var dnt = nav.doNotTrack || win.doNotTrack || nav.msDoNotTrack;
    if (dnt === '1' || dnt === 1 || dnt === 'yes') return;
  }

  var host = loc.hostname || '';
  if (attr('data-dev') !== 'true' && (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local'))) return;

  var domains = attr('data-domains');
  if (domains && domains.split(',').map(function (d) { return d.trim().toLowerCase(); }).indexOf(host.toLowerCase()) === -1) return;

  var colHost = attr('data-host') || attr('data-host-url');
  if (!colHost && sEl.src) {
    try {
      var u = new URL(sEl.src, loc.href);
      if (u.protocol.indexOf('http') === 0) colHost = u.origin;
    } catch (_) {}
  }
  var ep = attr('data-endpoint') || attr('data-api') || '/c';
  var colUrl = (colHost || '').replace(/\/$/, '') + (ep.charAt(0) === '/' ? ep : '/' + ep);

  var autoPv = attr('data-auto-pageview') !== 'false' && attr('data-auto-track') !== 'false';
  var noSearch = attr('data-exclude-search') === 'true';
  var noHash = attr('data-exclude-hash') === 'true';

  var lastP = '';
  var lastT = 0;
  var beatCursor = Date.now();
  var q: any[] = [];
  var timer: any = null;
  var distId: string | undefined = undefined;

  function makePayload(n?: string, p?: any, d?: number | null, id?: string) {
    var r = doc.referrer || null;
    var o = loc.origin;
    var ref = (r && (r === o || r.indexOf(o + '/') === 0)) ? (r.slice(o.length) || '/') : r;
    return {
      w: websiteId,
      n: n || 'pageview',
      u: (loc.pathname || '/') + (noHash ? '' : (loc.hash || '')),
      h: host,
      q: noSearch ? null : (loc.search || null),
      r: ref,
      t: doc.title || null,
      s: scr ? scr.width + 'x' + scr.height : null,
      l: nav.language || null,
      d: d === undefined ? null : d,
      p: p || null,
      tag: attr('data-tag') || undefined,
      id: id || distId || undefined,
    };
  }

  function post(json: string) {
    try {
      if (nav.sendBeacon && nav.sendBeacon(colUrl, new Blob([json], { type: 'application/json' }))) return;
      if (typeof fetch === 'function') {
        fetch(colUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-umami-website-id': websiteId as string },
          body: json,
          keepalive: true,
          credentials: 'omit',
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!q.length) return;
    var b = q.length === 1 ? q[0] : JSON.stringify(q.map(function (x) { return JSON.parse(x); }));
    q = [];
    post(b);
  }

  function enq(p: any) {
    var j = JSON.stringify(p);
    if (j === lastP && Date.now() - lastT < 1000) return;
    lastP = j;
    lastT = Date.now();
    q.push(j);
    if (q.length >= 10) flush();
    else if (!timer) timer = setTimeout(flush, 200);
  }

  function trackPv(props?: any) {
    beatCursor = Date.now();
    enq(makePayload('pageview', props && typeof props === 'object' ? props : null));
  }

  function track(name?: any, props?: any) {
    if (!name) return trackPv();
    if (typeof name === 'object') return enq(makePayload(name.name || 'pageview', name.data || name));
    if (typeof name === 'function') {
      var c = name(makePayload());
      if (c) enq(c);
      return;
    }
    if (typeof name !== 'string') return;
    enq(makePayload(name, props && typeof props === 'object' ? props : null));
  }

  function identify(id: any, props?: any) {
    var next = typeof id === 'string' ? id : (id && id.id);
    if (next) distId = next;
    enq(makePayload('identify', typeof id === 'object' ? id : props, null, distId));
  }

  function beat() {
    var now = Date.now();
    var d = Math.round((now - beatCursor) / 1000);
    beatCursor = now;
    if (d > 0) enq(makePayload('heartbeat', null, d > 120 ? 120 : d));
  }

  function initClicks() {
    doc.addEventListener('click', function (e: MouseEvent) {
      var el = (e.target as any)?.closest?.('[data-event],[data-umami-event]');
      if (!el) return;
      var name = el.getAttribute('data-event') || el.getAttribute('data-umami-event');
      if (!name) return;
      var data: Record<string, string> = {};
      for (var i = 0; i < el.attributes.length; i++) {
        var m = el.attributes[i].name.match(/^data-(?:umami-)?event-([\w-_]+)$/);
        if (m && m[1]) data[m[1]] = el.attributes[i].value;
      }
      if (el.tagName === 'A' && el.href) {
        var h = el.href;
        if (el.target !== '_blank' && !e.ctrlKey && !e.shiftKey && !e.metaKey && !e.button && h.indexOf('javascript:') !== 0) {
          e.preventDefault();
          track(name, data);
          flush();
          setTimeout(function () { (el.target === '_top' && win.top ? win.top.location : loc).href = h; }, 40);
          return;
        }
      }
      track(name, data);
    }, true);
  }

  var curr = (loc.pathname || '/') + (noHash ? '' : (loc.hash || ''));
  function navCheck() {
    var n = (loc.pathname || '/') + (noHash ? '' : (loc.hash || ''));
    if (curr !== n) {
      curr = n;
      if (autoPv) trackPv();
    }
  }

  var hook = function (method: string) {
    var orig = hist ? hist[method] : null;
    if (orig) {
      hist[method] = function () {
        orig.apply(this, arguments);
        navCheck();
      };
    }
  };
  hook('pushState');
  hook('replaceState');
  win.addEventListener('popstate', navCheck);
  win.addEventListener('hashchange', navCheck);

  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') { beat(); flush(); }
    else beatCursor = Date.now();
  });
  win.addEventListener('pagehide', function () { beat(); flush(); });
  setInterval(function () { if (doc.visibilityState === 'visible') beat(); }, 90000);

  var api = { track: track, pageview: trackPv, identify: identify, flush: flush, getSession: function () { return { website: websiteId }; } };
  try { win.sa = win.umami = api; } catch (_) {}
  try { if (!win.analytics || !win.analytics.track) win.analytics = api; } catch (_) {}

  if (attr('data-auto-track') !== 'false') {
    initClicks();
    if (autoPv) {
      if (doc.readyState === 'complete' || doc.readyState === 'interactive') trackPv();
      else doc.addEventListener('DOMContentLoaded', function () { trackPv(); });
    }
  }
})();







