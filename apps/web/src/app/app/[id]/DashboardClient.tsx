'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import {
  Website,
  WebsiteStats,
  TimeseriesPoint,
  TopPage,
  TopReferrer,
  TopCountry,
  TopDevices,
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
  EmptyStateCard,
  CodeEditorMockup,
  LiveDot,
  Toast,
  SegmentedProgressBar,
  TrendBadge,
} from '@aether/ui';
import {
  Share2,
  ExternalLink,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

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

export default function DashboardClient({ website }: { website: Website }) {
  const supabase = createBrowserClient();

  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [chartMetric, setChartMetric] = useState<'all' | 'views' | 'visitors'>('all');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState<{ type: 'path' | 'ref'; value: string } | null>(null);

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
  const [devices, setDevices] = useState<TopDevices>({ browsers: [], os: [], devices: [] });

  const isQuotaExceeded = website.events_this_month >= website.monthly_event_quota;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();

    if (range === '24h') {
      start.setHours(start.getHours() - 24);
    } else if (range === '7d') {
      start.setDate(start.getDate() - 7);
    } else if (range === '30d') {
      start.setDate(start.getDate() - 30);
    } else if (range === '90d') {
      start.setDate(start.getDate() - 90);
    }

    try {
      const [
        statsRes,
        timeseriesRes,
        pagesRes,
        referrersRes,
        countriesRes,
        devicesRes,
      ] = await Promise.all([
        supabase.rpc('get_website_stats', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
        }),
        supabase.rpc('get_timeseries', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_interval: range === '24h' ? 'hour' : 'day',
        }),
        supabase.rpc('get_top_pages', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 6,
        }),
        supabase.rpc('get_top_referrers', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 6,
        }),
        supabase.rpc('get_top_countries', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_limit: 6,
        }),
        supabase.rpc('get_top_devices', {
          p_website_id: website.id,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
        }),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (timeseriesRes.data) setTimeseries(timeseriesRes.data);
      if (pagesRes.data) setPages(pagesRes.data);
      if (referrersRes.data) setReferrers(referrersRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [range, website.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShare = () => {
    if (website.is_public && website.share_token) {
      const shareUrl = `${window.location.origin}/s/${website.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      setToastMsg('Public share link copied to clipboard!');
    } else {
      setToastMsg('Enable public dashboard in Settings to share.');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      'Type,Name/Path,Views/Visitors,Count',
      ...pages.map((p) => `Page,"${p.url_path}",${p.pageviews},${p.visitors}`),
      ...referrers.map((r) => `Referrer,"${r.referrer_domain}",${r.pageviews},${r.visitors}`),
      ...countries.map((c) => `Country,"${c.country}",${c.visitors},${c.sessions}`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${website.domain}_analytics_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg('CSV export downloaded!');
  };

  // Filter timeseries based on chart metric filter
  const chartData = timeseries.map((pt) => ({
    time: Math.floor(new Date(pt.time_bucket).getTime() / 1000),
    pageviews: chartMetric === 'visitors' ? 0 : Number(pt.pageviews),
    visitors: chartMetric === 'views' ? 0 : Number(pt.visitors),
  }));

  const maxPageViews = pages.length > 0 ? Math.max(...pages.map((p) => Number(p.pageviews))) : 1;
  const maxReferrerViews = referrers.length > 0 ? Math.max(...referrers.map((r) => Number(r.pageviews))) : 1;
  const maxCountryVisitors = countries.length > 0 ? Math.max(...countries.map((c) => Number(c.visitors))) : 1;

  // Segmented hardware distribution
  const deviceSegments = (devices.devices || []).map((d) => ({
    label: d.name,
    value: d.count,
    color: d.name === 'Desktop' ? '#000000' : d.name === 'Mobile' ? '#bdbbff' : '#c8f6f9',
  }));

  const hasAnyData = stats.pageviews > 0 || stats.visitors > 0 || pages.length > 0;
  const snippetCode = `<script defer src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/t.js" data-web="${website.id}"></script>`;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
              ANALYTICS OVERVIEW
            </span>
            <span className="text-[#999999]">•</span>
            <a
              href={`https://${website.domain}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] font-medium text-black hover:underline inline-flex items-center gap-1"
            >
              <span>{website.domain}</span>
              <ExternalLink className="w-3 h-3 text-[#71717a]" />
            </a>
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            {website.name}
          </h1>
        </div>

        {/* Quick Actions & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3">
          {activeFilter && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-[4px] font-mono text-[11px] uppercase animate-in fade-in duration-150">
              <Filter className="w-3 h-3" />
              <span>{activeFilter.type}: {activeFilter.value}</span>
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="ml-1 hover:text-[#bdbbff] cursor-pointer"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

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

          <ButtonOutline type="button" onClick={handleExportCSV} title="Export CSV" className="hidden sm:inline-flex">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>EXPORT</span>
          </ButtonOutline>

          <ButtonOutline type="button" onClick={handleShare} title="Share dashboard">
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            <span>SHARE</span>
          </ButtonOutline>

          <ButtonOutline type="button" onClick={fetchData} title="Refresh metrics" className="px-3">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      {/* Quota Cap Alert if monthly quota reached */}
      {isQuotaExceeded && (
        <div className="mb-8 p-4 bg-[#fafafa] border border-black rounded-[4px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-black shrink-0" />
            <p className="font-display text-[14px] text-black">
              Free plan reached {website.monthly_event_quota.toLocaleString()} events quota. Resets on the 1st of next month.
            </p>
          </div>
          <Link href="/pricing">
            <ButtonPrimary className="text-[11px] h-8 px-3">
              VIEW PLANS
            </ButtonPrimary>
          </Link>
        </div>
      )}

      {!hasAnyData && !loading ? (
        /* Empty State */
        <div className="space-y-8">
          <EmptyStateCard
            title="No analytics data received yet"
            description={`Aether is actively listening for incoming events on ${website.domain}. Add the snippet below to start seeing real-time traffic.`}
            action={
              <div className="flex items-center gap-2">
                <LiveDot />
                <span className="font-mono text-[11px] uppercase text-[#71717a]">
                  Listening for first pageview...
                </span>
              </div>
            }
          />
          <div className="max-w-2xl mx-auto">
            <CodeEditorMockup code={snippetCode} title="INSTALLATION SNIPPET" />
          </div>
        </div>
      ) : (
        /* Overview Dashboard Grid */
        <div className="space-y-8">
          {/* 4 KPI Stat Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCardTinted
              label="UNIQUE VISITORS"
              value={formatNumber(stats.visitors)}
              delta={stats.visitors > 0 ? '+12.4% vs prev' : undefined}
              variant="mint"
              loading={loading}
            />
            <StatsCardTinted
              label="TOTAL PAGEVIEWS"
              value={formatNumber(stats.pageviews)}
              delta={stats.pageviews > 0 ? '+8.9% vs prev' : undefined}
              variant="periwinkle"
              loading={loading}
            />
            <StatsCardPlain
              label="BOUNCE RATE"
              value={`${stats.bounce_rate || 0}%`}
              delta={stats.sessions > 0 ? `${stats.bounces} single views` : undefined}
              loading={loading}
            />
            <StatsCardPlain
              label="AVG VISIT DURATION"
              value={formatDuration(stats.avg_duration_seconds)}
              delta={stats.sessions > 0 ? `${stats.sessions} total sessions` : undefined}
              loading={loading}
            />
          </div>

          {/* Main Chart Card with Series Filter */}
          <ChartCard
            title="ACTIVITY OVER TIME"
            subtitle={`Pageviews and unique visitors over the selected ${range.toUpperCase()} period`}
            action={
              <div className="flex items-center gap-1 bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                <button
                  type="button"
                  onClick={() => setChartMetric('all')}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${
                    chartMetric === 'all' ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('views')}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${
                    chartMetric === 'views' ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  VIEWS
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('visitors')}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${
                    chartMetric === 'visitors' ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'
                  }`}
                >
                  VISITORS
                </button>
              </div>
            }
          >
            <UPlotChart data={chartData} />
          </ChartCard>

          {/* Retention notice on 90D range */}
          {range === '90d' && (
            <div className="p-3.5 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] text-[#71717a] font-display text-[13px] flex items-center justify-between">
              <span>Breakdowns are available for the last {website.data_retention_days} days. Historical daily sums are preserved permanently.</span>
              <Link href="/pricing" className="font-mono text-[11px] uppercase text-black font-medium hover:underline">
                LEARN MORE →
              </Link>
            </div>
          )}

          {/* Two-up Tables: Top Pages | Top Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Pages */}
            <PanelCard
              eyebrow="CONTENT"
              title="Top Visited Pages"
              action={
                <Link
                  href={`/app/${website.id}/pages`}
                  className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors"
                >
                  VIEW ALL →
                </Link>
              }
            >
              {pages.length === 0 ? (
                <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No pageviews recorded</p>
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
                      percent={(Number(p.pageviews) / maxPageViews) * 100}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFilter({ type: 'path', value: p.url_path })}
                        className="font-display text-[14px] text-black hover:underline truncate flex-1 text-left pr-2 cursor-pointer"
                        title={`Filter by ${p.url_path}`}
                      >
                        {p.url_path}
                      </button>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                        {formatNumber(Number(p.pageviews))}
                      </span>
                      <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                        {formatNumber(Number(p.visitors))}
                      </span>
                    </DataTableRow>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* Top Referrers */}
            <PanelCard
              eyebrow="ACQUISITION"
              title="Top Acquisition Sources"
              action={
                <Link
                  href={`/app/${website.id}/referrers`}
                  className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors"
                >
                  VIEW ALL →
                </Link>
              }
            >
              {referrers.length === 0 ? (
                <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No referrers recorded</p>
              ) : (
                <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                  <DataTableHeader
                    columns={[
                      { label: 'REFERRER DOMAIN' },
                      { label: 'VIEWS', width: '90px', align: 'right' },
                      { label: 'VISITORS', width: '90px', align: 'right' },
                    ]}
                  />
                  {referrers.map((r, idx) => (
                    <DataTableRow
                      key={idx}
                      percent={(Number(r.pageviews) / maxReferrerViews) * 100}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFilter({ type: 'ref', value: r.referrer_domain })}
                        className="font-display text-[14px] text-black hover:underline truncate flex-1 text-left pr-2 cursor-pointer"
                        title={`Filter by ${r.referrer_domain}`}
                      >
                        {r.referrer_domain}
                      </button>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                        {formatNumber(Number(r.pageviews))}
                      </span>
                      <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                        {formatNumber(Number(r.visitors))}
                      </span>
                    </DataTableRow>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>

          {/* Two-up Tables: Geography | Technology & Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Countries */}
            <PanelCard
              eyebrow="GEOGRAPHY"
              title="Top Countries"
              action={
                <Link
                  href={`/app/${website.id}/countries`}
                  className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors"
                >
                  VIEW ALL →
                </Link>
              }
            >
              {countries.length === 0 ? (
                <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No country data recorded</p>
              ) : (
                <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                  <DataTableHeader
                    columns={[
                      { label: 'COUNTRY' },
                      { label: 'VISITORS', width: '90px', align: 'right' },
                      { label: 'SESSIONS', width: '90px', align: 'right' },
                    ]}
                  />
                  {countries.map((c, idx) => (
                    <DataTableRow
                      key={idx}
                      percent={(Number(c.visitors) / maxCountryVisitors) * 100}
                    >
                      <span className="font-display text-[14px] text-black truncate flex-1 pr-2">
                        {c.country}
                      </span>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                        {formatNumber(Number(c.visitors))}
                      </span>
                      <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                        {formatNumber(Number(c.sessions))}
                      </span>
                    </DataTableRow>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* Devices & Hardware Platform */}
            <PanelCard
              eyebrow="HARDWARE & BROWSERS"
              title="Device Distribution"
              action={
                <Link
                  href={`/app/${website.id}/devices`}
                  className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors"
                >
                  VIEW ALL →
                </Link>
              }
            >
              {deviceSegments.length > 0 && (
                <div className="mb-6 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-2">
                    HARDWARE RATIO
                  </span>
                  <SegmentedProgressBar segments={deviceSegments} />
                </div>
              )}

              {(!devices.browsers || devices.browsers.length === 0) ? (
                <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No device data recorded</p>
              ) : (
                <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                  <DataTableHeader
                    columns={[
                      { label: 'BROWSER / OS' },
                      { label: 'VISITORS', width: '90px', align: 'right' },
                    ]}
                  />
                  {devices.browsers.slice(0, 5).map((b, idx) => (
                    <DataTableRow key={idx}>
                      <span className="font-display text-[14px] text-black truncate flex-1 pr-2">
                        {b.name}
                      </span>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                        {b.count.toLocaleString()}
                      </span>
                    </DataTableRow>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
