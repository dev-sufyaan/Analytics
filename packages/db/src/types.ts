// packages/db/src/types.ts

export interface Website {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  allowed_domains: string[];
  share_token: string;
  is_public: boolean;
  timezone: string;
  data_retention_days: number;
  monthly_event_quota: number;
  events_this_month: number;
  quota_month: string;
  created_at: string;
}

export interface Session {
  id: string;
  website_id: string;
  visitor_hash: string;
  hostname: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  screen: string | null;
  language: string | null;
  country: string | null;
  entry_path: string | null;
  first_seen: string;
  last_seen: string;
  pageview_count: number;
  event_count: number;
  total_duration_seconds: number;
}

export interface WebsiteEvent {
  id: number;
  website_id: string;
  session_id: string;
  url_path: string;
  url_query: string | null;
  title: string | null;
  referrer_domain: string | null;
  referrer_path: string | null;
  referrer_query: string | null;
  hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  msclkid: string | null;
  ttclid: string | null;
  lifatid: string | null;
  twclid: string | null;
  event_name: string | null;
  event_data: Record<string, any> | null;
  created_at: string;
}

export interface DailyStats {
  website_id: string;
  day: string;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounces: number;
  total_duration_seconds: number;
}

export interface WebsiteStats {
  pageviews: number;
  visitors: number;
  sessions: number;
  visits?: number;
  bounces: number;
  bounce_rate: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  website_name?: string;
  domain?: string;
}

export interface WebsiteEventStats {
  events: number;
  visitors: number;
  visits: number;
  unique_events: number;
}

export interface TimeseriesPoint {
  time_bucket: string;
  pageviews: number;
  visitors: number;
}

export interface TopPage {
  url_path: string;
  pageviews: number;
  visitors: number;
}

export interface TopReferrer {
  referrer_domain: string;
  pageviews: number;
  visitors: number;
}

export interface TopCountry {
  country: string;
  visitors: number;
  sessions: number;
}

export interface DeviceCount {
  name: string;
  count: number;
}

export interface TopDevices {
  browsers: DeviceCount[];
  os: DeviceCount[];
  devices: DeviceCount[];
}

export interface TopEvent {
  event_name: string;
  total_events: number;
  unique_visitors: number;
}

export interface TopChannel {
  utm_source: string;
  pageviews: number;
  visitors: number;
}

export interface AiSourceRow {
  source: string;
  pageviews: number;
  visitors: number;
}

export interface TopUtmMedium {
  utm_medium: string;
  pageviews: number;
  visitors: number;
}

export interface TopUtmCampaign {
  utm_campaign: string;
  pageviews: number;
  visitors: number;
}

export interface RealtimeData {
  active_visitors: number;
  active_pages: { url_path: string; count: number }[];
  realtime_interval_seconds?: number;
  generated_at?: string | number;
}

// --- Combined dashboard overview (single-round-trip payload) ---

export type DashboardRange = '24h' | '7d' | '30d' | '90d';

export type DashboardFilterType = 'path' | 'referrer' | 'country';

export interface DashboardFilter {
  type: DashboardFilterType;
  value: string;
}

export interface DashboardOverview {
  stats: WebsiteStats;
  prev_stats: WebsiteStats | null;
  timeseries: TimeseriesPoint[];
  pages: TopPage[];
  referrers: TopReferrer[];
  countries: TopCountry[];
  devices: TopDevices;
  events: TopEvent[];
  channels: TopChannel[];
  ai_sources?: AiSourceRow[];
  filtered_by: DashboardFilter | null;
  generated_at: string;
}
