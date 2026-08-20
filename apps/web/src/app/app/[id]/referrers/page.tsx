'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import { TopReferrer } from '@aether/db/types';
import {
  PanelCard,
  TogglePillGroup,
  DataTableHeader,
  DataTableRow,
  ButtonOutline,
  TextInput,
} from '@aether/ui';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function ReferrersBreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: websiteId } = use(params);
  const supabase = createBrowserClient();

  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReferrers = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();

    if (range === '24h') start.setHours(start.getHours() - 24);
    else if (range === '7d') start.setDate(start.getDate() - 7);
    else if (range === '30d') start.setDate(start.getDate() - 30);
    else if (range === '90d') start.setDate(start.getDate() - 90);

    try {
      const { data } = await supabase.rpc('get_top_referrers', {
        p_website_id: websiteId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_limit: 100,
      });
      if (data) setReferrers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, websiteId, supabase]);

  useEffect(() => {
    fetchReferrers();
  }, [fetchReferrers]);

  const filteredReferrers = referrers.filter((r) =>
    r.referrer_domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxViews = filteredReferrers.length > 0 ? Math.max(...filteredReferrers.map((r) => Number(r.pageviews))) : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/app/${websiteId}`}
              className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>BACK TO OVERVIEW</span>
            </Link>
          </div>
          <h1 className="font-display text-[32px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            Referrers & Acquisition Sources
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
          <ButtonOutline onClick={fetchReferrers} className="px-3" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="space-y-6">
        <div className="max-w-md">
          <TextInput
            placeholder="Search domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-[13px]"
          />
        </div>

        <PanelCard title={`Acquisition Sources (${filteredReferrers.length})`}>
          {filteredReferrers.length === 0 ? (
            <p className="text-center py-10 font-display text-[14px] text-[#71717a]">
              {loading ? 'Loading referrers...' : 'No referrer data recorded in this period.'}
            </p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader
                columns={[
                  { label: 'REFERRER HOST' },
                  { label: 'PAGEVIEWS', width: '130px', align: 'right' },
                  { label: 'UNIQUE VISITORS', width: '140px', align: 'right' },
                ]}
              />
              {filteredReferrers.map((r, idx) => (
                <DataTableRow
                  key={idx}
                  percent={(Number(r.pageviews) / maxViews) * 100}
                >
                  <span className="font-display text-[14px] text-black font-medium truncate flex-1 pr-4">
                    {r.referrer_domain}
                  </span>
                  <span className="font-mono text-[13px] text-black w-[130px] text-right font-medium">
                    {Number(r.pageviews).toLocaleString()}
                  </span>
                  <span className="font-mono text-[13px] text-[#71717a] w-[140px] text-right">
                    {Number(r.visitors).toLocaleString()}
                  </span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
