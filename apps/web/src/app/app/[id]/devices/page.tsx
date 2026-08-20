'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@aether/db/client';
import { TopDevices } from '@aether/db/types';
import {
  PanelCard,
  TogglePillGroup,
  DataTableHeader,
  DataTableRow,
  ButtonOutline,
} from '@aether/ui';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function DevicesBreakdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: websiteId } = use(params);
  const supabase = createBrowserClient();

  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [devices, setDevices] = useState<TopDevices>({ browsers: [], os: [], devices: [] });
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();

    if (range === '24h') start.setHours(start.getHours() - 24);
    else if (range === '7d') start.setDate(start.getDate() - 7);
    else if (range === '30d') start.setDate(start.getDate() - 30);
    else if (range === '90d') start.setDate(start.getDate() - 90);

    try {
      const { data } = await supabase.rpc('get_top_devices', {
        p_website_id: websiteId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      if (data) setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range, websiteId, supabase]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const maxBrowser = devices.browsers && devices.browsers.length > 0 ? Math.max(...devices.browsers.map((b) => b.count)) : 1;
  const maxOs = devices.os && devices.os.length > 0 ? Math.max(...devices.os.map((o) => o.count)) : 1;
  const maxDev = devices.devices && devices.devices.length > 0 ? Math.max(...devices.devices.map((d) => d.count)) : 1;

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
            Technology & Platforms
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
          <ButtonOutline onClick={fetchDevices} className="px-3" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonOutline>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Browsers */}
        <PanelCard eyebrow="SOFTWARE" title="Browsers">
          {(!devices.browsers || devices.browsers.length === 0) ? (
            <p className="text-center py-6 font-display text-[14px] text-[#71717a]">No data</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader
                columns={[
                  { label: 'BROWSER' },
                  { label: 'VISITORS', width: '90px', align: 'right' },
                ]}
              />
              {devices.browsers.map((b, idx) => (
                <DataTableRow
                  key={idx}
                  percent={(b.count / maxBrowser) * 100}
                >
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{b.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{b.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>

        {/* Operating Systems */}
        <PanelCard eyebrow="PLATFORM" title="Operating Systems">
          {(!devices.os || devices.os.length === 0) ? (
            <p className="text-center py-6 font-display text-[14px] text-[#71717a]">No data</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader
                columns={[
                  { label: 'OS' },
                  { label: 'VISITORS', width: '90px', align: 'right' },
                ]}
              />
              {devices.os.map((o, idx) => (
                <DataTableRow
                  key={idx}
                  percent={(o.count / maxOs) * 100}
                >
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{o.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{o.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>

        {/* Device Types */}
        <PanelCard eyebrow="HARDWARE" title="Device Types">
          {(!devices.devices || devices.devices.length === 0) ? (
            <p className="text-center py-6 font-display text-[14px] text-[#71717a]">No data</p>
          ) : (
            <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
              <DataTableHeader
                columns={[
                  { label: 'DEVICE' },
                  { label: 'VISITORS', width: '90px', align: 'right' },
                ]}
              />
              {devices.devices.map((d, idx) => (
                <DataTableRow
                  key={idx}
                  percent={(d.count / maxDev) * 100}
                >
                  <span className="font-display text-[14px] text-black truncate flex-1 pr-2">{d.name}</span>
                  <span className="font-mono text-[13px] text-black w-[90px] text-right font-medium">{d.count.toLocaleString()}</span>
                </DataTableRow>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
