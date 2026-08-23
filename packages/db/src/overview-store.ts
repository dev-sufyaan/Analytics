// packages/db/src/overview-store.ts
// Shared client-side store for the combined dashboard payload.
//
// ONE module-level SWR cache (30s fresh TTL) is shared by the overview
// dashboard AND every breakdown sub-page (pages / referrers / countries /
// devices / events). Navigating Overview → Pages within the TTL costs ZERO
// extra Supabase requests; each sub-page slices the arrays it needs (payload
// limit is 100 rows, enough for client-side search + pagination).
//
// Contract:
//   peekOverview(...)  -> cached payload if any (plus `fresh` flag); instant.
//   loadOverview(...)  -> network fetch, deduped per key while in flight,
//                         result stored in the same cache. Always resolves
//                         with fresh-from-server data.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DashboardOverview, DashboardFilter, DashboardRange } from './types';
import { getDashboardOverview } from './queries';
import { rangeWindow } from './range';

export const OVERVIEW_TTL = 30_000;

type Entry = { data: DashboardOverview; at: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<DashboardOverview>>();

export function overviewKey(
  websiteId: string,
  range: DashboardRange,
  filter: DashboardFilter | null,
): string {
  return `${websiteId}|${range}|${filter ? `${filter.type}:${filter.value}` : '_'}`;
}

/** Cached payload if present (fresh OR stale) plus whether it is still fresh. */
export function peekOverview(
  websiteId: string,
  range: DashboardRange,
  filter: DashboardFilter | null,
): { data: DashboardOverview; fresh: boolean } | null {
  const entry = cache.get(overviewKey(websiteId, range, filter));
  if (!entry) return null;
  return { data: entry.data, fresh: Date.now() - entry.at < OVERVIEW_TTL };
}

/**
 * Network fetch of the combined payload through the shared cache. Concurrent
 * callers with the same key share ONE request. `force` bypasses nothing at
 * this layer (it is already a fetch); it exists for API clarity at call sites.
 */
export function loadOverview(
  supabase: SupabaseClient,
  websiteId: string,
  range: DashboardRange,
  opts?: {
    filter?: DashboardFilter | null;
    limit?: number;
  },
): Promise<DashboardOverview> {
  const filter = opts?.filter ?? null;
  const key = overviewKey(websiteId, range, filter);

  const pending = inflight.get(key);
  if (pending) return pending;

  const { start, end, prevStart, prevEnd, interval } = rangeWindow(range);
  const p = getDashboardOverview(supabase, websiteId, {
    start,
    end,
    interval,
    prevStart,
    prevEnd,
    filterType: filter?.type ?? null,
    filterValue: filter?.value ?? null,
    limit: opts?.limit ?? 100,
  })
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}
