'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

// App Router does not do a full page load on navigation, so `posthog-js`
// autocapture does not fire a `$pageview` on client-side route changes.
// This component captures one on every pathname+search change (including the first
// render), which is why `capture_pageview` is disabled in init.
// - pathname+searchParams ensures ?utm_* / ?gclid changes are tracked as new pageviews
// - window.origin + pathname ensures absolute $current_url (fixes invalid_heatmap_data GH#3606)
// - usePostHog() reads from PostHogProvider so we don't duplicate singleton init
// - Suspense wrapper is required because useSearchParams opts into CSR (Next.js 15)
function PageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname || !posthog) return;
    let url = window.origin + pathname;
    const search = searchParams?.toString();
    if (search) url += `?${search}`;
    posthog.capture('$pageview', {
      $current_url: url,
    });
  }, [pathname, searchParams, posthog]);

  return null;
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewInner />
    </Suspense>
  );
}
