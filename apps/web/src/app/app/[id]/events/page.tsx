'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import { TopEvent } from '@aether/db/types';
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
} from '@aether/ui';
import { RefreshCw, Zap, ArrowLeft, Send, Sparkles, Copy } from 'lucide-react';

export default function EventsBreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: websiteId } = use(params);
  const supabase = createBrowserClient();

  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [events, setEvents] = useState<TopEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Interactive Live Event Tester
  const [customEventName, setCustomEventName] = useState('button_click');
  const [customPropKey, setCustomPropKey] = useState('plan');
  const [customPropVal, setCustomPropVal] = useState('pro');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();

    if (range === '24h') start.setHours(start.getHours() - 24);
    else if (range === '7d') start.setDate(start.getDate() - 7);
    else if (range === '30d') start.setDate(start.getDate() - 30);
    else if (range === '90d') start.setDate(start.getDate() - 90);

    try {
      const { data } = await supabase.rpc('get_top_events', {
        p_website_id: websiteId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_limit: 50,
      });
      if (data) setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, websiteId, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const payload = {
        w: websiteId,
        n: customEventName.trim() || 'custom_event',
        u: typeof window !== 'undefined' ? window.location.pathname : '/',
        p: { [customPropKey.trim()]: customPropVal.trim() },
      };

      await fetch('/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setToastMsg(`Test event '${payload.n}' sent successfully!`);
      setTimeout(fetchEvents, 1000);
    } catch (e: any) {
      setToastMsg(e.message || 'Error triggering test event');
    } finally {
      setSendingTest(false);
    }
  };

  const dynamicCodeSnippet = `// Trigger this event in your frontend:
window.aether.track('${customEventName || 'event_name'}', {
  ${customPropKey || 'property'}: '${customPropVal || 'value'}'
});`;

  const maxEvents = events.length > 0 ? Math.max(...events.map((e) => Number(e.total_events))) : 1;

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
            Custom Events & Conversions
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
          <ButtonOutline onClick={fetchEvents} className="px-3" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Events Table Stream */}
        <div className="lg:col-span-7">
          <PanelCard title={`Recorded Custom Events (${events.length})`}>
            {events.length === 0 ? (
              <div className="py-12 text-center">
                <Zap className="w-8 h-8 text-[#999999] mx-auto mb-3" />
                <h4 className="font-display text-[18px] font-medium text-black mb-1">No custom events recorded yet</h4>
                <p className="font-display text-[14px] text-[#71717a] max-w-sm mx-auto mb-4">
                  Trigger client events using the interactive builder on the right or via <code className="font-mono text-[12px] bg-[#ebebeb] px-1 py-0.5 rounded text-black">window.aether.track()</code>.
                </p>
              </div>
            ) : (
              <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
                <DataTableHeader
                  columns={[
                    { label: 'EVENT NAME' },
                    { label: 'TOTAL TRIGGERS', width: '140px', align: 'right' },
                    { label: 'UNIQUE VISITORS', width: '140px', align: 'right' },
                  ]}
                />
                {events.map((ev, idx) => (
                  <DataTableRow
                    key={idx}
                    percent={(Number(ev.total_events) / maxEvents) * 100}
                  >
                    <div className="flex items-center gap-2 flex-1 pr-4">
                      <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                      <span className="font-display text-[14px] text-black font-medium truncate">
                        {ev.event_name}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-black w-[140px] text-right font-medium">
                      {Number(ev.total_events).toLocaleString()}
                    </span>
                    <span className="font-mono text-[13px] text-[#71717a] w-[140px] text-right">
                      {Number(ev.unique_visitors).toLocaleString()}
                    </span>
                  </DataTableRow>
                ))}
              </div>
            )}
          </PanelCard>
        </div>

        {/* Interactive Event Builder & Playground */}
        <div className="lg:col-span-5 space-y-6">
          <PanelCard eyebrow="INTERACTIVE PLAYGROUND" title="Test & Generate Event Code">
            <p className="font-display text-[14px] leading-[22px] text-[#71717a] mb-5">
              Build and dispatch live test events directly to verify your dashboard ingestion pipeline.
            </p>

            <div className="space-y-4 mb-6">
              <TextInput
                label="EVENT NAME"
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                placeholder="e.g. signup_clicked"
              />

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="PROPERTY KEY"
                  value={customPropKey}
                  onChange={(e) => setCustomPropKey(e.target.value)}
                  placeholder="e.g. plan"
                />
                <TextInput
                  label="PROPERTY VALUE"
                  value={customPropVal}
                  onChange={(e) => setCustomPropVal(e.target.value)}
                  placeholder="e.g. pro"
                />
              </div>

              <ButtonPrimary
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest}
                className="w-full flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'DISPATCHING EVENT...' : 'SEND LIVE TEST EVENT'}</span>
              </ButtonPrimary>
            </div>

            <CodeEditorMockup code={dynamicCodeSnippet} title="GENERATED JAVASCRIPT SNIPPET" />
          </PanelCard>
        </div>
      </div>

      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
