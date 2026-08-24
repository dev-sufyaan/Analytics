'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { posthog } from '@/instrumentation-client';

// App Router does not do a full page load on navigation, so `posthog-js`
// autocapture does not fire a `$pageview` on client-side route changes.
// This component captures one on every pathname change (including the first
// render), which is why `capture_pageview` is disabled in the init options.
export function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    posthog.capture('$pageview', {
      $current_url: window.location.href,
    });
  }, [pathname]);

  return null;
}
