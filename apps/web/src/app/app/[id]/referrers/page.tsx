'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { TopReferrer } from '@analytics/db/types';
import { peekOverview, loadOverview } from '@analytics/db/overview-store';
import { RANGE_OPTIONS } from '@analytics/db/range';
import type { DashboardRange } from '@analytics/db/types';
import {
  PanelCard,
  TogglePillGroup,
  DataTableHeader,
  DataTableRow,
  ButtonOutline,
  SkeletonRows,
} from '@analytics/ui';
import { RefreshCw, Search, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function ReferrersBreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrers = useCallback(
    async (force = false) => {
      setError(null);
      // Shared store: instant paint from cache when warm; zero extra requests
      // within the TTL after visiting the overview.
      const peek = force ? null : peekOverview(websiteId, range, null);
      if (!peek) setLoading(true);
      else setReferrers((peek.data.referrers as TopReferrer[]) ?? []);
      try {
        if (peek?.fresh && !force) return;
        const data = await loadOverview(supabase, websiteId, range, { limit: 100 });
        setReferrers((data.referrers as TopReferrer[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load referrers.');
      } finally {
        setLoading(false);
      }
    },
    [range, websiteId, supabase],
  );

  useEffect(() => {
    fetchReferrers();
  }, [fetchReferrers]);
  useEffect(() => {
    setPage(1);
  }, [range, searchQuery]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return referrers;
    return referrers.filter((r) => r.referrer_domain.toLowerCase().includes(q));
  }, [referrers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const maxViews = filtered.length ? Math.max(...filtered.map((r) => Number(r.pageviews))) : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <Link
            href={`/app/${websiteId}`}
            className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
          </Link>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            Referrers & Acquisition Sources
          </h1>
          <p className="font-display text-[13px] text-[#71717a] mt-1">Where your visitors came from.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <ButtonOutline onClick={() => fetchReferrers(true)} className="px-3" aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by domain…"
              aria-label="Filter referrers by domain"
              className="w-full bg-white text-black border border-[#ebebeb] rounded-[4px] pl-9 pr-3.5 h-10 text-[14px] placeholder:text-[#999999] focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
            />
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
            <ButtonOutline type="button" onClick={() => fetchReferrers(true)} className="h-7 px-2.5 text-[11px]">
              RETRY
            </ButtonOutline>
          </div>
        )}

        <PanelCard>
          {loading ? (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader columns={[{ label: 'REFERRER HOST' }, { label: 'PAGEVIEWS', width: '130px', align: 'right' }, { label: 'VISITORS', width: '140px', align: 'right' }]} />
              <SkeletonRows rows={8} columns={['55%', '80px', '80px']} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 font-display text-[14px] text-[#71717a]">
              {searchQuery ? `No referrers match “${searchQuery}”.` : 'No referrer data in this period.'}
            </p>
          ) : (
            <>
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'REFERRER HOST' }, { label: 'PAGEVIEWS', width: '130px', align: 'right' }, { label: 'VISITORS', width: '140px', align: 'right' }]} />
                {paginated.map((r, idx) => (
                  <DataTableRow key={`${r.referrer_domain}-${idx}`} percent={(Number(r.pageviews) / maxViews) * 100}>
                    <span className="font-display text-[14px] text-black font-medium truncate flex-1 pr-4 min-w-0">{r.referrer_domain}</span>
                    <span className="font-mono text-[13px] text-black w-[130px] text-right font-medium shrink-0">{Number(r.pageviews).toLocaleString()}</span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[140px] text-right shrink-0">{Number(r.visitors).toLocaleString()}</span>
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
