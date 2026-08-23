'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ButtonPrimary,
  ButtonSecondaryMint,
  ButtonSecondaryWhite,
  ButtonGhostOnDark,
  ButtonOutline,
  ButtonIcon,
  StatsCardTinted,
  StatsCardPlain,
  ChartCard,
  PanelCard,
  ResearchCard,
  CodeEditorMockup,
  EmptyStateCard,
  TextInput,
  TogglePillGroup,
  FeatureTabPill,
  FilterTab,
  Checkbox,
  Switch,
  DataTableHeader,
  DataTableRow,
  BadgeNeutral,
  BadgeSubtleOnDark,
  LiveDot,
  UPlotChart,
  SegmentedProgressBar,
  TrendBadge,
} from '@analytics/ui';
import { Sparkles, Globe, Shield, RefreshCw, Layers } from 'lucide-react';

export default function DesignKitchenSinkPage() {
  const [toggleVal, setToggleVal] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [switchChecked, setSwitchChecked] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);

  // Mock timeseries for design preview
  const demoChartData = [
    { time: 1700000000, pageviews: 120, visitors: 85 },
    { time: 1700086400, pageviews: 240, visitors: 160 },
    { time: 1700172800, pageviews: 180, visitors: 130 },
    { time: 1700259200, pageviews: 310, visitors: 220 },
    { time: 1700345600, pageviews: 450, visitors: 310 },
    { time: 1700432000, pageviews: 390, visitors: 280 },
    { time: 1700518400, pageviews: 520, visitors: 390 },
  ];

  return (
    <div className="min-h-screen bg-white text-black py-12 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Header */}
      <div className="border-b border-[#ebebeb] pb-6 flex items-center justify-between">
        <div>
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-1">
            ANALYTICS BY SUFYAAN STUDIO — DESIGN SYSTEM
          </span>
          <h1 className="font-display text-[36px] font-medium tracking-[-0.8px]">
            Design System Primitives & Tokens
          </h1>
        </div>
        <Link href="/">
          <ButtonOutline>BACK TO HOME</ButtonOutline>
        </Link>
      </div>

      {/* 1. Color Palette Tokens */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          01 // Brand & Surface Colors
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 font-mono text-[11px]">
          <div className="p-4 bg-black text-white rounded-[4px]">
            <div className="font-bold">PRIMARY</div>
            <div className="text-zinc-400">#000000</div>
          </div>
          <div className="p-4 bg-[#c8f6f9] text-black rounded-[4px]">
            <div className="font-bold">ACCENT MINT</div>
            <div className="text-zinc-700">#c8f6f9</div>
          </div>
          <div className="p-4 bg-[#bdbbff] text-black rounded-[4px]">
            <div className="font-bold">PERIWINKLE</div>
            <div className="text-zinc-700">#bdbbff</div>
          </div>
          <div className="p-4 bg-[#010120] text-white rounded-[4px]">
            <div className="font-bold">CANVAS DARK</div>
            <div className="text-zinc-400">#010120</div>
          </div>
          <div className="p-4 bg-[#26263a] text-white rounded-[4px]">
            <div className="font-bold">DARK SOFT</div>
            <div className="text-zinc-400">#26263a</div>
          </div>
          <div className="p-4 bg-[#313641] text-white rounded-[4px]">
            <div className="font-bold">DARK FILL</div>
            <div className="text-zinc-400">#313641</div>
          </div>
        </div>
      </section>

      {/* 2. Button Inventory */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          02 // Button Inventory (Exact Variants)
        </h2>
        <div className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] flex flex-wrap items-center gap-4">
          <ButtonPrimary>BUTTON PRIMARY</ButtonPrimary>
          <ButtonSecondaryMint>SECONDARY MINT</ButtonSecondaryMint>
          <ButtonSecondaryWhite>SECONDARY WHITE</ButtonSecondaryWhite>
          <ButtonOutline>BUTTON OUTLINE</ButtonOutline>
          <div className="p-2 bg-[#010120] rounded-[4px]">
            <ButtonGhostOnDark>GHOST ON DARK</ButtonGhostOnDark>
          </div>
          <ButtonIcon>
            <RefreshCw className="w-4 h-4" />
          </ButtonIcon>
        </div>
      </section>

      {/* 3. Inputs & Controls */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          03 // Inputs, Toggles & Tabs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
          <div className="space-y-4">
            <TextInput label="WEBSITE DOMAIN" placeholder="example.com" helper="Enter domain without protocol" />
            <div className="flex items-center gap-6">
              <Switch checked={switchChecked} onChange={setSwitchChecked} label="Public share link" />
              <Checkbox checked={checkboxChecked} onChange={(e) => setCheckboxChecked(e.target.checked)} label="Respect DNT" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">TOGGLE PILL GROUP</span>
              <TogglePillGroup
                options={[
                  { value: '24h', label: '24H' },
                  { value: '7d', label: '7D' },
                  { value: '30d', label: '30D' },
                  { value: '90d', label: '90D' },
                ]}
                value={toggleVal}
                onChange={(v: any) => setToggleVal(v)}
              />
            </div>
            <div>
              <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">FEATURE TAB PILL</span>
              <FeatureTabPill
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'performance', label: 'Performance' },
                  { id: 'security', label: 'Security' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Badges, Indicators & Progress Bars */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          04 // Badges, Trends & Progress Bars
        </h2>
        <div className="p-6 bg-white border border-[#ebebeb] rounded-[4px] space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <LiveDot />
              <span className="font-mono text-[11px] uppercase">Live Pulse Dot</span>
            </div>
            <BadgeNeutral>Neutral Badge</BadgeNeutral>
            <TrendBadge value="+14.2%" isPositive={true} />
            <TrendBadge value="-3.8%" isPositive={false} />
            <div className="p-2 bg-[#010120] rounded-[4px] inline-block">
              <BadgeSubtleOnDark>Subtle on Dark</BadgeSubtleOnDark>
            </div>
          </div>

          <div>
            <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2">
              SEGMENTED PROGRESS BAR
            </span>
            <SegmentedProgressBar
              segments={[
                { label: 'Desktop', value: 65, color: '#000000' },
                { label: 'Mobile', value: 30, color: '#bdbbff' },
                { label: 'Tablet', value: 5, color: '#c8f6f9' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 5. Stat Cards */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          05 // Stats Cards (Tinted & Plain)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCardTinted label="UNIQUE VISITORS" value="48.2k" delta="+12.4% vs last mo" variant="mint" />
          <StatsCardTinted label="PAGEVIEWS" value="142.8k" delta="+8.2% vs last mo" variant="periwinkle" />
          <StatsCardPlain label="BOUNCE RATE" value="32.4%" delta="482 single views" />
          <StatsCardPlain label="AVG DURATION" value="2m 45s" delta="12.4k sessions" />
        </div>
      </section>

      {/* 6. Chart Card */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          06 // uPlot Timeseries Chart
        </h2>
        <ChartCard title="TRAFFIC DEMO" subtitle="Sample timeseries visualization">
          <UPlotChart data={demoChartData} />
        </ChartCard>
      </section>

      {/* 7. Data Tables */}
      <section className="space-y-4">
        <h2 className="font-mono text-[13px] uppercase font-medium text-[#71717a]">
          07 // Data Table with Proportional Fill
        </h2>
        <div className="border border-[#ebebeb] rounded-[4px] overflow-hidden">
          <DataTableHeader
            columns={[
              { label: 'PAGE PATH' },
              { label: 'VIEWS', width: '100px', align: 'right' },
              { label: 'VISITORS', width: '100px', align: 'right' },
            ]}
          />
          <DataTableRow percent={100}>
            <span className="font-display text-[14px]">/ (Home page)</span>
            <span className="font-mono text-[13px] w-[100px] text-right font-medium">12,480</span>
            <span className="font-mono text-[13px] text-[#71717a] w-[100px] text-right">8,920</span>
          </DataTableRow>
          <DataTableRow percent={60}>
            <span className="font-display text-[14px]">/pricing</span>
            <span className="font-mono text-[13px] w-[100px] text-right font-medium">7,488</span>
            <span className="font-mono text-[13px] text-[#71717a] w-[100px] text-right">5,350</span>
          </DataTableRow>
          <DataTableRow percent={35}>
            <span className="font-display text-[14px]">/docs/quickstart</span>
            <span className="font-mono text-[13px] w-[100px] text-right font-medium">4,368</span>
            <span className="font-mono text-[13px] text-[#71717a] w-[100px] text-right">3,120</span>
          </DataTableRow>
        </div>
      </section>
    </div>
  );
}
