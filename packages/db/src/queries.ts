// packages/db/src/queries.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Website,
  DashboardOverview,
  WebsiteEventStats,
  RealtimeData,
} from './types';

export async function getUserWebsites(supabase: SupabaseClient): Promise<Website[]> {
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
  return (data as Website[]) || [];
}

export async function getWebsiteById(supabase: SupabaseClient, id: string): Promise<Website | null> {
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }
  return data as Website;
}

// --- Combined overview: ONE round trip powers the whole dashboard ---
// (shared client-side cache lives in ./overview-store)

export interface OverviewOptions {
  start: Date;
  end: Date;
  interval?: 'hour' | 'day';
  prevStart?: Date | null;
  prevEnd?: Date | null;
  filterType?: 'path' | 'referrer' | 'country' | null;
  filterValue?: string | null;
  limit?: number;
}

function overviewError(what: string, message?: string): Error {
  if (message && /Unauthorized/i.test(message)) {
    return new Error('You do not have access to this website.');
  }
  return new Error(message || `Failed to load ${what}.`);
}

export async function getDashboardOverview(
  supabase: SupabaseClient,
  websiteId: string,
  opts: OverviewOptions
): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc('get_dashboard_overview', {
    p_website_id: websiteId,
    p_start: opts.start.toISOString(),
    p_end: opts.end.toISOString(),
    p_interval: opts.interval ?? 'day',
    p_prev_start: opts.prevStart ? opts.prevStart.toISOString() : null,
    p_prev_end: opts.prevEnd ? opts.prevEnd.toISOString() : null,
    p_filter_type: opts.filterType ?? null,
    p_filter_value: opts.filterValue ?? null,
    p_limit: opts.limit ?? 8,
  });

  if (error) throw overviewError('dashboard', error.message);

  const payload = data as DashboardOverview;
  return {
    ...payload,
    devices: payload.devices ?? { browsers: [], os: [], devices: [] },
    timeseries: payload.timeseries ?? [],
    pages: payload.pages ?? [],
    referrers: payload.referrers ?? [],
    countries: payload.countries ?? [],
    events: payload.events ?? [],
    channels: payload.channels ?? [],
    ai_sources: payload.ai_sources ?? [],
  };
}

export async function getPublicDashboardOverview(
  supabase: SupabaseClient,
  shareToken: string,
  opts: Omit<OverviewOptions, 'prevStart' | 'prevEnd' | 'filterType' | 'filterValue'>
): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc('get_public_dashboard_overview', {
    p_share_token: shareToken,
    p_start: opts.start.toISOString(),
    p_end: opts.end.toISOString(),
    p_interval: opts.interval ?? 'day',
    p_limit: opts.limit ?? 8,
  });

  if (error) throw overviewError('public dashboard', error.message);

  const payload = data as DashboardOverview;
  return {
    ...payload,
    devices: payload.devices ?? { browsers: [], os: [], devices: [] },
    timeseries: payload.timeseries ?? [],
    pages: payload.pages ?? [],
    referrers: payload.referrers ?? [],
    countries: payload.countries ?? [],
    events: payload.events ?? [],
    channels: payload.channels ?? [],
    ai_sources: payload.ai_sources ?? [],
  };
}

export async function wipeWebsiteData(
  supabase: SupabaseClient,
  websiteId: string
): Promise<void> {
  const { error } = await supabase.rpc('wipe_website_data', {
    p_website_id: websiteId,
  });
  if (error) throw new Error(error.message);
}

export async function getWebsiteEventStats(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date
): Promise<WebsiteEventStats> {
  const { data, error } = await supabase.rpc('get_website_event_stats', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) throw overviewError('website event stats', error.message);

  return (
    (data as WebsiteEventStats) || {
      events: 0,
      visitors: 0,
      visits: 0,
      unique_events: 0,
    }
  );
}

export async function getRealtimeVisitors(
  supabase: SupabaseClient,
  websiteId: string
): Promise<RealtimeData> {
  const { data, error } = await supabase.rpc('get_realtime_visitors', {
    p_website_id: websiteId,
  });

  if (error) throw overviewError('realtime data', error.message);

  return (
    (data as RealtimeData) || {
      active_visitors: 0,
      active_pages: [],
    }
  );
}

