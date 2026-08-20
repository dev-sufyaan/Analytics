'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import { RealtimeData } from '@aether/db/types';
import {
  StatsCardTinted,
  PanelCard,
  DataTableHeader,
  DataTableRow,
  LiveDot,
} from '@aether/ui';
import { ArrowLeft } from 'lucide-react';

export default function RealtimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: websiteId } = use(params);
  const supabase = createBrowserClient();

  const [realtime, setRealtime] = useState<RealtimeData>({
    active_visitors: 0,
    active_pages: [],
  });

  const fetchRealtime = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_realtime_visitors', {
        p_website_id: websiteId,
      });
      if (data) setRealtime(data);
    } catch (e) {
      console.error('Error loading realtime data:', e);
    }
  }, [websiteId, supabase]);

  useEffect(() => {
    fetchRealtime();
    // Poll every 5 seconds as specified in agent.md
    const interval = setInterval(fetchRealtime, 5000);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const maxPageActive = realtime.active_pages && realtime.active_pages.length > 0
    ? Math.max(...realtime.active_pages.map((p) => p.count))
    : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#ebebeb]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/app/${websiteId}`}
              className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black transition-colors inline-flex items-center gap-1 mr-2"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>BACK TO OVERVIEW</span>
            </Link>
            <LiveDot />
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
              LIVE REALTIME FEED (POLLING 5S)
            </span>
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            Current Visitors
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <StatsCardTinted
          label="ACTIVE VISITORS (LAST 5 MIN)"
          value={realtime.active_visitors}
          variant="mint"
        />

        <div className="md:col-span-2">
          <PanelCard eyebrow="LIVE ACTIVITY" title="Pages Currently Being Viewed">
            {(!realtime.active_pages || realtime.active_pages.length === 0) ? (
              <div className="py-8 text-center text-[#71717a] font-display text-[14px]">
                No active pageviews in the last 5 minutes.
              </div>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'URL PATH' },
                    { label: 'ACTIVE BROWSERS', width: '160px', align: 'right' },
                  ]}
                />
                {realtime.active_pages.map((p, idx) => (
                  <DataTableRow
                    key={idx}
                    percent={(p.count / maxPageActive) * 100}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 pr-4">
                      <LiveDot />
                      <span className="font-display text-[14px] text-black font-medium truncate">
                        {p.url_path}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-black w-[160px] text-right font-medium">
                      {p.count}
                    </span>
                  </DataTableRow>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
