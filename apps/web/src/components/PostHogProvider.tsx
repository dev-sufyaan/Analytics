'use client';

import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { posthog } from '@/instrumentation-client';
import { PostHogPageView } from './PostHogPageView';

// Re-export the configured singleton so existing client components can keep
// importing `posthog` from here (e.g. `import { posthog } from '@/components/PostHogProvider'`).
export { posthog };

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}
