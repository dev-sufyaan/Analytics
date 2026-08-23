'use client';

import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface TimeseriesPoint {
  time: number; // Unix timestamp in seconds
  pageviews: number;
  visitors: number;
}

export interface UPlotChartProps {
  data: TimeseriesPoint[];
  height?: number;
  className?: string;
  /** 'hour' buckets render time-of-day axis labels, 'day' renders dates. */
  interval?: 'hour' | 'day';
  /** Renders a shimmer skeleton instead of the empty-state message. */
  loading?: boolean;
}

export function UPlotChart({ data, height = 260, className, interval = 'day', loading }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const timestamps = sorted.map((d) => d.time);
    const pageviews = sorted.map((d) => Number(d.pageviews) || 0);
    const visitors = sorted.map((d) => Number(d.visitors) || 0);

    const uplotData: [number[], number[], number[]] = [timestamps, pageviews, visitors];
    const width = containerRef.current.clientWidth || 600;

    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];

    // Direct DOM readout updates — no React state churn on every cursor move.
    const renderReadout = (idx: number | null | undefined) => {
      const el = readoutRef.current;
      if (!el) return;
      if (idx == null || idx < 0 || idx >= timestamps.length) {
        el.style.visibility = 'hidden';
        return;
      }
      const d = new Date(timestamps[idx] * 1000);
      const dateStr =
        interval === 'hour'
          ? `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
          : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      el.innerHTML = `
        <span class="font-medium text-black">${dateStr}</span>
        <span class="text-black">Views: <strong class="text-black font-semibold">${pageviews[idx].toLocaleString()}</strong></span>
        <span class="text-[#6461c2]">Visitors: <strong class="text-black font-semibold">${visitors[idx].toLocaleString()}</strong></span>
      `;
      el.style.visibility = 'visible';
    };

    const opts: uPlot.Options = {
      width,
      height,
      cursor: {
        points: {
          size: 6,
          fill: '#000000',
        },
      },
      legend: {
        show: true,
      },
      scales: {
        x: {
          time: true,
          min: minTime === maxTime ? minTime - 86400 : minTime,
          max: minTime === maxTime ? maxTime + 86400 : maxTime,
        },
        y: {
          auto: true,
          range: (u, min, max) => [0, Math.max(max, 4) * 1.2],
        },
      },
      axes: [
        {
          stroke: '#71717a',
          grid: { stroke: '#f0f0f0', width: 1 },
          ticks: { stroke: '#ebebeb', width: 1 },
          font: '10px Geist Mono, monospace',
          values: (u, vals) => {
            return vals.map((v) => {
              const d = new Date(v * 1000);
              if (interval === 'hour') {
                return d.getHours() === 0
                  ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              }
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            });
          },
        },
        {
          stroke: '#71717a',
          grid: { stroke: '#f0f0f0', width: 1 },
          ticks: { stroke: '#ebebeb', width: 1 },
          font: '10px Geist Mono, monospace',
          values: (u, vals) => vals.map((v) => (Number.isInteger(v) ? v.toString() : '')),
        },
      ],
      series: [
        {
          label: 'Time',
          value: (u, v) => {
            if (!v) return '--';
            const d = new Date(v * 1000);
            return d.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          },
        },
        {
          label: 'Views',
          stroke: '#000000',
          width: 2,
          fill: 'rgba(0, 0, 0, 0.04)',
          points: {
            show: (u, seriesIdx) => timestamps.length <= 40,
            size: 4,
          },
        },
        {
          label: 'Visitors',
          stroke: '#bdbbff',
          width: 2,
          fill: 'rgba(189, 187, 255, 0.20)',
          points: {
            show: (u, seriesIdx) => timestamps.length <= 40,
            size: 4,
          },
        },
      ],
      hooks: {
        setCursor: [
          (u) => {
            renderReadout(u.cursor.idx);
          },
        ],
      },
    };

    if (plotRef.current) {
      plotRef.current.destroy();
    }

    plotRef.current = new uPlot(opts, uplotData, containerRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && plotRef.current) {
          plotRef.current.setSize({
            width: entry.contentRect.width,
            height,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [data, height, interval]);

  if (data.length === 0) {
    return (
      <div className="w-full h-full min-h-[220px] flex items-center justify-center text-[#71717a] font-mono text-[11px] uppercase">
        {loading ? (
          <span className="flex gap-1.5 items-center">
            <span className="w-1.5 h-1.5 bg-[#ebebeb] rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-[#ebebeb] rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-[#ebebeb] rounded-full animate-pulse [animation-delay:300ms]" />
          </span>
        ) : (
          'No timeseries data in selected range'
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full relative" />
      {/* Readout row is always mounted; hidden until hover so layout never jumps. */}
      <div
        ref={readoutRef}
        style={{ visibility: 'hidden' }}
        className="mt-3 flex items-center gap-5 px-3.5 py-2 bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase tracking-[0.05em] text-[#71717a]"
      />
    </div>
  );
}
