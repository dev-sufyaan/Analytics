// apps/mobile/src/data/keys.ts
import type { DashboardFilter, DashboardRange } from '@analytics/db/types';

export const queryKeys = {
  all: ['analytics'] as const,
  user: () => [...queryKeys.all, 'user'] as const,
  sites: () => [...queryKeys.all, 'sites'] as const,
  site: (id: string) => [...queryKeys.sites(), id] as const,
  overview: (siteId: string, range: DashboardRange, filter?: DashboardFilter | null) =>
    [...queryKeys.all, 'overview', siteId, range, filter?.type ?? null, filter?.value ?? null] as const,
  realtime: (siteId: string) => [...queryKeys.all, 'realtime', siteId] as const,
};
