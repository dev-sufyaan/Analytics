// packages/ui/src/format.ts
// Single source of truth for number/duration/percent formatting so every
// surface (overview, breakdowns, share page) renders values identically.

export function formatNumber(num: number | string | null | undefined): string {
  const n = Number(num) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s === 0) return '0s';
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function percentDelta(current: number, previous: number): string | null {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs prev`;
}

export function isPositiveDelta(delta: string | null): boolean {
  return !!delta && !delta.startsWith('-');
}

// Chart x-axis label: "Aug 21" for day buckets, "14:00" for hour buckets.
export function formatBucketLabel(iso: string, interval: 'hour' | 'day' = 'day'): string {
  const d = new Date(iso);
  if (interval === 'hour') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Full tooltip label: "Aug 21, 2026" or "Aug 21, 2026 · 14:00".
export function formatBucketFull(iso: string, interval: 'hour' | 'day' = 'day'): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (interval === 'hour') {
    return `${date} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date;
}
