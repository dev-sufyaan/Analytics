'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { RealtimeData } from '@analytics/db/types';
import {
  StatsCardTinted,
  PanelCard,
  DataTableHeader,
  DataTableRow,
  LiveDot,
  ButtonOutline,
  SkeletonRows,
} from '@analytics/ui';
import { ArrowLeft, Pause, Play, AlertCircle, RefreshCw } from 'lucide-react';

export default function RealtimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [realtime, setRealtime] = useState<RealtimeData>({ active_visitors: 0, active_pages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRealtime = useCallback(async () => {
    if (paused) return;
    try {
      const { data, error: rpcError } = await supabase.rpc('get_realtime_visitors', { p_website_id: websiteId });
      if (rpcError) throw new Error(rpcError.message);
      if (data) {
        setRealtime(data as RealtimeData);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load realtime data.');
    } finally {
      setLoading(false);
    }
  }, [websiteId, supabase, paused]);

  useEffect(() => {
    fetchRealtime();
    if (paused) return;
    // 15s poll (was 5s): 3x fewer requests on free-tier hosting while still
    // feeling live. Visibility gating pauses everything in background tabs.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRealtime();
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRealtime();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchRealtime, paused]);

  const maxPageActive =
    realtime.active_pages && realtime.active_pages.length > 0 ? Math.max(...realtime.active_pages.map((p) => p.count)) : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Link href={`/app/${websiteId}`} className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
            </Link>
            {!paused && <LiveDot />}
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
              {paused ? 'PAUSED' : 'LIVE · UPDATES EVERY 15S'}
            </span>
            {lastUpdated && !paused && (
              <span className="font-mono text-[10px] uppercase text-[#999999] hidden sm:inline">
                · {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">Current Visitors</h1>
          <p className="font-display text-[13px] text-[#71717a] mt-1">Visitors active in the last 5 minutes.</p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonOutline type="button" onClick={() => setPaused((p) => !p)} className="px-3">
            {paused ? <><Play className="w-3.5 h-3.5 mr-1.5" /> RESUME</> : <><Pause className="w-3.5 h-3.5 mr-1.5" /> PAUSE</>}
          </ButtonOutline>
          <ButtonOutline type="button" onClick={fetchRealtime} className="px-3" aria-label="Refresh" disabled={paused}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-display text-[13px] text-red-900"><AlertCircle className="w-4 h-4" /> {error}</span>
          <ButtonOutline type="button" onClick={fetchRealtime} className="h-7 px-2.5 text-[11px]">RETRY</ButtonOutline>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <StatsCardTinted label="ACTIVE VISITORS (LAST 5 MIN)" value={loading && !realtime.active_visitors ? '—' : realtime.active_visitors} variant="mint" />

        <div className="md:col-span-2">
          <PanelCard eyebrow="LIVE ACTIVITY" title="Pages Being Viewed Right Now">
            {loading ? (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'URL PATH' }, { label: 'ACTIVE', width: '120px', align: 'right' }]} />
                <SkeletonRows rows={4} columns={['60%', '50px']} />
              </div>
            ) : !realtime.active_pages || realtime.active_pages.length === 0 ? (
              <div className="py-10 text-center">
                <LiveDot className="mx-auto mb-3 opacity-40" />
                <p className="font-display text-[14px] text-[#71717a]">No active pageviews in the last 5 minutes.</p>
                <p className="font-display text-[12px] text-[#999999] mt-1">Pageviews will appear here as visitors browse your site.</p>
              </div>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'URL PATH' }, { label: 'ACTIVE', width: '120px', align: 'right' }]} />
                {realtime.active_pages.map((p, idx) => (
                  <DataTableRow key={idx} percent={(p.count / maxPageActive) * 100}>
                    <span className="inline-flex items-center gap-2 truncate flex-1 pr-4 min-w-0">
                      <LiveDot />
                      <span className="font-display text-[14px] text-black font-medium truncate">{p.url_path}</span>
                    </span>
                    <span className="font-mono text-[13px] text-black w-[120px] text-right font-medium shrink-0">{p.count}</span>
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
