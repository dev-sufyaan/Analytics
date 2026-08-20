'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// 1. DataTableHeader
export interface DataTableHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: { label: string; width?: string; align?: 'left' | 'right' | 'center' }[];
  className?: string;
}

export function DataTableHeader({ columns, className, ...props }: DataTableHeaderProps) {
  return (
    <div
      className={cn(
        'w-full bg-[#f7f7f7] border-y border-[#ebebeb] px-4 py-3 flex items-center justify-between',
        className
      )}
      {...props}
    >
      {columns.map((col, idx) => (
        <span
          key={idx}
          style={{ width: col.width }}
          className={cn(
            'font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]',
            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
            !col.width && 'flex-1'
          )}
        >
          {col.label}
        </span>
      ))}
    </div>
  );
}

// 2. DataTableRow
export interface DataTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  percent?: number;
  className?: string;
}

export function DataTableRow({ children, percent, className, ...props }: DataTableRowProps) {
  return (
    <div
      className={cn(
        'w-full bg-white border-b border-[#ebebeb] px-4 py-3 flex items-center justify-between text-black transition-colors hover:bg-[#fafafa] relative overflow-hidden group',
        className
      )}
      {...props}
    >
      {percent !== undefined && percent > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-[#c8f6f9]/35 pointer-events-none transition-all duration-300 group-hover:bg-[#c8f6f9]/50"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      )}
      <div className="relative z-10 w-full flex items-center justify-between">
        {children}
      </div>
    </div>
  );
}

// 3. ProgressBar
export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('w-full bg-[#f2f2f2] h-1.5 rounded-none overflow-hidden', className)}>
      <div
        className="bg-black h-full transition-all duration-300"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}

// 4. SegmentedProgressBar (multi-part visual ratio bar)
export interface SegmentItem {
  label: string;
  value: number;
  color: string;
}

export function SegmentedProgressBar({
  segments,
  className,
}: {
  segments: SegmentItem[];
  className?: string;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="w-full h-2 rounded-[2px] overflow-hidden flex bg-[#ebebeb]">
        {segments.map((seg, idx) => {
          const widthPct = (seg.value / total) * 100;
          if (widthPct <= 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.value} (${widthPct.toFixed(1)}%)`}
              className="h-full transition-all duration-300"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[12px] font-display">
        {segments.map((seg, idx) => {
          const widthPct = ((seg.value / total) * 100).toFixed(1);
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[#71717a]">{seg.label}:</span>
              <span className="font-mono font-medium text-black">{widthPct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. TrendBadge (+14.2% or -3.1%)
export function TrendBadge({
  value,
  isPositive = true,
  className,
}: {
  value: string;
  isPositive?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-medium uppercase',
        isPositive ? 'bg-[#c8f6f9] text-black' : 'bg-[#f4f4f5] text-[#71717a]',
        className
      )}
    >
      <span>{isPositive ? '↑' : '↓'}</span>
      <span>{value}</span>
    </span>
  );
}

// 6. SparkBar (40x12 ink spark bar as specified in agent.md §9.7)
export function SparkBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={cn('w-[40px] h-[12px] bg-[#ebebeb] rounded-[2px] overflow-hidden flex items-end', className)}>
      <div
        className="w-full bg-black transition-all duration-200"
        style={{ height: `${Math.min(Math.max(percent, 8), 100)}%` }}
      />
    </div>
  );
}

// 7. BadgeNeutral
export interface BadgeNeutralProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

export function BadgeNeutral({ children, className, ...props }: BadgeNeutralProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f2f2f2] border border-[#ebebeb] text-black font-mono text-[10px] font-medium uppercase tracking-[0.04em]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// 8. BadgeSubtleOnDark
export interface BadgeSubtleOnDarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

export function BadgeSubtleOnDark({ children, className, ...props }: BadgeSubtleOnDarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-[4px] bg-[#26263a] text-white font-mono text-[11px] font-medium uppercase tracking-[0.055em]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// 9. LiveDot (8px, radius-full, mint, pulse)
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2 items-center justify-center shrink-0', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f6f9] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c8f6f9]" />
    </span>
  );
}
