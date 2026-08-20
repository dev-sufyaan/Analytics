// packages/db/src/queries.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Website,
  WebsiteStats,
  TimeseriesPoint,
  TopPage,
  TopReferrer,
  TopCountry,
  TopDevices,
  TopEvent,
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

export async function getWebsiteStats(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date
): Promise<WebsiteStats> {
  const { data, error } = await supabase.rpc('get_website_stats', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    console.error('Error in get_website_stats:', error);
    return {
      pageviews: 0,
      visitors: 0,
      sessions: 0,
      bounces: 0,
      bounce_rate: 0,
      total_duration_seconds: 0,
      avg_duration_seconds: 0,
    };
  }

  return data as WebsiteStats;
}

export async function getTimeseries(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date,
  interval: 'hour' | 'day' = 'day'
): Promise<TimeseriesPoint[]> {
  const { data, error } = await supabase.rpc('get_timeseries', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_interval: interval,
  });

  if (error) {
    console.error('Error in get_timeseries:', error);
    return [];
  }

  return (data as TimeseriesPoint[]) || [];
}

export async function getTopPages(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopPage[]> {
  const { data, error } = await supabase.rpc('get_top_pages', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    console.error('Error in get_top_pages:', error);
    return [];
  }

  return (data as TopPage[]) || [];
}

export async function getTopReferrers(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopReferrer[]> {
  const { data, error } = await supabase.rpc('get_top_referrers', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    console.error('Error in get_top_referrers:', error);
    return [];
  }

  return (data as TopReferrer[]) || [];
}

export async function getTopCountries(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopCountry[]> {
  const { data, error } = await supabase.rpc('get_top_countries', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    console.error('Error in get_top_countries:', error);
    return [];
  }

  return (data as TopCountry[]) || [];
}

export async function getTopDevices(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date
): Promise<TopDevices> {
  const { data, error } = await supabase.rpc('get_top_devices', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    console.error('Error in get_top_devices:', error);
    return { browsers: [], os: [], devices: [] };
  }

  return (data as TopDevices) || { browsers: [], os: [], devices: [] };
}

export async function getTopEvents(
  supabase: SupabaseClient,
  websiteId: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopEvent[]> {
  const { data, error } = await supabase.rpc('get_top_events', {
    p_website_id: websiteId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    console.error('Error in get_top_events:', error);
    return [];
  }

  return (data as TopEvent[]) || [];
}

export async function getRealtimeVisitors(
  supabase: SupabaseClient,
  websiteId: string
): Promise<RealtimeData> {
  const { data, error } = await supabase.rpc('get_realtime_visitors', {
    p_website_id: websiteId,
  });

  if (error) {
    console.error('Error in get_realtime_visitors:', error);
    return { active_visitors: 0, active_pages: [] };
  }

  return (data as RealtimeData) || { active_visitors: 0, active_pages: [] };
}

// Public Share Queries
export async function getPublicWebsiteStats(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date
): Promise<WebsiteStats | null> {
  const { data, error } = await supabase.rpc('get_public_website_stats', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    console.error('Error in get_public_website_stats:', error);
    return null;
  }

  return data as WebsiteStats;
}

export async function getPublicTimeseries(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date,
  interval: 'hour' | 'day' = 'day'
): Promise<TimeseriesPoint[]> {
  const { data, error } = await supabase.rpc('get_public_timeseries', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_interval: interval,
  });

  if (error) {
    console.error('Error in get_public_timeseries:', error);
    return [];
  }

  return (data as TimeseriesPoint[]) || [];
}

export async function getPublicTopPages(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopPage[]> {
  const { data, error } = await supabase.rpc('get_public_top_pages', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    return [];
  }

  return (data as TopPage[]) || [];
}

export async function getPublicTopReferrers(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopReferrer[]> {
  const { data, error } = await supabase.rpc('get_public_top_referrers', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    return [];
  }

  return (data as TopReferrer[]) || [];
}

export async function getPublicTopCountries(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date,
  limit: number = 10
): Promise<TopCountry[]> {
  const { data, error } = await supabase.rpc('get_public_top_countries', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_limit: limit,
  });

  if (error) {
    return [];
  }

  return (data as TopCountry[]) || [];
}

export async function getPublicTopDevices(
  supabase: SupabaseClient,
  shareToken: string,
  start: Date,
  end: Date
): Promise<TopDevices> {
  const { data, error } = await supabase.rpc('get_public_top_devices', {
    p_share_token: shareToken,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    return { browsers: [], os: [], devices: [] };
  }

  return (data as TopDevices) || { browsers: [], os: [], devices: [] };
}
