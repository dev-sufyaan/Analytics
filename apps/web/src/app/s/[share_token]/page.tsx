'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { DashboardOverview, DashboardRange } from '@analytics/db/types';
import { getPublicDashboardOverview } from '@analytics/db/queries';
import { rangeWindow, RANGE_OPTIONS } from '@analytics/db/range';
import {
  StatsCardTinted,
  StatsCardPlain,
  ChartCard,
  PanelCard,
  TogglePillGroup,
  ButtonPrimary,
  ButtonOutline,
  UPlotChart,
  DataTableHeader,
  DataTableRow,
  FooterWordmarkBanner,
  SkeletonRows,
  formatNumber,
  formatDuration,
} from '@analytics/ui';
import { RefreshCw, Globe, Layers } from 'lucide-react';

export default function PublicSharePage({ params }: { params: Promise<{ share_token: string }> }) {
  const { share_token: shareToken } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end, interval } = rangeWindow(range);
    try {
      const data = await getPublicDashboardOverview(supabase, shareToken, { start, end, interval, limit: 8 });
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [range, shareToken, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = overview?.stats;
  const siteName = (overview as any)?.stats?.website_name ?? (overview as any)?.website_name ?? 'Website';
  const domain = (overview as any)?.stats?.domain ?? (overview as any)?.domain ?? '';

  const chartData = useMemo(
    () =>
      (overview?.timeseries ?? []).map((pt) => ({
        time: Math.floor(new Date(pt.time_bucket).getTime() / 1000),
        pageviews: Number(pt.pageviews),
        visitors: Number(pt.visitors),
      })),
    [overview?.timeseries],
  );

  const pages = overview?.pages ?? [];
  const referrers = overview?.referrers ?? [];
  const countries = overview?.countries ?? [];
  const channels = (overview as any)?.channels ?? [];
  const maxPages = pages.length ? Math.max(...pages.map((p) => Number(p.pageviews))) : 1;
  const maxRefs = referrers.length ? Math.max(...referrers.map((r) => Number(r.pageviews))) : 1;
  const maxCountries = countries.length ? Math.max(...countries.map((c) => Number(c.visitors))) : 1;
  const maxChannels = channels.length ? Math.max(...channels.map((c: any) => Number(c.pageviews))) : 1;

  if (error && !loading && !overview) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">PUBLIC DASHBOARD</span>
          <h1 className="font-display text-[28px] font-medium text-black mb-3">Dashboard not found or private</h1>
          <p className="font-display text-[15px] text-[#71717a] mb-6">{error}</p>
          <Link href="/"><ButtonPrimary>GO TO ANALYTICS</ButtonPrimary></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-black font-display text-[20px] font-medium">
            <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
            <span>analytics</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[11px] uppercase text-[#71717a]">MADE WITH ANALYTICS</span>
            <Link href="/login"><ButtonPrimary className="text-[12px] h-9 px-4">GET YOUR OWN</ButtonPrimary></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1.5 truncate">PUBLIC ANALYTICS {domain ? `· ${domain}` : ''}</span>
            <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black truncate">{loading && !siteName ? 'Loading…' : siteName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />
            <ButtonOutline onClick={fetchData} className="px-3" aria-label="Refresh"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></ButtonOutline>
          </div>
        </div>

        {loading && !overview ? (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8">
                  <div className="h-3 w-20 bg-[#f0f0f0] rounded animate-pulse mb-4" />
                  <div className="h-8 w-16 bg-[#f0f0f0] rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#ebebeb] rounded-[4px] p-6"><div className="h-[220px] bg-[#fafafa] rounded animate-pulse" /></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <StatsCardTinted label="UNIQUE VISITORS" value={formatNumber(stats?.visitors ?? 0)} variant="mint" loading={false} />
              <StatsCardTinted label="PAGEVIEWS" value={formatNumber(stats?.pageviews ?? 0)} variant="periwinkle" loading={false} />
              <StatsCardPlain label="BOUNCE RATE" value={`${stats?.bounce_rate ?? 0}%`} loading={false} />
              <StatsCardPlain label="AVG VISIT DURATION" value={formatDuration(stats?.avg_duration_seconds ?? 0)} loading={false} />
            </div>

            <div className="mb-8">
              <ChartCard title="ACTIVITY OVER TIME" subtitle="Traffic volume across the selected timeframe">
                <UPlotChart data={chartData} interval={range === '24h' ? 'hour' : 'day'} loading={loading} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
              <PanelCard eyebrow="CONTENT" title="Top Pages">
                {pages.length === 0 ? <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No pages recorded</p> : (
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: 'PAGE PATH' }, { label: 'VIEWS', width: '90px', align: 'right' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
                    {pages.map((p, idx) => (
                      <DataTableRow key={idx} percent={(Number(p.pageviews) / maxPages) * 100}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{p.url_path}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{formatNumber(Number(p.pageviews))}</span>
                        <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right shrink-0">{formatNumber(Number(p.visitors))}</span>
                      </DataTableRow>
                    ))}
                  </div>
                )}
              </PanelCard>

              <PanelCard eyebrow="ACQUISITION" title="Top Referrers">
                {referrers.length === 0 ? <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No referrers recorded</p> : (
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: 'REFERRER' }, { label: 'VIEWS', width: '90px', align: 'right' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
                    {referrers.map((r, idx) => (
                      <DataTableRow key={idx} percent={(Number(r.pageviews) / maxRefs) * 100}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{r.referrer_domain}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{formatNumber(Number(r.pageviews))}</span>
                        <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right shrink-0">{formatNumber(Number(r.visitors))}</span>
                      </DataTableRow>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <PanelCard eyebrow="GEOGRAPHY" title="Top Countries">
                {countries.length === 0 ? (
                  <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No country data in this period.</p>
                ) : (
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: 'COUNTRY' }, { label: 'VISITORS', width: '90px', align: 'right' }, { label: 'SESSIONS', width: '90px', align: 'right' }]} />
                    {countries.map((c, idx) => (
                      <DataTableRow key={idx} percent={(Number(c.visitors) / maxCountries) * 100}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{c.country}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{formatNumber(Number(c.visitors))}</span>
                        <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right shrink-0">{formatNumber(Number(c.sessions))}</span>
                      </DataTableRow>
                    ))}
                  </div>
                )}
              </PanelCard>

              <PanelCard eyebrow="TECHNOLOGY" title="Browsers">
                {(overview?.devices?.browsers?.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No device data in this period.</p>
                ) : (
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: 'BROWSER' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
                    {(overview?.devices?.browsers ?? []).slice(0, 6).map((b, idx) => (
                      <DataTableRow key={idx}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{b.name}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{Number(b.count).toLocaleString()}</span>
                      </DataTableRow>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>

            {channels.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <PanelCard eyebrow="ACQUISITION" title="Top Channels">
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: 'CHANNEL (UTM_SOURCE)' }, { label: 'VIEWS', width: '90px', align: 'right' }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
                    {channels.slice(0, 6).map((ch: any, idx: number) => (
                      <DataTableRow key={idx} percent={(Number(ch.pageviews) / maxChannels) * 100}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2 min-w-0">{ch.utm_source}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium shrink-0">{formatNumber(Number(ch.pageviews))}</span>
                        <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right shrink-0">{formatNumber(Number(ch.visitors))}</span>
                      </DataTableRow>
                    ))}
                  </div>
                </PanelCard>
              </div>
            )}
          </>
        )}
      </main>

      <FooterWordmarkBanner />
    </div>
  );
}
