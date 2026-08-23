'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { TopDevices } from '@analytics/db/types';
import { rangeWindow, RANGE_OPTIONS } from '@analytics/db/range';
import type { DashboardRange } from '@analytics/db/types';
import { PanelCard, TogglePillGroup, DataTableHeader, DataTableRow, ButtonOutline, SkeletonRows } from '@analytics/ui';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

export default function DevicesBreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [devices, setDevices] = useState<TopDevices>({ browsers: [], os: [], devices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = rangeWindow(range);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_top_devices', {
        p_website_id: websiteId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      if (rpcError) throw new Error(rpcError.message);
      setDevices((data as TopDevices) ?? { browsers: [], os: [], devices: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load devices.');
    } finally {
      setLoading(false);
    }
  }, [range, websiteId, supabase]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const maxBrowser = devices.browsers.length ? Math.max(...devices.browsers.map((b) => b.count)) : 1;
  const maxOs = devices.os.length ? Math.max(...devices.os.map((o) => o.count)) : 1;
  const maxDev = devices.devices.length ? Math.max(...devices.devices.map((d) => d.count)) : 1;

  const PanelSkeleton = () => (
    <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
      <DataTableHeader columns={[{ label: 'NAME' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
      <SkeletonRows rows={5} columns={['55%', '60px']} />
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <Link href={`/app/${websiteId}`} className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-1.5">
            <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
          </Link>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">Technology & Platforms</h1>
          <p className="font-display text-[13px] text-[#71717a] mt-1">Browsers, operating systems and device types.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <ButtonOutline onClick={fetchDevices} className="px-3" aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-display text-[13px] text-red-900">
            <AlertCircle className="w-4 h-4" /> {error}
          </span>
          <ButtonOutline type="button" onClick={fetchDevices} className="h-7 px-2.5 text-[11px]">
            RETRY
          </ButtonOutline>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <PanelCard eyebrow="SOFTWARE" title="Browsers">
          {loading ? (
            <PanelSkeleton />
          ) : devices.browsers.length === 0 ? (
            <p className="text-center py-8 font-display text-[14px] text-[#71717a]">No browser data in this period.</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader columns={[{ label: 'BROWSER' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
              {devices.browsers.map((b, idx) => (
                <DataTableRow key={idx} percent={(b.count / maxBrowser) * 100}>
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{b.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{b.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard eyebrow="PLATFORM" title="Operating Systems">
          {loading ? (
            <PanelSkeleton />
          ) : devices.os.length === 0 ? (
            <p className="text-center py-8 font-display text-[14px] text-[#71717a]">No OS data in this period.</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader columns={[{ label: 'OS' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
              {devices.os.map((o, idx) => (
                <DataTableRow key={idx} percent={(o.count / maxOs) * 100}>
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{o.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{o.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard eyebrow="HARDWARE" title="Device Types">
          {loading ? (
            <PanelSkeleton />
          ) : devices.devices.length === 0 ? (
            <p className="text-center py-8 font-display text-[14px] text-[#71717a]">No device data in this period.</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader columns={[{ label: 'DEVICE' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
              {devices.devices.map((d, idx) => (
                <DataTableRow key={idx} percent={(d.count / maxDev) * 100}>
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{d.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{d.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
