// Client-side PostHog bootstrap.
// See: https://posthog.com/docs/libraries/next-js
import posthog from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && key) {
  posthog.init(key, {
    api_host: host,
    defaults: '2026-05-30',
    capture_pageview: false, // captured via PostHogPageView on SPA route changes
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
}

export { posthog };
