'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import {
  WebsiteStats,
  TimeseriesPoint,
  TopPage,
  TopReferrer,
  TopCountry,
} from '@aether/db/types';
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
} from '@aether/ui';
import { RefreshCw } from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return (num || 0).toString();
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ share_token: string }>;
}) {
  const { share_token: shareToken } = use(params);
  const supabase = createBrowserClient();

  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('');
  const [domain, setDomain] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [stats, setStats] = useState<WebsiteStats>({
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    bounces: 0,
    bounce_rate: 0,
    total_duration_seconds: 0,
    avg_duration_seconds: 0,
  });

  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [countries, setCountries] = useState<TopCountry[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();

    if (range === '24h') start.setHours(start.getHours() - 24);
    else if (range === '7d') start.setDate(start.getDate() - 7);
    else if (range === '30d') start.setDate(start.getDate() - 30);
    else if (range === '90d') start.setDate(start.getDate() - 90);

    try {
      const [
        statsRes,
        timeseriesRes,
        pagesRes,
        referrersRes,
        countriesRes,
      ] = await Promise.all([
        supabase.rpc('get_public_website_stats', {
          p_share_token: shareToken,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
        }),
        supabase.rpc('get_public_timeseries', {
          p_share_token: shareToken,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_interval: range === '24h' ? 'hour' : 'day',
        }),
        supabase.rpc('get_public_top_pages', {
          p_share_token: shareToken,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 10,
        }),
        supabase.rpc('get_public_top_referrers', {
          p_share_token: shareToken,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 10,
        }),
        supabase.rpc('get_public_top_countries', {
          p_share_token: shareToken,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 10,
        }),
      ]);

      if (statsRes.error || !statsRes.data) {
        setNotFound(true);
        return;
      }

      setSiteName(statsRes.data.website_name || 'Website');
      setDomain(statsRes.data.domain || '');
      setStats(statsRes.data);

      if (timeseriesRes.data) setTimeseries(timeseriesRes.data);
      if (pagesRes.data) setPages(pagesRes.data);
      if (referrersRes.data) setReferrers(referrersRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [range, shareToken, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-3">
            PUBLIC DASHBOARD
          </span>
          <h1 className="font-display text-[28px] font-medium text-black mb-3">
            Dashboard not found or private
          </h1>
          <p className="font-display text-[15px] text-[#71717a] mb-6">
            This analytics dashboard is either private or does not exist.
          </p>
          <Link href="/">
            <ButtonPrimary>GO TO AETHER</ButtonPrimary>
          </Link>
        </div>
      </div>
    );
  }

  const chartData = timeseries.map((pt) => ({
    time: Math.floor(new Date(pt.time_bucket).getTime() / 1000),
    pageviews: Number(pt.pageviews),
    visitors: Number(pt.visitors),
  }));

  const maxPages = pages.length > 0 ? Math.max(...pages.map((p) => Number(p.pageviews))) : 1;
  const maxRefs = referrers.length > 0 ? Math.max(...referrers.map((r) => Number(r.pageviews))) : 1;
  const maxCountries = countries.length > 0 ? Math.max(...countries.map((c) => Number(c.visitors))) : 1;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-[#ebebeb] bg-white sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-black font-display text-[20px] font-medium">
            <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
            <span>aether</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[11px] uppercase text-[#71717a]">
              MADE WITH AETHER
            </span>
            <Link href="/login">
              <ButtonPrimary className="text-[12px] h-9 px-4">
                GET YOUR OWN
              </ButtonPrimary>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
          <div>
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1.5">
              PUBLIC ANALYTICS • {domain}
            </span>
            <h1 className="font-display text-[32px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
              {siteName || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <TogglePillGroup
              options={[
                { value: '24h', label: '24H' },
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '90d', label: '90D' },
              ]}
              value={range}
              onChange={(val: any) => setRange(val)}
            />
            <ButtonOutline onClick={fetchData} className="px-3" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </ButtonOutline>
          </div>
        </div>

        {/* 4 KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCardTinted
            label="UNIQUE VISITORS"
            value={formatNumber(stats.visitors)}
            variant="mint"
            loading={loading}
          />
          <StatsCardTinted
            label="PAGEVIEWS"
            value={formatNumber(stats.pageviews)}
            variant="periwinkle"
            loading={loading}
          />
          <StatsCardPlain
            label="BOUNCE RATE"
            value={`${stats.bounce_rate || 0}%`}
            loading={loading}
          />
          <StatsCardPlain
            label="AVG VISIT DURATION"
            value={formatDuration(stats.avg_duration_seconds)}
            loading={loading}
          />
        </div>

        {/* Chart */}
        <div className="mb-8">
          <ChartCard title="ACTIVITY OVER TIME" subtitle="Traffic volume across the selected timeframe">
            <UPlotChart data={chartData} />
          </ChartCard>
        </div>

        {/* Two-up Tables: Top Pages | Top Referrers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <PanelCard eyebrow="CONTENT" title="Top Pages">
            {pages.length === 0 ? (
              <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No pages recorded</p>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'PAGE PATH' },
                    { label: 'VIEWS', width: '90px', align: 'right' },
                    { label: 'VISITORS', width: '90px', align: 'right' },
                  ]}
                />
                {pages.map((p, idx) => (
                  <DataTableRow
                    key={idx}
                    percent={(Number(p.pageviews) / maxPages) * 100}
                  >
                    <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{p.url_path}</span>
                    <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{formatNumber(Number(p.pageviews))}</span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">{formatNumber(Number(p.visitors))}</span>
                  </DataTableRow>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard eyebrow="ACQUISITION" title="Top Referrers">
            {referrers.length === 0 ? (
              <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No referrers recorded</p>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'REFERRER' },
                    { label: 'VIEWS', width: '90px', align: 'right' },
                    { label: 'VISITORS', width: '90px', align: 'right' },
                  ]}
                />
                {referrers.map((r, idx) => (
                  <DataTableRow
                    key={idx}
                    percent={(Number(r.pageviews) / maxRefs) * 100}
                  >
                    <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{r.referrer_domain}</span>
                    <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{formatNumber(Number(r.pageviews))}</span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">{formatNumber(Number(r.visitors))}</span>
                  </DataTableRow>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </main>

      {/* Footer Wordmark */}
      <FooterWordmarkBanner />
    </div>
  );
}
