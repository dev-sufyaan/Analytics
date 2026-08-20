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
  bounces: number;
  bounce_rate: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  website_name?: string;
  domain?: string;
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

export interface RealtimeData {
  active_visitors: number;
  active_pages: { url_path: string; count: number }[];
}
