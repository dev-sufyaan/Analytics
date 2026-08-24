// Client-side PostHog bootstrap.
// See: https://posthog.com/docs/libraries/next-js
// Next.js 15.3+ instrumentation-client.ts is the canonical lightweight init.
// `defaults: '2026-05-30'` enables history_change pageview handling internally,
// but we keep `capture_pageview: false` and use PostHogPageView for 100% accurate
// initial-load + SPA coverage (UTM-aware) and to avoid double-counting.
// api_host '/ingest' routes through Next.js rewrites (next.config.mjs) → us.i.posthog.com
// for ad-blocker resilience (~30% lift). See https://posthog.com/docs/advanced/proxy/nextjs
import posthog from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (typeof window !== 'undefined' && key) {
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-05-30',
    capture_pageview: false, // manual via PostHogPageView (pathname+searchParams)
    capture_pageleave: true, // bounce / session duration
    capture_exceptions: true, // includes unhandled errors + rejections
    person_profiles: 'identified_only', // anon = cheaper, no person until identify
    session_recording: {
      maskAllInputs: true,
    },
    debug: process.env.NODE_ENV === 'development',
  });
}

export { posthog };
