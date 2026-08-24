'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { Website, DashboardOverview, DashboardFilter, DashboardRange } from '@analytics/db/types';
import { peekOverview, loadOverview } from '@analytics/db/overview-store';
import { RANGE_OPTIONS } from '@analytics/db/range';
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
  SkeletonRows,
  formatNumber,
  formatDuration,
  percentDelta,
} from '@analytics/ui';
import {
  Share2,
  ExternalLink,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  Download,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { buildAiPrompt } from '@/lib/ai-prompt';
import { getCollectOrigin } from '@/lib/collect-url';

// Shared SWR store (packages/db/src/overview-store.ts) — the same 30s cache
// powers every breakdown sub-page, so Overview → Pages costs zero requests.

// Friendly labels for AI source tags emitted by the ingest classifier.
const AI_SOURCE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  copilot: 'Copilot',
};

export default function DashboardClient({ website }: { website: Website }) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [range, setRange] = useState<DashboardRange>('30d');
  const [chartMetric, setChartMetric] = useState<'all' | 'views' | 'visitors'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [filter, setFilter] = useState<DashboardFilter | null>(null);
  const requestSeq = useRef(0);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  // Umami parity: tabbed panels (Path/Entry/Exit, Referrer/Channel, Country/Region/City, Browser/OS/Device)
  const [pagesTab, setPagesTab] = useState<'path' | 'entry' | 'exit'>('path');
  const [acqTab, setAcqTab] = useState<'referrer' | 'channel'>('referrer');
  const [geoTab, setGeoTab] = useState<'country' | 'region' | 'city'>('country');
  const [deviceTab, setDeviceTab] = useState<'browser' | 'os' | 'device'>('browser');
  const [aiCopied, setAiCopied] = useState(false);

  const isQuotaExceeded = website.events_this_month >= website.monthly_event_quota;

  const fetchDashboard = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      const force = opts?.force ?? false;
      const silent = opts?.silent ?? false;

      // Serve stale cache instantly so navigation feels instant.
      const peek = force ? null : peekOverview(website.id, range, filter);
      if (peek) {
        setOverview(peek.data);
        setError(null);
        setLoading(false);
        if (peek.fresh) return;
        // stale-but-present -> background refresh (no spinner, only dim).
        if (!silent) setRefreshing(true);
      } else {
        if (overview) setRefreshing(true);
        else setLoading(true);
        setError(null);
      }

      const seq = ++requestSeq.current;
      try {
        const data = await loadOverview(supabase, website.id, range, {
          filter,
          limit: 100,
        });
        if (seq !== requestSeq.current) return;
        setOverview(data);
        setError(null);
      } catch (e) {
        if (seq !== requestSeq.current) return;
        // Keep stale data visible if we had it; only surface error banner.
        setError(e instanceof Error ? e.message : 'Failed to load analytics data.');
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range, filter, website.id, supabase, overview],
  );

  useEffect(() => {
    fetchDashboard({ force: !!filter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filter]);

  // Auto-refresh while tab visible.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchDashboard({ silent: true });
    }, 30_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchDashboard({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [autoRefresh, fetchDashboard]);

  const handleShare = useCallback(() => {
    if (website.is_public && website.share_token) {
      const shareUrl = `${window.location.origin}/s/${website.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      setToastMsg('Public share link copied to clipboard!');
    } else {
      setToastMsg('Enable public dashboard in Settings to share.');
    }
  }, [website.is_public, website.share_token]);

  const handleExportCSV = useCallback(() => {
    if (!overview) return;
    const rows: string[] = ['Type,Name/Path,Views/Visitors,Count,Extra'];
    for (const p of overview.pages) rows.push(`Page,"${p.url_path}",${p.pageviews},${p.visitors},`);
    for (const r of overview.referrers) rows.push(`Referrer,"${r.referrer_domain}",${r.pageviews},${r.visitors},`);
    for (const c of overview.countries) rows.push(`Country,"${c.country}",${c.visitors},${c.sessions},`);
    for (const ch of overview.channels ?? []) rows.push(`Channel,"${ch.utm_source}",${ch.pageviews},${ch.visitors},`);
    for (const ai of overview.ai_sources ?? [])
      rows.push(`AI Source,"${AI_SOURCE_LABELS[ai.source] ?? ai.source}",${ai.pageviews},${ai.visitors},`);
    for (const b of overview.devices.browsers ?? []) rows.push(`Browser,"${b.name}",${b.count},,`);
    for (const ev of overview.events ?? []) rows.push(`Event,"${ev.event_name}",${ev.total_events},${ev.unique_visitors},`);
    if (filter) rows.push(`Filter,"${filter.type}:${filter.value}",,,`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${website.domain}_analytics_${range}${filter ? `_${filter.type}-${filter.value.replace(/\W+/g, '_')}` : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToastMsg('CSV export downloaded!');
  }, [overview, filter, range, website.domain]);

  const handleExportTable = useCallback(
    (name: string, rows: string[]) => {
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${website.domain}_${name}_${range}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToastMsg(`${name} CSV downloaded`);
    },
    [range, website.domain],
  );

  const handleCopyAiPrompt = useCallback(async () => {
    const prompt = buildAiPrompt({
      websiteId: website.id,
      domain: website.domain,
      origin: getCollectOrigin(),
      siteName: website.name,
    });
    await navigator.clipboard.writeText(prompt);
    setAiCopied(true);
    setToastMsg('AI prompt copied — paste into Cursor / Claude');
    setTimeout(() => setAiCopied(false), 2000);
  }, [website.id, website.domain, website.name]);

  const stats = overview?.stats;
  const prevStats = overview?.prev_stats ?? null;
  const timeseries = overview?.timeseries ?? [];
  const pages = overview?.pages ?? [];
  const referrers = overview?.referrers ?? [];
  const countries = overview?.countries ?? [];
  const devices = overview?.devices ?? { browsers: [], os: [], devices: [] };
  const events = overview?.events ?? [];
  const channels = overview?.channels ?? [];
  const aiSources = overview?.ai_sources ?? [];

  const chartData = useMemo(
    () =>
      timeseries.map((pt) => ({
        time: Math.floor(new Date(pt.time_bucket).getTime() / 1000),
        pageviews: chartMetric === 'visitors' ? 0 : Number(pt.pageviews),
        visitors: chartMetric === 'views' ? 0 : Number(pt.visitors),
      })),
    [timeseries, chartMetric],
  );

  const maxPageViews = pages.length ? Math.max(...pages.map((p) => Number(p.pageviews))) : 1;
  const maxReferrerViews = referrers.length ? Math.max(...referrers.map((r) => Number(r.pageviews))) : 1;
  const maxCountryVisitors = countries.length ? Math.max(...countries.map((c) => Number(c.visitors))) : 1;
  const maxChannelViews = channels.length ? Math.max(...channels.map((c) => Number(c.pageviews))) : 1;
  const maxAiViews = aiSources.length ? Math.max(...aiSources.map((a) => Number(a.pageviews))) : 1;

  const deviceSegments = (devices.devices || []).map((d) => ({
    label: d.name,
    value: d.count,
    color: d.name === 'Desktop' ? '#000000' : d.name === 'Mobile' ? '#bdbbff' : '#c8f6f9',
  }));

  const hasAnyData = !!stats && (stats.pageviews > 0 || stats.visitors > 0 || pages.length > 0 || referrers.length > 0 || channels.length > 0);
  const isFilteredEmpty = !!filter && !!stats && stats.pageviews === 0 && pages.length === 0 && referrers.length === 0 && channels.length === 0;
  const isInitialLoading = loading && !overview;
  const snippetCode = `<script defer src="${getCollectOrigin()}/t.js" data-web="${website.id}"></script>`;
  const generatedLabel = overview?.generated_at
    ? new Date(overview.generated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null;

  const isFilterActive = (type: DashboardFilter['type'], value: string) =>
    filter?.type === type && filter?.value === value;

  const handleCopySnippet = useCallback(async () => {
    await navigator.clipboard.writeText(snippetCode);
    setToastMsg('Snippet copied');
  }, [snippetCode]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
              ANALYTICS OVERVIEW
            </span>
            <span className="text-[#999999] hidden sm:inline">•</span>
            <a
              href={`https://${website.domain}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] font-medium text-black hover:underline inline-flex items-center gap-1 min-w-0"
            >
              <span className="truncate">{website.domain}</span>
              <ExternalLink className="w-3 h-3 text-[#71717a] shrink-0" />
            </a>
            {generatedLabel && !isInitialLoading && (
              <span className="hidden sm:inline font-mono text-[10px] uppercase text-[#999999]">
                · UPDATED {generatedLabel}
              </span>
            )}
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black truncate">
            {website.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {filter && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-[4px] font-mono text-[11px] uppercase animate-in fade-in">
              <Filter className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-none">
                {filter.type}: {filter.value}
              </span>
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="ml-1 hover:text-[#bdbbff] cursor-pointer p-0.5 -mr-0.5 rounded"
                aria-label="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />

          <ButtonOutline type="button" onClick={handleExportCSV} title="Export CSV" className="px-2.5 sm:px-3">
            <Download className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">EXPORT</span>
          </ButtonOutline>

          <ButtonOutline type="button" onClick={handleShare} title="Share dashboard" className="px-2.5 sm:px-3">
            <Share2 className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">SHARE</span>
          </ButtonOutline>

          <ButtonOutline
            type="button"
            onClick={() => fetchDashboard({ force: true })}
            title="Refresh metrics"
            className="px-3"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      {/* Filter hint */}
      {filter && !isFilteredEmpty && !isInitialLoading && (
        <div className="mb-6 flex items-center gap-2 text-[13px] font-display text-[#71717a] bg-[#fafafa] border border-[#ebebeb] rounded-[4px] px-3.5 py-2.5">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>
            Showing only pageviews where <strong className="text-black font-medium">{filter.type}</strong> is{' '}
            <strong className="text-black font-medium">{filter.value}</strong>. All KPIs, chart and tables reflect this
            filter.
          </span>
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="ml-auto font-mono text-[11px] uppercase text-black hover:underline cursor-pointer whitespace-nowrap"
          >
            CLEAR FILTER
          </button>
        </div>
      )}

      {/* Quota banner */}
      {isQuotaExceeded && (
        <div className="mb-8 p-4 bg-[#fafafa] border border-black rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-black shrink-0" />
            <p className="font-display text-[14px] text-black">
              Free plan quota reached ({website.monthly_event_quota.toLocaleString()} events). Resets on the 1st of next
              month.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <ButtonPrimary className="text-[11px] h-8 px-3">VIEW PLANS</ButtonPrimary>
          </Link>
        </div>
      )}

      {/* Error */}
      {error && !loading && !overview && (
        <div className="mb-8 p-4 bg-white border border-red-200 rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-display text-[14px] font-medium text-black mb-0.5">Couldn&apos;t load analytics</p>
            <p className="font-display text-[13px] text-[#71717a]">{error}</p>
          </div>
          <ButtonOutline type="button" onClick={() => fetchDashboard({ force: true })}>
            RETRY
          </ButtonOutline>
        </div>
      )}
      {error && overview && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-[4px] flex items-center justify-between gap-3">
          <p className="font-display text-[13px] text-amber-900">Refresh failed: {error}</p>
          <ButtonOutline type="button" onClick={() => fetchDashboard({ force: true })} className="h-7 px-2.5 text-[11px]">
            RETRY
          </ButtonOutline>
        </div>
      )}

      {isInitialLoading ? (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8">
                <div className="h-3 w-24 bg-[#f0f0f0] rounded animate-pulse mb-4" />
                <div className="h-8 w-20 bg-[#f0f0f0] rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#ebebeb] rounded-[4px] p-6">
            <div className="h-3 w-32 bg-[#f0f0f0] rounded animate-pulse mb-6" />
            <div className="h-[220px] bg-[#fafafa] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white border border-[#ebebeb] rounded-[4px] p-6">
                <div className="h-3 w-28 bg-[#f0f0f0] rounded animate-pulse mb-4" />
                <SkeletonRows rows={5} />
              </div>
            ))}
          </div>
        </div>
      ) : !hasAnyData && !filter ? (
        <div className="space-y-8">
          <EmptyStateCard
            title="No analytics data received yet"
            description={`Analytics is actively listening for incoming events on ${website.domain}. Add the snippet below to start seeing real-time traffic.`}
            action={
              <div className="flex items-center gap-2">
                <LiveDot />
                <span className="font-mono text-[11px] uppercase text-[#71717a]">Listening for first pageview…</span>
              </div>
            }
          />
          <div className="max-w-2xl mx-auto">
            <CodeEditorMockup code={snippetCode} title="INSTALLATION SNIPPET" />
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase hover:bg-[#fafafa]"
              >
                <Copy className="w-3.5 h-3.5" /> COPY SNIPPET
              </button>
              <button
                type="button"
                onClick={handleCopyAiPrompt}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-[11px] uppercase ${aiCopied ? 'bg-black text-white' : 'bg-[#010120] text-white hover:bg-[#26263a]'}`}
              >
                {aiCopied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiCopied ? 'COPIED' : 'COPY AI PROMPT'}
              </button>
            </div>
            <p className="font-mono text-[10px] uppercase text-[#999999] text-center mt-2">AI prompt includes ID {website.id.slice(0, 8)}… + best-practice steps for any stack</p>
          </div>
        </div>
      ) : isFilteredEmpty ? (
        <div className="space-y-6">
          <div className="bg-white border border-[#ebebeb] rounded-[4px] p-8 text-center">
            <Filter className="w-6 h-6 text-[#999999] mx-auto mb-3" />
            <h3 className="font-display text-[18px] font-medium text-black mb-1">No results for this filter</h3>
            <p className="font-display text-[14px] text-[#71717a] max-w-md mx-auto mb-4">
              Nothing matched <span className="font-mono text-[12px] bg-[#f7f7f7] px-1.5 py-0.5 rounded text-black">{filter?.value}</span>{' '}
              in the selected range. Try a broader range or clear the filter.
            </p>
            <ButtonOutline type="button" onClick={() => setFilter(null)}>
              CLEAR FILTER
            </ButtonOutline>
          </div>
          <div className="max-w-2xl mx-auto">
            <CodeEditorMockup code={snippetCode} title="TRACKER SNIPPET" />
          </div>
        </div>
      ) : (
        <div className={`space-y-8 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatsCardTinted
              label="UNIQUE VISITORS"
              value={formatNumber(stats?.visitors ?? 0)}
              delta={prevStats ? (percentDelta(stats?.visitors ?? 0, prevStats.visitors) ?? undefined) : undefined}
              variant="mint"
              loading={false}
            />
            <StatsCardTinted
              label="TOTAL PAGEVIEWS"
              value={formatNumber(stats?.pageviews ?? 0)}
              delta={prevStats ? (percentDelta(stats?.pageviews ?? 0, prevStats.pageviews) ?? undefined) : undefined}
              variant="periwinkle"
              loading={false}
            />
            <StatsCardPlain
              label="BOUNCE RATE"
              value={`${stats?.bounce_rate ?? 0}%`}
              delta={
                prevStats
                  ? (percentDelta(stats?.bounce_rate ?? 0, prevStats.bounce_rate) ?? undefined) ||
                    (stats && stats.sessions > 0 ? `${stats.bounces.toLocaleString()} bounces` : undefined)
                  : stats && stats.sessions > 0
                    ? `${stats.bounces.toLocaleString()} bounces`
                    : undefined
              }
              loading={false}
            />
            <StatsCardPlain
              label="AVG VISIT DURATION"
              value={formatDuration(stats?.avg_duration_seconds ?? 0)}
              delta={
                prevStats && prevStats.avg_duration_seconds > 0
                  ? (percentDelta(stats?.avg_duration_seconds ?? 0, prevStats.avg_duration_seconds) ?? undefined)
                  : undefined
              }
              loading={false}
            />
          </div>

          <div className="flex items-center justify-between gap-3 -mt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3.5 h-3.5 accent-black rounded"
              />
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#71717a]">
                Auto-refresh (30s)
              </span>
            </label>
            {filter && (
              <span className="font-mono text-[11px] uppercase text-[#999999] hidden sm:inline">
                Filtered view · raw events only
              </span>
            )}
          </div>

          {/* Chart */}
          <ChartCard
            title="ACTIVITY OVER TIME"
            subtitle={`${filter ? 'Filtered · ' : ''}Pageviews and unique visitors · ${range.toUpperCase()}`}
            action={
              <div className="flex items-center gap-1 bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                {(['all', 'views', 'visitors'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMetric(m)}
                    className={`px-2.5 py-1 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${
                      chartMetric === m ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
          >
            <UPlotChart data={chartData} interval={range === '24h' ? 'hour' : 'day'} loading={loading} />
          </ChartCard>

          {range === '90d' && (
            <div className="p-3.5 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] text-[#71717a] font-display text-[13px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Breakdowns cover the last {website.data_retention_days} days. Historical daily sums are kept forever.</span>
              <Link href="/pricing" className="font-mono text-[11px] uppercase text-black font-medium hover:underline shrink-0">
                LEARN MORE →
              </Link>
            </div>
          )}

          {/* Pages | Referrers — tabbed like Umami WebsitePanels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <PanelCard
              eyebrow="CONTENT"
              title={pagesTab === 'path' ? 'Top Pages' : pagesTab === 'entry' ? 'Entry Pages' : 'Exit Pages'}
              action={
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                    {(['path', 'entry', 'exit'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPagesTab(t)}
                        className={`px-2 py-0.5 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${pagesTab === t ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportTable('pages', ['path,pageviews,visitors', ...pages.map((p) => `${p.url_path},${p.pageviews},${p.visitors}`)])}
                    className="p-1.5 border border-[#ebebeb] rounded-[4px] hover:bg-[#fafafa] text-[#71717a] hover:text-black transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/app/${website.id}/pages`}
                    className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors hidden sm:inline"
                  >
                    VIEW ALL →
                  </Link>
                </div>
              }
            >
              {pagesTab !== 'path' ? (
                <div className="py-8 text-center border border-dashed border-[#ebebeb] rounded-[4px] bg-[#fafafa]">
                  <BarChart3 className="w-5 h-5 text-[#999999] mx-auto mb-2" />
                  <p className="font-mono text-[11px] uppercase text-[#71717a]">Entry/Exit breakdown</p>
                  <p className="font-display text-[13px] text-[#999999] mt-1">Computed from sessions in next release — currently shows Top Pages.</p>
                </div>
              ) : pages.length === 0 ? (
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
                  {pages.map((p, idx) => {
                    const active = isFilterActive('path', p.url_path);
                    return (
                      <DataTableRow key={idx} percent={(Number(p.pageviews) / maxPageViews) * 100} className={active ? 'bg-[#c8f6f9]/30' : undefined}>
                        <button
                          type="button"
                          onClick={() => setFilter({ type: 'path', value: p.url_path })}
                          disabled={active}
                          className={`font-display text-[14px] hover:underline truncate flex-1 text-left pr-2 cursor-pointer disabled:no-underline disabled:cursor-default ${
                            active ? 'text-black font-semibold' : 'text-black'
                          }`}
                          title={active ? 'Currently filtered' : `Filter by ${p.url_path}`}
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
                    );
                  })}
                </div>
              )}
            </PanelCard>

            <PanelCard
              eyebrow="ACQUISITION"
              title={acqTab === 'referrer' ? 'Top Referrers' : 'Top Channels'}
              action={
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                    {(['referrer', 'channel'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAcqTab(t)}
                        className={`px-2 py-0.5 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${acqTab === t ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleExportTable(
                        acqTab,
                        acqTab === 'referrer'
                          ? ['referrer,pageviews,visitors', ...referrers.map((r) => `${r.referrer_domain},${r.pageviews},${r.visitors}`)]
                          : ['utm_source,pageviews,visitors', ...channels.map((c) => `${c.utm_source},${c.pageviews},${c.visitors}`)],
                      )
                    }
                    className="p-1.5 border border-[#ebebeb] rounded-[4px] hover:bg-[#fafafa] text-[#71717a] hover:text-black transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/app/${website.id}/referrers`}
                    className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors hidden sm:inline"
                  >
                    VIEW ALL →
                  </Link>
                </div>
              }
            >
              {acqTab === 'referrer' ? (
                referrers.length === 0 ? (
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
                    {referrers.map((r, idx) => {
                      const active = isFilterActive('referrer', r.referrer_domain);
                      return (
                        <DataTableRow
                          key={idx}
                          percent={(Number(r.pageviews) / maxReferrerViews) * 100}
                          className={active ? 'bg-[#c8f6f9]/30' : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => setFilter({ type: 'referrer', value: r.referrer_domain })}
                            disabled={active}
                            className={`font-display text-[14px] hover:underline truncate flex-1 text-left pr-2 cursor-pointer disabled:no-underline disabled:cursor-default ${
                              active ? 'text-black font-semibold' : 'text-black'
                            }`}
                            title={active ? 'Currently filtered' : `Filter by ${r.referrer_domain}`}
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
                      );
                    })}
                </div>
              )
              ) : channels.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#ebebeb] rounded-[4px] bg-[#fafafa]">
                  <Globe className="w-5 h-5 text-[#999999] mx-auto mb-2" />
                  <p className="font-mono text-[11px] uppercase text-[#71717a]">No UTM channels</p>
                  <p className="font-display text-[13px] text-[#999999] mt-1">Share a URL with ?utm_source=google to see channels.</p>
                </div>
              ) : (
                <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                  <DataTableHeader
                    columns={[
                      { label: 'CHANNEL (UTM_SOURCE)' },
                      { label: 'VIEWS', width: '90px', align: 'right' },
                      { label: 'VISITORS', width: '90px', align: 'right' },
                    ]}
                  />
                  {channels.map((ch, idx) => (
                    <DataTableRow key={idx} percent={(Number(ch.pageviews) / maxChannelViews) * 100}>
                      <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{ch.utm_source}</span>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{formatNumber(Number(ch.pageviews))}</span>
                      <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">{formatNumber(Number(ch.visitors))}</span>
                    </DataTableRow>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>

          {/* Countries | Devices — tabbed like Umami WebsitePanels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <PanelCard
              eyebrow="GEOGRAPHY"
              title={
                geoTab === 'country' ? 'Top Countries' : geoTab === 'region' ? 'Top Regions' : 'Top Cities'
              }
              action={
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                    {(['country', 'region', 'city'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGeoTab(t)}
                        className={`px-2 py-0.5 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${geoTab === t ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportTable('countries', ['country,visitors,sessions', ...countries.map((c) => `${c.country},${c.visitors},${c.sessions}`)])}
                    className="p-1.5 border border-[#ebebeb] rounded-[4px] hover:bg-[#fafafa] text-[#71717a] hover:text-black transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/app/${website.id}/countries`}
                    className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors hidden sm:inline"
                  >
                    VIEW ALL →
                  </Link>
                </div>
              }
            >
              {geoTab !== 'country' ? (
                <div className="py-8 text-center border border-dashed border-[#ebebeb] rounded-[4px] bg-[#fafafa]">
                  <Globe className="w-5 h-5 text-[#999999] mx-auto mb-2" />
                  <p className="font-mono text-[11px] uppercase text-[#71717a]">{geoTab} breakdown</p>
                  <p className="font-display text-[13px] text-[#999999] mt-1">Region/City from CF headers — coming next. Country is live.</p>
                </div>
              ) : countries.length === 0 ? (
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
                  {countries.map((c, idx) => {
                    const active = isFilterActive('country', c.country);
                    return (
                      <DataTableRow
                        key={idx}
                        percent={(Number(c.visitors) / maxCountryVisitors) * 100}
                        className={active ? 'bg-[#c8f6f9]/30' : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => setFilter({ type: 'country', value: c.country })}
                          disabled={active}
                          className={`font-display text-[14px] truncate flex-1 text-left pr-2 cursor-pointer hover:underline disabled:no-underline disabled:cursor-default ${
                            active ? 'text-black font-semibold' : 'text-black'
                          }`}
                          title={active ? 'Currently filtered' : `Filter by ${c.country}`}
                        >
                          {c.country}
                        </button>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                          {formatNumber(Number(c.visitors))}
                        </span>
                        <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                          {formatNumber(Number(c.sessions))}
                        </span>
                      </DataTableRow>
                    );
                  })}
                </div>
              )}
              {/* WorldMap placeholder — Umami parity */}
              <div className="mt-4 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] flex items-center gap-3">
                <Globe className="w-4 h-4 text-[#71717a] shrink-0" />
                <span className="font-mono text-[10px] uppercase text-[#71717a]">World map</span>
                <span className="font-display text-[12px] text-[#999999]">SVG map renders from country data — coming soon.</span>
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="HARDWARE & BROWSERS"
              title={deviceTab === 'browser' ? 'Browsers' : deviceTab === 'os' ? 'Operating Systems' : 'Device Types'}
              action={
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-0.5">
                    {(['browser', 'os', 'device'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDeviceTab(t)}
                        className={`px-2 py-0.5 font-mono text-[10px] uppercase rounded-[3px] transition-colors cursor-pointer ${deviceTab === t ? 'bg-black text-white' : 'text-[#71717a] hover:text-black'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const data =
                        deviceTab === 'browser'
                          ? devices.browsers
                          : deviceTab === 'os'
                            ? devices.os
                            : devices.devices;
                      handleExportTable(
                        `devices-${deviceTab}`,
                        ['name,count', ...(data ?? []).map((d) => `${d.name},${d.count}`)],
                      );
                    }}
                    className="p-1.5 border border-[#ebebeb] rounded-[4px] hover:bg-[#fafafa] text-[#71717a] hover:text-black transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/app/${website.id}/devices`}
                    className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors hidden sm:inline"
                  >
                    VIEW ALL →
                  </Link>
                </div>
              }
            >
              {deviceSegments.length > 0 && deviceTab === 'device' && (
                <div className="mb-6 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                  <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-2">HARDWARE RATIO</span>
                  <SegmentedProgressBar segments={deviceSegments} />
                </div>
              )}
              {(() => {
                const list =
                  deviceTab === 'browser' ? devices.browsers : deviceTab === 'os' ? devices.os : devices.devices;
                if (!list || list.length === 0) {
                  return <p className="py-6 text-center text-[#71717a] font-display text-[14px]">No {deviceTab} data recorded</p>;
                }
                return (
                  <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                    <DataTableHeader columns={[{ label: deviceTab.toUpperCase() }, { label: 'VISITORS', width: '90px', align: 'right' }]} />
                    {list.slice(0, 6).map((b, idx) => (
                      <DataTableRow key={idx}>
                        <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{b.name}</span>
                        <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                          {Number(b.count).toLocaleString()}
                        </span>
                      </DataTableRow>
                    ))}
                  </div>
                );
              })()}
            </PanelCard>
          </div>

          {/* Channels — UTM source attribution (Umami parity) */}
          {channels.length > 0 && (
            <PanelCard
              eyebrow="ACQUISITION"
              title="Top Channels"
              action={
                <span className="font-mono text-[10px] uppercase text-[#999999] hidden sm:inline">
                  UTM_SOURCE · auto-captured
                </span>
              }
            >
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'CHANNEL (UTM_SOURCE)' },
                    { label: 'VIEWS', width: '90px', align: 'right' },
                    { label: 'VISITORS', width: '90px', align: 'right' },
                  ]}
                />
                {channels.slice(0, 6).map((ch, idx) => (
                  <DataTableRow key={idx} percent={(Number(ch.pageviews) / maxChannelViews) * 100}>
                    <span className="inline-flex items-center gap-2 flex-1 pr-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#bdbbff] shrink-0" />
                      <span className="font-display text-[14px] text-black font-medium truncate">{ch.utm_source}</span>
                    </span>
                    <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                      {Number(ch.pageviews).toLocaleString()}
                    </span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                      {Number(ch.visitors).toLocaleString()}
                    </span>
                  </DataTableRow>
                ))}
              </div>
              <p className="font-mono text-[10px] uppercase text-[#999999] mt-3">
                UTM params <span className="text-[#71717a]">utm_source/medium/campaign</span> + click IDs <span className="text-[#71717a]">gclid/fbclid</span> are captured automatically from the URL. No code change needed.
              </p>
            </PanelCard>
          )}

          {/* AI Traffic — referrals from ChatGPT/Perplexity/Gemini/Claude/Copilot */}
          {aiSources.length > 0 && (
            <PanelCard
              eyebrow="ACQUISITION"
              title="AI Traffic"
              action={
                <span className="font-mono text-[10px] uppercase text-[#999999] hidden sm:inline">
                  AI ASSISTANT REFERRALS · AUTO-DETECTED
                </span>
              }
            >
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'AI SOURCE' },
                    { label: 'VIEWS', width: '90px', align: 'right' },
                    { label: 'VISITORS', width: '90px', align: 'right' },
                  ]}
                />
                {[...aiSources]
                  .sort((a, b) => Number(b.pageviews) - Number(a.pageviews))
                  .map((ai, idx) => (
                    <DataTableRow key={idx} percent={(Number(ai.pageviews) / maxAiViews) * 100}>
                      <span className="inline-flex items-center gap-2 flex-1 pr-2 min-w-0">
                        <Sparkles className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                        <span className="font-display text-[14px] text-black font-medium truncate">
                          {AI_SOURCE_LABELS[ai.source] ?? ai.source}
                        </span>
                      </span>
                      <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">
                        {formatNumber(Number(ai.pageviews))}
                      </span>
                      <span className="font-mono text-[13px] text-[#71717a] w-[90px] text-right">
                        {formatNumber(Number(ai.visitors))}
                      </span>
                    </DataTableRow>
                  ))}
              </div>
            </PanelCard>
          )}

          {/* Custom events strip (only when any exist) */}
          {events.length > 0 && (
            <PanelCard
              eyebrow="EVENTS"
              title="Top Custom Events"
              action={
                <Link
                  href={`/app/${website.id}/events`}
                  className="font-mono text-[11px] uppercase text-[#71717a] hover:text-black transition-colors"
                >
                  VIEW ALL →
                </Link>
              }
            >
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'EVENT' },
                    { label: 'TRIGGERS', width: '100px', align: 'right' },
                    { label: 'VISITORS', width: '100px', align: 'right' },
                  ]}
                />
                {events.slice(0, 6).map((ev, idx) => (
                  <DataTableRow key={idx}>
                    <span className="inline-flex items-center gap-2 flex-1 pr-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                      <span className="font-display text-[14px] text-black font-medium truncate">{ev.event_name}</span>
                    </span>
                    <span className="font-mono text-[13px] text-black w-[100px] text-right font-medium">
                      {Number(ev.total_events).toLocaleString()}
                    </span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[100px] text-right">
                      {Number(ev.unique_visitors).toLocaleString()}
                    </span>
                  </DataTableRow>
                ))}
              </div>
            </PanelCard>
          )}
        </div>
      )}

      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
