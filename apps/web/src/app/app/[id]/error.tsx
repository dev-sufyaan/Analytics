'use client';

import { ButtonOutline, ButtonPrimary } from '@analytics/ui';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
      <div className="max-w-lg bg-white border border-red-200 rounded-[4px] p-6 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-display text-[16px] font-medium text-black mb-1">Something went wrong</h2>
          <p className="font-display text-[13px] text-[#71717a] mb-4">
            {error.message || 'An unexpected error occurred while loading analytics.'}
          </p>
          <div className="flex gap-2">
            <ButtonPrimary type="button" onClick={reset}>TRY AGAIN</ButtonPrimary>
            <ButtonOutline type="button" onClick={() => (window.location.href = '/app')}>GO TO DASHBOARD</ButtonOutline>
          </div>
        </div>
      </div>
    </div>
  );
}
