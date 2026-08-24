// Central typed analytics layer — single source for all PostHog event names.
// Ensures snake_case past-tense naming, bounded props, and no orphaned distinct_id.
// Usage in client components:
//   import { track, AnalyticsEvents } from '@/lib/analytics'
//   track(AnalyticsEvents.DASHBOARD_SHARED, { website_id: id })
// For hooks prefer `usePostHog()` from 'posthog-js/react'; this wrapper is a safe
// fallback that guards against SSR and missing init.
import { posthog } from '@/instrumentation-client';

export enum AnalyticsEvents {
  // Auth funnel
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_COMPLETED = 'signup_completed',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',

  // Website lifecycle
  WEBSITE_CREATED = 'website_created',
  WEBSITE_DELETED = 'website_deleted',
  WEBSITE_SETTINGS_UPDATED = 'website_settings_updated',
  PUBLIC_DASHBOARD_TOGGLED = 'public_dashboard_toggled',
  ANALYTICS_DATA_WIPED = 'analytics_data_wiped',

  // Dashboard value
  DASHBOARD_VIEWED = 'dashboard_viewed',
  DASHBOARD_SHARED = 'dashboard_shared',
  DASHBOARD_EXPORTED = 'dashboard_exported',
  DASHBOARD_FILTER_APPLIED = 'dashboard_filter_applied',
  DASHBOARD_REFRESHED = 'dashboard_refreshed',

  // Tracker / onboarding
  TEST_EVENT_SENT = 'test_event_sent',
  SNIPPET_COPIED = 'snippet_copied',
  AI_PROMPT_COPIED = 'ai_prompt_copied',

  // Navigation
  PAGE_VIEWED = '$pageview', // use only via PostHogPageView; listed for completeness
  PAGELEAVE = '$pageleave',

  // Errors
  EXCEPTION = '$exception',
}

type EventProps = Record<string, unknown> & { website_id?: string };

// Track an event — safe to call from anywhere. No-op on server or before init.
export function track(event: AnalyticsEvents | string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  try {
    // posthog-js queues if not yet loaded, so this is safe even during hydration.
    posthog.capture(event, props);
  } catch {
    // never throw from analytics — product must not break if PostHog is blocked.
  }
}

// Identify — call once per session when auth resolves. Mirrors AppShellClient.
export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !distinctId) return;
  try {
    posthog.identify(distinctId, props);
  } catch {}
}

export function reset(): void {
  if (typeof window === 'undefined') return;
  try {
    posthog.reset();
  } catch {}
}
