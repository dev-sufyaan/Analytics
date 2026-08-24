// Server-side PostHog client (posthog-node) for capturing backend events.
//
// Best practices from https://posthog.com/docs/libraries/node:
//  - Reuse a single client across requests instead of creating one per call.
//  - `flushAt: 1, flushInterval: 0` flush immediately for short-lived
//    serverless functions so events are not dropped on cold freezes.
//  - Backend events must use a `distinct_id` that matches the one passed to
//    `posthog.identify()` on the client, otherwise they are orphaned from the
//    user's frontend sessions, replays, and error tracking.
//
// Only import this from Server Components, Route Handlers, or Server Actions.
import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!key || !host) {
    return null;
  }

  if (!client) {
    client = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }

  return client;
}

// Flush synchronously — use in short-lived handlers (Route Handlers, Server Actions)
// to guarantee delivery before the Worker / Lambda freezes. Prefer `flush()` over
// `shutdown()` per-request so the singleton stays reusable for the next request.
export async function flushPostHog(): Promise<void> {
  if (client) {
    await client.flush();
  }
}

// Call shutdown only on process exit (long-running server). Per-request handlers
// should call `flushPostHog()` instead — shutdown tears down the singleton.
export async function shutdownPostHog(): Promise<void> {
  if (client) {
    await client.shutdown();
    client = null;
  }
}
