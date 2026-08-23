'use client';

import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import type { TopEvent } from '@analytics/db/types';
import { peekOverview, loadOverview } from '@analytics/db/overview-store';
import { RANGE_OPTIONS } from '@analytics/db/range';
import type { DashboardRange } from '@analytics/db/types';
import {
  PanelCard,
  TogglePillGroup,
  DataTableHeader,
  DataTableRow,
  ButtonOutline,
  ButtonPrimary,
  CodeEditorMockup,
  TextInput,
  Toast,
  SkeletonRows,
} from '@analytics/ui';
import { RefreshCw, Zap, ArrowLeft, Send, Search, AlertCircle } from 'lucide-react';

export default function EventsBreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [events, setEvents] = useState<TopEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const [customEventName, setCustomEventName] = useState('button_click');
  const [customPropKey, setCustomPropKey] = useState('plan');
  const [customPropVal, setCustomPropVal] = useState('pro');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchEvents = useCallback(
    async (force = false) => {
      setError(null);
      // Shared store: instant paint from cache when warm; zero extra requests
      // within the TTL after visiting the overview.
      const peek = force ? null : peekOverview(websiteId, range, null);
      if (!peek) setLoading(true);
      else setEvents((peek.data.events as TopEvent[]) ?? []);
      try {
        if (peek?.fresh && !force) return;
        const data = await loadOverview(supabase, websiteId, range, { limit: 100 });
        setEvents((data.events as TopEvent[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    },
    [range, websiteId, supabase],
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => ev.event_name.toLowerCase().includes(q));
  }, [events, search]);

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const payload = {
        w: websiteId,
        n: customEventName.trim() || 'custom_event',
        u: typeof window !== 'undefined' ? window.location.pathname : '/',
        p: { [customPropKey.trim() || 'value']: customPropVal.trim() || '1' },
      };
      await fetch('/c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setToastMsg(`Test event '${payload.n}' sent!`);
      // force=true: the just-sent event must bypass the fresh shared cache.
      setTimeout(() => fetchEvents(true), 1000);
    } catch (e: any) {
      setToastMsg(e.message || 'Error triggering test event');
    } finally {
      setSendingTest(false);
    }
  };

  const dynamicCodeSnippet = `// Trigger this event in your frontend:
window.analytics.track('${customEventName || 'event_name'}', {
  ${customPropKey || 'property'}: '${customPropVal || 'value'}'
});`;

  const maxEvents = filtered.length ? Math.max(...filtered.map((e) => Number(e.total_events))) : 1;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="min-w-0">
          <Link href={`/app/${websiteId}`} className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-1.5">
            <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
          </Link>
          <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">Custom Events & Conversions</h1>
          <p className="font-display text-[13px] text-[#71717a] mt-1">Track any user action with <code className="font-mono text-[11px] bg-[#f2f2f2] px-1 py-0.5 rounded">window.analytics.track()</code>.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TogglePillGroup options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <ButtonOutline onClick={() => fetchEvents(true)} className="px-3" aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <h2 className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">RECORDED EVENTS</h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999999] pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter events…" aria-label="Filter events" className="w-full bg-white text-black border border-[#ebebeb] rounded-[4px] pl-8 pr-3 h-8 text-[13px] placeholder:text-[#999999] focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-display text-[13px] text-red-900"><AlertCircle className="w-4 h-4" /> {error}</span>
              <ButtonOutline type="button" onClick={() => fetchEvents(true)} className="h-7 px-2.5 text-[11px]">RETRY</ButtonOutline>
            </div>
          )}

          <PanelCard>
            {loading ? (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'EVENT NAME' }, { label: 'TRIGGERS', width: '120px', align: 'right' }, { label: 'VISITORS', width: '120px', align: 'right' }]} />
                <SkeletonRows rows={6} columns={['55%', '70px', '70px']} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Zap className="w-8 h-8 text-[#999999] mx-auto mb-3" />
                <h4 className="font-display text-[16px] font-medium text-black mb-1">{search ? `No events match “${search}”.` : 'No custom events recorded yet'}</h4>
                {!search && (
                  <p className="font-display text-[13px] text-[#71717a] max-w-sm mx-auto">
                    Use the builder on the right or call <code className="font-mono text-[11px] bg-[#ebebeb] px-1 py-0.5 rounded text-black">window.analytics.track()</code> to send your first event.
                  </p>
                )}
              </div>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader columns={[{ label: 'EVENT NAME' }, { label: 'TRIGGERS', width: '120px', align: 'right' }, { label: 'VISITORS', width: '120px', align: 'right' }]} />
                {filtered.map((ev, idx) => (
                  <DataTableRow key={`${ev.event_name}-${idx}`} percent={(Number(ev.total_events) / maxEvents) * 100}>
                    <span className="inline-flex items-center gap-2 flex-1 pr-4 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                      <span className="font-display text-[14px] text-black font-medium truncate">{ev.event_name}</span>
                    </span>
                    <span className="font-mono text-[13px] text-black w-[120px] text-right font-medium shrink-0">{Number(ev.total_events).toLocaleString()}</span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[120px] text-right shrink-0">{Number(ev.unique_visitors).toLocaleString()}</span>
                  </DataTableRow>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <PanelCard eyebrow="INTERACTIVE PLAYGROUND" title="Test & Generate Event Code">
            <p className="font-display text-[13px] leading-[20px] text-[#71717a] mb-5">Dispatch a live test event to verify ingestion end-to-end. It will appear in the table within seconds.</p>
            <div className="space-y-4 mb-6">
              <TextInput label="EVENT NAME" value={customEventName} onChange={(e) => setCustomEventName(e.target.value)} placeholder="e.g. signup_clicked" />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="PROPERTY KEY" value={customPropKey} onChange={(e) => setCustomPropKey(e.target.value)} placeholder="e.g. plan" />
                <TextInput label="PROPERTY VALUE" value={customPropVal} onChange={(e) => setCustomPropVal(e.target.value)} placeholder="e.g. pro" />
              </div>
              <ButtonPrimary type="button" onClick={handleSendTest} disabled={sendingTest} className="w-full flex items-center justify-center gap-2">
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'DISPATCHING…' : 'SEND LIVE TEST EVENT'}</span>
              </ButtonPrimary>
            </div>
            <CodeEditorMockup code={dynamicCodeSnippet} title="GENERATED JAVASCRIPT" />
          </PanelCard>
        </div>
      </div>

      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
