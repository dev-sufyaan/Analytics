// packages/db/src/range.ts
// Shared time-range math so every page computes identical windows.
import type { DashboardRange } from './types';

export const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

export function rangeWindow(range: DashboardRange, now: Date = new Date()): {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  interval: 'hour' | 'day';
} {
  const end = new Date(now);
  const start = new Date(now);

  if (range === '24h') start.setHours(start.getHours() - 24);
  else start.setDate(start.getDate() - Number(range.replace('d', '')));

  // Previous period of equal length, for honest KPI deltas.
  const spanMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - spanMs);
  const prevEnd = new Date(start.getTime());

  return { start, end, prevStart, prevEnd, interval: range === '24h' ? 'hour' : 'day' };
}
