// Next.js 15 instrumentation hook — server error tracking for PostHog.
// Called when a Server Component, Route Handler, or Server Action throws.
// Available by default in Next.js 15.5+ (no config needed).
// See: https://posthog.com/docs/libraries/next-js#capturing-server-side-exceptions
export async function register() {
  // Only register on Node runtime — Cloudflare workerd/edge ignores safely.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { PostHog } = await import('posthog-node');
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    if (key) {
      const client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });
      // Expose for onRequestError — module singleton survives per isolate.
      (globalThis as unknown as Record<string, unknown>).__posthog_server_client = client;
    }
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  const client = (globalThis as unknown as Record<string, unknown>).__posthog_server_client as
    | import('posthog-node').PostHog
    | undefined;
  if (!client) return;
  const distinctId =
    request.headers['x-posthog-distinct-id'] ||
    request.headers['cookie']?.match(/ph_.*?_posthog=([^;]+)/)?.[1] ||
    undefined;
  try {
    await client.captureException(err, distinctId ? String(distinctId) : undefined, {
      $current_url: request.path,
      $request_method: request.method,
      route_path: context?.routerKind ?? context?.routePath ?? request.path,
    });
    await client.flush();
  } catch {
    // never throw from error hook
  }
}
