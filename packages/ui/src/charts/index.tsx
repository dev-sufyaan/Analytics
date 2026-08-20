'use client';

import React, { useEffect, useRef, useState } from 'react';
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
}

export function UPlotChart({ data, height = 260, className }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [hoverData, setHoverData] = useState<{
    dateStr: string;
    views: number;
    visitors: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Ensure sorted timestamps
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const timestamps = sorted.map((d) => d.time);
    const pageviews = sorted.map((d) => Number(d.pageviews) || 0);
    const visitors = sorted.map((d) => Number(d.visitors) || 0);

    const uplotData: [number[], number[], number[]] = [timestamps, pageviews, visitors];
    const width = containerRef.current.clientWidth || 600;

    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];

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
              return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
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
            const idx = u.cursor.idx;
            if (idx !== null && idx !== undefined && idx >= 0 && idx < timestamps.length) {
              const d = new Date(timestamps[idx] * 1000);
              setHoverData({
                dateStr: d.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
                views: pageviews[idx],
                visitors: visitors[idx],
              });
            } else {
              setHoverData(null);
            }
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
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="w-full h-full min-h-[220px] flex items-center justify-center text-[#71717a] font-mono text-[11px] uppercase">
        No timeseries data in selected range
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full relative" />
      {hoverData && (
        <div className="mt-3 flex items-center gap-5 px-3.5 py-2 bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase tracking-[0.05em] text-[#71717a]">
          <span className="font-medium text-black">{hoverData.dateStr}</span>
          <span className="text-black">
            Views: <strong className="text-black font-semibold">{hoverData.views.toLocaleString()}</strong>
          </span>
          <span className="text-[#6461c2]">
            Visitors: <strong className="text-black font-semibold">{hoverData.visitors.toLocaleString()}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
