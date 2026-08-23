'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { TopCountry } from '@analytics/db/types';
import { rangeWindow, RANGE_OPTIONS } from '@analytics/db/range';
import type { DashboardRange } from '@analytics/db/types';
import { PanelCard, TogglePillGroup, DataTableHeader, DataTableRow, ButtonOutline, SkeletonRows } from '@analytics/ui';
import { RefreshCw, Search, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function CountriesBreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [countries, setCountries] = useState<TopCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = rangeWindow(range);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_top_countries', {
        p_website_id: websiteId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_limit: 200,
      });
      if (rpcError) throw new Error(rpcError.message);
      setCountries((data as TopCountry[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load countries.');
    } finally {
      setLoading(false);
    }
  }, [range, websiteId, supabase]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);
  useEffect(() => {
    setPage(1);
  }, [range, searchQuery]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.country.toLowerCase().includes(q));
  }, [countries, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const maxVisitors = filtered.length ? Math.max(...filtered.map((c) => Number(c.visitors))) : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <Link href={`/app/${websiteId}`} className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-1.5">
            <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
          </Link>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">Geographic Distribution</h1>
          <p className="font-display text-[13px] text-[#71717a] mt-1">Where your audience visits from (based on Cloudflare IP geolocation).</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <ButtonOutline onClick={fetchCountries} className="px-3" aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] pointer-events-none" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by country…" aria-label="Filter by country" className="w-full bg-white text-black border border-[#ebebeb] rounded-[4px] pl-9 pr-3.5 h-10 text-[14px] placeholder:text-[#999999] focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black" />
          </div>
          <span className="font-mono text-[11px] uppercase text-[#999999] whitespace-nowrap">
            {loading ? 'Loading…' : `${filtered.length.toLocaleString()} result${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-display text-[13px] text-red-900">
              <AlertCircle className="w-4 h-4" /> {error}
            </span>
            <ButtonOutline type="button" onClick={fetchCountries} className="h-7 px-2.5 text-[11px]">RETRY</ButtonOutline>
          </div>
        )}

        <PanelCard>
          {loading ? (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader columns={[{ label: 'COUNTRY' }, { label: 'VISITORS', width: '140px', align: 'right' }, { label: 'SESSIONS', width: '120px', align: 'right' }]} />
              <SkeletonRows rows={8} columns={['55%', '80px', '80px']} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 font-display text-[14px] text-[#71717a]">
              {searchQuery ? `No countries match “${searchQuery}”.` : 'No geography data in this period.'}
            </p>
          ) : (
            <>
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'COUNTRY' }, { label: 'VISITORS', width: '140px', align: 'right' }, { label: 'SESSIONS', width: '120px', align: 'right' }]} />
                {paginated.map((c, idx) => (
                  <DataTableRow key={`${c.country}-${idx}`} percent={(Number(c.visitors) / maxVisitors) * 100}>
                    <span className="font-display text-[14px] text-black font-medium truncate flex-1 pr-4 min-w-0">{c.country}</span>
                    <span className="font-mono text-[13px] text-black w-[140px] text-right font-medium shrink-0">{Number(c.visitors).toLocaleString()}</span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[120px] text-right shrink-0">{Number(c.sessions).toLocaleString()}</span>
                  </DataTableRow>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="font-mono text-[11px] uppercase text-[#999999]">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <ButtonOutline type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 disabled:opacity-40">
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> PREV
                    </ButtonOutline>
                    <ButtonOutline type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 px-3 disabled:opacity-40">
                      NEXT <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </ButtonOutline>
                  </div>
                </div>
              )}
            </>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
