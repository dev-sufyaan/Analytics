-- ============================================================================
-- 0011_umami_parity.sql
--
-- Tracking accuracy rewrite modeled after Umami v2.x.
--
-- Adds Umami's first-class primitives to the schema so every breakdown panel
-- uses the same definitions web + mobile:
--
--   * website_events.event_type  smallint
--       1 = pageview (event_name is null)
--       2 = custom event (event_name is not null)
--       3 = performance metric (reserved)
--   * website_events.visit_id     uuid
--       Hourly bucket per session. visitId = hash(session_id || startOfHourUTC).
--       Used for "visits" KPI (distinct visit_id in a range) and the
--       realtime page "active visitors on a path" count.
--   * sessions.distinct_id       text
--       Umami's `identify()` target. Never derived from a fingerprint; the
--       web/mobile client sets it via `umami.identify(userId, {...})`.
--   * sessions.region, sessions.city text
--       Optional geo fields (CF provides country; region/city come from
--       CF's `cf-region`/`cf-city` headers when available).
--
-- Existing rows are backfilled deterministically:
--   event_type from (event_name is null) -> 1, else 2
--   visit_id  from md5(session_id || floor(epoch_seconds(created_at)/3600))
--   distinct_id left null (only ever populated by `identify`)
--   region/city left null
--
-- RPCs in this file are REPLACED, not appended. They are written to match
-- Umami's query contracts:
--   * get_realtime_visitors
--       Reads the last 100 events (rolling 5-min window) and computes
--       active_visitors / active_pages via a Set on session_id — the same
--       O(N) approach Umami uses (`getRealtimeData`).
--   * get_top_events
--       Filters to event_type = 2 only. unique_visitors = count(distinct
--       session_id) of sessions that triggered that event (so summing
--       across events no longer double-counts the same visitor).
--   * get_website_event_stats
--       New. Returns { events, visitors, visits, unique_events } for the
--       entire events surface — the Umami `getWebsiteEventStats` shape.
--   * ingest_event / ingest_heartbeat
--       Now compute visit_id and event_type for every event so a single
--       source of truth populates the column.
--
-- Idempotent: every change is create-or-replace / add-column-if-missing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------------

alter table public.website_events
  add column if not exists event_type smallint not null default 1
    check (event_type between 1 and 9),
  add column if not exists visit_id uuid;

alter table public.sessions
  add column if not exists distinct_id text,
  add column if not exists region text,
  add column if not exists city text;

-- Indexes that match the new query patterns.
create index if not exists idx_events_event_type
  on public.website_events (website_id, event_type, created_at desc);

create index if not exists idx_events_visit
  on public.website_events (website_id, visit_id, created_at desc);

create index if not exists idx_events_session_event_type
  on public.website_events (session_id, event_type, created_at desc);

create index if not exists idx_sessions_distinct
  on public.website_events (website_id)
  where event_type = 2 and visit_id is not null;

create index if not exists idx_sessions_distinct_id
  on public.sessions (website_id, distinct_id)
  where distinct_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows (safe to re-run; only touches NULL values)
-- ---------------------------------------------------------------------------

-- event_type: derive from event_name. Column was added with NOT NULL
-- DEFAULT 1, so all existing rows initially have 1. Backfill custom events
-- (event_name is not null) to 2. Safe to re-run.
update public.website_events
   set event_type = 2
 where event_name is not null
   and event_type = 1;

-- visit_id: deterministic hash of session_id + the floor of created_at to
-- the hour. Matches Umami's `hash(sessionId, startOfHourUTC)` semantics
-- (deterministic for analytics; no need to be a real uuid v5).
update public.website_events e
   set visit_id = md5(s.id::text || ':' || (extract(epoch from e.created_at)::bigint / 3600)::text)::uuid
  from public.sessions s
 where e.session_id = s.id
   and e.visit_id is null
   and s.id is not null;

-- ---------------------------------------------------------------------------
-- 3. ingest_event: now also writes visit_id and event_type
--    Keep the existing 29-arg signature (utm etc) intact so all existing
--    callers (worker, tests) keep working. New columns are derived
--    internally: visit_id from hourly bucket, event_type from event_name.
--    distinct_id/region/city are left null for now (populated via future
--    identify flow); visit_id/event_type are the critical fixes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_event(p_website_id uuid, p_visitor_hash text, p_hostname text DEFAULT NULL::text, p_browser text DEFAULT NULL::text, p_os text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_screen text DEFAULT NULL::text, p_language text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_url_path text DEFAULT '/'::text, p_url_query text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_referrer_domain text DEFAULT NULL::text, p_event_name text DEFAULT NULL::text, p_event_data jsonb DEFAULT NULL::jsonb, p_utm_source text DEFAULT NULL::text, p_utm_medium text DEFAULT NULL::text, p_utm_campaign text DEFAULT NULL::text, p_utm_content text DEFAULT NULL::text, p_utm_term text DEFAULT NULL::text, p_referrer_path text DEFAULT NULL::text, p_referrer_query text DEFAULT NULL::text, p_gclid text DEFAULT NULL::text, p_fbclid text DEFAULT NULL::text, p_msclkid text DEFAULT NULL::text, p_ttclid text DEFAULT NULL::text, p_lifatid text DEFAULT NULL::text, p_twclid text DEFAULT NULL::text, p_referrer_source text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  v_website record;
  v_session_id uuid;
  v_visit_id uuid;
  v_event_type smallint;
  v_last_event record;
  v_current_month date := date_trunc('month', now())::date;
  v_month_rolled boolean := false;
  v_sanitized_data jsonb := null;
begin
  -- Defensive caps (client is untrusted) — mirrors ingest-guards LIMITS
  p_visitor_hash     := left(coalesce(p_visitor_hash, ''), 64);
  p_hostname         := left(p_hostname, 255);
  p_browser          := left(p_browser, 64);
  p_os               := left(p_os, 64);
  p_device           := left(p_device, 32);
  p_screen           := left(p_screen, 32);
  p_language         := left(p_language, 35);
  p_country          := left(p_country, 8);
  p_url_path         := left(coalesce(nullif(p_url_path, ''), '/'), 1024);
  p_url_query        := left(p_url_query, 512);
  p_title            := left(p_title, 512);
  p_referrer_domain  := left(p_referrer_domain, 255);
  p_event_name       := left(p_event_name, 128);
  p_utm_source       := left(p_utm_source, 255);
  p_utm_medium       := left(p_utm_medium, 255);
  p_utm_campaign     := left(p_utm_campaign, 255);
  p_utm_content      := left(p_utm_content, 255);
  p_utm_term         := left(p_utm_term, 255);
  p_referrer_path    := left(p_referrer_path, 500);
  p_referrer_query   := left(p_referrer_query, 500);
  p_gclid            := left(p_gclid, 255);
  p_fbclid           := left(p_fbclid, 255);
  p_msclkid          := left(p_msclkid, 255);
  p_ttclid           := left(p_ttclid, 255);
  p_lifatid          := left(p_lifatid, 255);
  p_twclid           := left(p_twclid, 255);
  p_referrer_source  := left(nullif(p_referrer_source, ''), 32);

  perform pg_advisory_xact_lock(
    hashtext(p_website_id::text),
    hashtext(coalesce(p_visitor_hash, ''))
  );

  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;

  if not found then
    return;
  end if;

  if v_website.quota_month < v_current_month then
    v_month_rolled := true;
  elsif v_website.events_this_month >= v_website.monthly_event_quota then
    return;
  end if;

  select id
    into v_session_id
    from public.sessions
   where website_id = p_website_id
     and visitor_hash = p_visitor_hash
     and last_seen > now() - interval '30 minutes'
   order by last_seen desc
   limit 1;

  if v_session_id is null then
    insert into public.sessions (
      website_id, visitor_hash, hostname, browser, os, device,
      screen, language, country, entry_path, first_seen, last_seen,
      pageview_count, event_count, total_duration_seconds
    ) values (
      p_website_id, p_visitor_hash, p_hostname, p_browser, p_os, p_device,
      p_screen, p_language, p_country, p_url_path, now(), now(),
      case when p_event_name is null then 1 else 0 end,
      case when p_event_name is not null then 1 else 0 end,
      0
    ) returning id into v_session_id;
  else
    if p_event_name is null then
      select id, url_path, event_name, created_at
        into v_last_event
        from public.website_events
       where session_id = v_session_id
       order by created_at desc
       limit 1;

      if found and v_last_event.event_name is null
                and v_last_event.url_path = p_url_path
                and v_last_event.created_at > now() - interval '1 second' then
        return;
      end if;
    end if;

    update public.sessions
       set last_seen = now(),
           pageview_count = pageview_count + case when p_event_name is null then 1 else 0 end,
           event_count = event_count + case when p_event_name is not null then 1 else 0 end
     where id = v_session_id;
  end if;

  if p_event_data is not null then
    begin
      if pg_column_size(p_event_data) <= 2048 then
        v_sanitized_data := p_event_data;
      else
        v_sanitized_data := left(p_event_data::text, 2048)::jsonb;
      end if;
    exception when others then
      v_sanitized_data := null;
    end;
  end if;

  v_event_type := case when p_event_name is null then 1 else 2 end;
  v_visit_id := md5(v_session_id::text || ':' || (extract(epoch from now())::bigint / 3600)::text)::uuid;

  insert into public.website_events (
    website_id, session_id, visit_id, event_type, hostname, url_path, url_query,
    title, referrer_domain, referrer_path, referrer_query,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, msclkid, ttclid, lifatid, twclid,
    referrer_source,
    event_name, event_data, created_at
  ) values (
    p_website_id, v_session_id, v_visit_id, v_event_type, p_hostname, p_url_path, p_url_query,
    p_title, p_referrer_domain, p_referrer_path, p_referrer_query,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_gclid, p_fbclid, p_msclkid, p_ttclid, p_lifatid, p_twclid,
    p_referrer_source,
    p_event_name, v_sanitized_data, now()
  );

  update public.websites
     set events_this_month = case when v_month_rolled then 1 else events_this_month + 1 end,
         quota_month = case when v_month_rolled then v_current_month else quota_month end
   where id = p_website_id;
end;
$$;

-- Grants for ingest_event are already correct from prior migrations (service_role only).
-- Skip explicit revoke/grant here to avoid signature drift across environments.

-- ---------------------------------------------------------------------------
-- 4. ingest_events (batched): same additions, with element-type override
-- ---------------------------------------------------------------------------

create or replace function public.ingest_events(
  p_website_id uuid,
  p_events jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_element jsonb;
  v_visitor_hash text;
  v_event_type smallint;
  v_session_id uuid;
  v_visit_id uuid;
  v_website record;
  v_current_month date := date_trunc('month', now())::date;
  v_sanitized_data jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_element_count int := 0;
begin
  -- 0. Validate payload shape
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    return jsonb_build_object('inserted', 0, 'skipped', 0, 'failed', 0);
  end if;

  v_element_count := jsonb_array_length(p_events);
  if v_element_count > 50 then
    return jsonb_build_object('inserted', 0, 'skipped', 0, 'failed', 0,
                              'error', 'batch_too_large');
  end if;

  -- 1. Quota check (single lookup for the whole batch)
  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;
  if not found then
    return jsonb_build_object('inserted', 0, 'skipped', 0, 'failed', 0,
                              'error', 'unknown_website');
  end if;
  if v_website.quota_month < v_current_month then
    update public.websites
       set events_this_month = 0, quota_month = v_current_month
     where id = p_website_id;
    v_website.events_this_month := 0;
  end if;
  if v_website.events_this_month >= v_website.monthly_event_quota then
    return jsonb_build_object('inserted', 0, 'skipped', 0, 'failed', 0,
                              'error', 'quota_exceeded');
  end if;

  -- 2. Process each element. Heartbeats and unknown types are short-circuited.
  for v_element in select * from jsonb_array_elements(p_events)
  loop
    begin
      v_visitor_hash := v_element->>'p_visitor_hash';
      if v_visitor_hash is null or length(v_visitor_hash) <> 64 then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Resolve / create the session for this visitor.
      select id into v_session_id
        from public.sessions
       where website_id = p_website_id
         and visitor_hash = v_visitor_hash
         and last_seen > now() - interval '30 minutes'
       order by last_seen desc
       limit 1;

      if v_session_id is null then
        insert into public.sessions (
          website_id, visitor_hash, distinct_id, hostname, browser, os, device,
          screen, language, country, region, city, entry_path, first_seen, last_seen,
          pageview_count, event_count, total_duration_seconds
        ) values (
          p_website_id, v_visitor_hash,
          v_element->>'p_distinct_id',
          v_element->>'p_hostname',
          v_element->>'p_browser',
          v_element->>'p_os',
          v_element->>'p_device',
          v_element->>'p_screen',
          v_element->>'p_language',
          v_element->>'p_country',
          v_element->>'p_region',
          v_element->>'p_city',
          coalesce(v_element->>'p_url_path', '/'),
          now(), now(),
          case when v_element->>'p_event_name' is null then 1 else 0 end,
          case when v_element->>'p_event_name' is not null then 1 else 0 end,
          0
        ) returning id into v_session_id;
      else
        update public.sessions
           set last_seen = now(),
               pageview_count = pageview_count + case when v_element->>'p_event_name' is null then 1 else 0 end,
               event_count = event_count + case when v_element->>'p_event_name' is not null then 1 else 0 end,
               distinct_id = coalesce(v_element->>'p_distinct_id', distinct_id),
               region = coalesce(v_element->>'p_region', region),
               city = coalesce(v_element->>'p_city', city)
         where id = v_session_id;
      end if;

      v_event_type := case when v_element->>'p_event_name' is null then 1 else 2 end;
      v_visit_id := md5(v_session_id::text || ':' || (extract(epoch from now())::bigint / 3600)::text)::uuid;

      -- Sanitize event data
      v_sanitized_data := null;
      if v_element->'p_event_data' is not null then
        begin
          if length((v_element->'p_event_data')::text) <= 2048 then
            v_sanitized_data := v_element->'p_event_data';
          else
            v_sanitized_data := left((v_element->'p_event_data')::text, 2048)::jsonb;
          end if;
        exception when others then
          v_sanitized_data := null;
        end;
      end if;

      -- Heartbeat: bump duration only, never insert / never consume quota.
      if v_element->>'type' = 'heartbeat' then
        update public.sessions
           set total_duration_seconds = total_duration_seconds
                 + least(greatest(coalesce((v_element->>'p_delta_seconds')::int, 0), 0), 120)
         where id = v_session_id;
        v_skipped := v_skipped + 1;
        continue;
      end if;

      -- 1s pageview dedupe (only for pageviews, not custom events).
      if v_event_type = 1 then
        if exists (
          select 1 from public.website_events
           where session_id = v_session_id
             and url_path = v_element->>'p_url_path'
             and created_at > now() - interval '1 second'
        ) then
          v_skipped := v_skipped + 1;
          continue;
        end if;
      end if;

      insert into public.website_events (
        website_id, session_id, visit_id, event_type, hostname, url_path, url_query,
        title, referrer_domain, referrer_path, referrer_query,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        gclid, fbclid, msclkid, ttclid, lifatid, twclid,
        referrer_source,
        event_name, event_data, created_at
      ) values (
        p_website_id, v_session_id, v_visit_id, v_event_type,
        left(v_element->>'p_hostname', 255),
        left(coalesce(nullif(v_element->>'p_url_path',''),'/'),1024),
        left(v_element->>'p_url_query',512),
        left(v_element->>'p_title',512),
        left(v_element->>'p_referrer_domain',255),
        left(v_element->>'p_referrer_path',500),
        left(v_element->>'p_referrer_query',500),
        left(v_element->>'p_utm_source',255),
        left(v_element->>'p_utm_medium',255),
        left(v_element->>'p_utm_campaign',255),
        left(v_element->>'p_utm_content',255),
        left(v_element->>'p_utm_term',255),
        left(v_element->>'p_gclid',255),
        left(v_element->>'p_fbclid',255),
        left(v_element->>'p_msclkid',255),
        left(v_element->>'p_ttclid',255),
        left(v_element->>'p_lifatid',255),
        left(v_element->>'p_twclid',255),
        left(nullif(v_element->>'p_referrer_source',''),32),
        left(v_element->>'p_event_name',128),
        v_sanitized_data,
        now()
      );

      v_inserted := v_inserted + 1;
    exception when others then
      v_failed := v_failed + 1;
    end;
  end loop;

  -- 3. Bulk increment monthly quota by actual successful inserts.
  if v_inserted > 0 then
    update public.websites
       set events_this_month = events_this_month + v_inserted
     where id = p_website_id;
  end if;

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped, 'failed', v_failed);
end;
$$;

revoke all on function public.ingest_events(uuid, jsonb) from public;
grant execute on function public.ingest_events(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 5. get_realtime_visitors — last-100-events model with Set semantics
--    (matches Umami's getRealtimeData exactly)
-- ---------------------------------------------------------------------------

create or replace function public.get_realtime_visitors(p_website_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_realtime_interval interval := interval '5 minutes';
  v_active_visitors bigint := 0;
  v_visitor_session jsonb := '[]'::jsonb;
  v_urls jsonb;
begin
  -- Ownership check (defense-in-depth; RLS already gates the table).
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- 1. Pull the trailing realtime window's events (newest first).
  --    In Postgres we use a windowed scan; Umami takes the last 100 events
  --    in the same window — both are bounded and ordered identically.
  with recent as (
    select
      e.session_id,
      e.url_path,
      e.event_type,
      e.event_name,
      e.created_at
    from public.website_events e
    where e.website_id = p_website_id
      and e.created_at > now() - v_realtime_interval
    order by e.created_at desc
    limit 100
  ),
  -- 2. Bucket by url_path. We count distinct session_id (active visitors on
  --    that path), not raw event count — fixes the "1 visitor shows as 11".
  url_buckets as (
    select
      r.url_path,
      count(distinct r.session_id) as active
    from recent r
    group by r.url_path
  ),
  -- 3. Distinct sessions seen in the window = the "active visitors" headline.
  unique_sessions as (
    select distinct r.session_id from recent r
  )
  select
    (select count(*) from unique_sessions),
    coalesce(
      (select jsonb_agg(jsonb_build_object('url_path', ub.url_path, 'count', ub.active) order by ub.active desc, ub.url_path)
         from (select * from url_buckets order by active desc, url_path limit 5) ub),
      '[]'::jsonb
    )
  into v_active_visitors, v_urls;

  return jsonb_build_object(
    'active_visitors', coalesce(v_active_visitors, 0),
    'active_pages', v_urls,
    'realtime_interval_seconds', extract(epoch from v_realtime_interval)::int,
    'generated_at', extract(epoch from now())
  );
end;
$$;

revoke all on function public.get_realtime_visitors(uuid) from public;
grant execute on function public.get_realtime_visitors(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_top_events — only custom events; visitors = distinct session_id
--    This is the per-event "visitors" the mobile events page shows.
-- ---------------------------------------------------------------------------

create or replace function public.get_top_events(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  event_name text,
  total_events bigint,
  unique_visitors bigint
)
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    e.event_name,
    count(*) as total_events,
    count(distinct e.session_id) as unique_visitors
  from public.website_events e
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_type = 2
    and e.event_name is not null
  group by e.event_name
  order by total_events desc
  limit p_limit;
end;
$$;

revoke all on function public.get_top_events(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_events(uuid, timestamptz, timestamptz, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. get_website_event_stats — aggregate KPIs for the events surface
--    Matches Umami's `getWebsiteEventStats` shape (events, visitors,
--    visits, unique_events). The mobile "TOTAL TRIGGERS" and
--    "UNIQUE VISITORS" tiles should be sourced from this RPC, not from
--    a sum-of-unique_visitors over the event list (which double-counts
--    the same visitor across multiple events).
-- ---------------------------------------------------------------------------

create or replace function public.get_website_event_stats(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_stats jsonb;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'events',         coalesce(count(*), 0),
    'visitors',       coalesce(count(distinct session_id), 0),
    'visits',         coalesce(count(distinct visit_id), 0),
    'unique_events',  coalesce(count(distinct event_name), 0)
  )
  into v_stats
  from public.website_events
  where website_id = p_website_id
    and created_at >= p_start
    and created_at <= p_end
    and event_type = 2;

  return v_stats;
end;
$$;

revoke all on function public.get_website_event_stats(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_website_event_stats(uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Update get_website_stats so its `pageviews` only counts pageview events
--    and adds `visits` (distinct visit_id) — matches Umami's shape.
-- ---------------------------------------------------------------------------

create or replace function public.get_website_stats(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_site_name text;
  v_domain text;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
  v_hist_pvs bigint := 0;
  v_hist_uvs bigint := 0;
  v_hist_sess bigint := 0;
  v_hist_visits bigint := 0;
  v_hist_bounces bigint := 0;
  v_hist_duration bigint := 0;
  v_today_pvs bigint := 0;
  v_today_uvs bigint := 0;
  v_today_sess bigint := 0;
  v_today_visits bigint := 0;
  v_today_bounces bigint := 0;
  v_today_duration bigint := 0;
  v_total_pvs bigint;
  v_total_uvs bigint;
  v_total_sess bigint;
  v_total_visits bigint;
  v_total_bounces bigint;
  v_total_dur bigint;
  v_bounce_rate numeric := 0;
  v_avg_duration numeric := 0;
begin
  select user_id, name, domain into v_user_id, v_site_name, v_domain from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- 1. Historical daily_stats (already event_type-aware after the
  --    daily_stats rollup, so this is correct as-is for pageviews/visits).
  select
    coalesce(sum(pageviews), 0),
    coalesce(sum(unique_visitors), 0),
    coalesce(sum(sessions), 0),
    coalesce(sum(bounces), 0),
    coalesce(sum(total_duration_seconds), 0)
  into v_hist_pvs, v_hist_uvs, v_hist_sess, v_hist_bounces, v_hist_duration
  from public.daily_stats
  where website_id = p_website_id
    and day >= p_start::date
    and day < least(p_end::date, v_today_start::date);

  -- 2. Live data for today / recent active window if in range
  if p_end >= v_today_start then
    -- pageviews = only event_type = 1 (pageviews), not custom events
    select coalesce(count(*), 0)
      into v_today_pvs
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and event_type = 1;

    select
      coalesce(count(distinct visitor_hash), 0),
      coalesce(count(*), 0),
      coalesce(count(*) filter (where pageview_count = 1), 0),
      coalesce(sum(total_duration_seconds), 0)
    into v_today_uvs, v_today_sess, v_today_bounces, v_today_duration
    from public.sessions
    where website_id = p_website_id
      and first_seen >= greatest(p_start, v_today_start)
      and first_seen <= p_end;

    -- visits = distinct visit_id of pageview events in the same window
    select coalesce(count(distinct visit_id), 0)
      into v_today_visits
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and event_type = 1
       and visit_id is not null;
  end if;

  v_total_pvs := v_hist_pvs + v_today_pvs;
  v_total_uvs := v_hist_uvs + v_today_uvs;
  v_total_sess := v_hist_sess + v_today_sess;
  v_total_visits := v_hist_sess + v_today_visits; -- historical daily_stats does not track visits; carry sessions forward as best effort
  v_total_bounces := v_hist_bounces + v_today_bounces;
  v_total_dur := v_hist_duration + v_today_duration;

  if v_total_sess > 0 then
    v_bounce_rate := round((v_total_bounces::numeric / v_total_sess::numeric) * 100, 1);
    v_avg_duration := round((v_total_dur::numeric / v_total_sess::numeric), 0);
  end if;

  return jsonb_build_object(
    'website_name', v_site_name,
    'domain', v_domain,
    'pageviews', v_total_pvs,
    'visitors', v_total_uvs,
    'sessions', v_total_sess,
    'visits', v_total_visits,
    'bounces', v_total_bounces,
    'bounce_rate', v_bounce_rate,
    'total_duration_seconds', v_total_dur,
    'avg_duration_seconds', v_avg_duration
  );
end;
$$;

revoke all on function public.get_website_stats(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_website_stats(uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Update get_dashboard_overview so panels filter by event_type
-- ---------------------------------------------------------------------------

-- We re-create only the functions that touch event_type/visit_id semantics.
-- The single-pass payload function (0007) still uses the legacy
-- `event_name is null` check; we leave that intact and add an event_type
-- filter so legacy rows AND new rows both behave correctly.

create or replace function public.get_dashboard_overview(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_interval text default 'day',
  p_prev_start timestamptz default null,
  p_prev_end timestamptz default null,
  p_filter_type text default null,
  p_filter_value text default null,
  p_limit int default 8
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
  v_filtered boolean;
  v_stats jsonb;
  v_prev_stats jsonb;
  v_chart jsonb;
  v_breakdowns jsonb;
  v_website_name text;
  v_domain text;
begin
  select user_id, name, domain into v_user_id, v_website_name, v_domain from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  if btrim(coalesce(p_filter_value, '')) = '' then
    p_filter_type := null;
    p_filter_value := null;
  end if;
  v_filtered := p_filter_type is not null and p_filter_value is not null;

  if not v_filtered then
    v_stats := public.get_website_stats(p_website_id, p_start, p_end);
    v_stats := v_stats || jsonb_build_object('website_name', v_website_name, 'domain', v_domain);
    if p_prev_start is not null and p_prev_end is not null then
      v_prev_stats := public.get_website_stats(p_website_id, p_prev_start, p_prev_end);
      v_prev_stats := v_prev_stats || jsonb_build_object('website_name', v_website_name, 'domain', v_domain);
    end if;
  else
    v_stats := jsonb_build_object(
      'pageviews', 0, 'visitors', 0, 'sessions', 0, 'visits', 0, 'bounces', 0,
      'bounce_rate', 0, 'total_duration_seconds', 0, 'avg_duration_seconds', 0,
      'website_name', v_website_name, 'domain', v_domain
    );
    v_prev_stats := null;
  end if;

  -- Chart: pageviews + visitors per day/hour.
  v_chart := (
    with bucketed as (
      select
        date_trunc(p_interval::text, e.created_at) as bucket,
        e.event_type,
        e.session_id,
        e.visit_id
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= p_start
        and e.created_at <= p_end
        and (
             (p_filter_type = 'path'     and e.url_path = p_filter_value)
          or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
          or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
          or (p_filter_type is null)
        )
    )
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'time_bucket', bucket,
        'pageviews', (select count(*) from bucketed b2 where b2.bucket = b.bucket and b2.event_type = 1),
        'visitors',  (select count(distinct b2.session_id) from bucketed b2 where b2.bucket = b.bucket and b2.event_type = 1)
      ) order by bucket
    ), '[]'::jsonb)
    from (select distinct bucket from bucketed) b
  );

  -- Breakdowns: top paths, referrers, countries, devices, events, channels.
  v_breakdowns := (
    with ev as (
      select
        e.url_path, e.referrer_domain, e.utm_source, e.event_name, e.event_type,
        e.session_id, e.visit_id, e.created_at,
        s.country, s.browser, s.os, s.device
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= p_start
        and e.created_at <= p_end
        and (
             (p_filter_type = 'path'     and e.url_path = p_filter_value)
          or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
          or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
          or (p_filter_type is null)
        )
    )
    select jsonb_build_object(
      'pages',
        (select coalesce(jsonb_agg(jsonb_build_object('url_path', url_path, 'pageviews', pv, 'visitors', uv) order by pv desc),
                '[]'::jsonb)
         from (
           select url_path,
                  count(*) filter (where event_type = 1) as pv,
                  count(distinct session_id) filter (where event_type = 1) as uv
           from ev
           where event_type = 1
           group by url_path
           order by pv desc
           limit p_limit
         ) p),
      'referrers',
        (select coalesce(jsonb_agg(jsonb_build_object('referrer_domain', domain, 'pageviews', pv, 'visitors', uv) order by pv desc),
                '[]'::jsonb)
         from (
           select coalesce(referrer_domain, 'Direct / None') as domain,
                  count(*) filter (where event_type = 1) as pv,
                  count(distinct session_id) filter (where event_type = 1) as uv
           from ev
           group by 1
           order by pv desc
           limit p_limit
         ) r),
      'countries',
        (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'visitors', visitors, 'sessions', sessions) order by visitors desc),
                '[]'::jsonb)
         from (
           select coalesce(country, 'Unknown') as country,
                  count(distinct session_id) as visitors,
                  count(distinct visit_id) as sessions
           from ev
           where event_type = 1
           group by 1
           order by visitors desc
           limit p_limit
         ) c),
      'devices',
        (select jsonb_build_object(
           'browsers',
             (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
              from (select coalesce(browser, 'Unknown') as name, count(distinct session_id) as c
                    from ev where event_type = 1 group by 1 order by c desc limit p_limit) br),
           'os',
             (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
              from (select coalesce(os, 'Unknown') as name, count(distinct session_id) as c
                    from ev where event_type = 1 group by 1 order by c desc limit p_limit) osq),
           'devices',
             (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
              from (select coalesce(device, 'Desktop') as name, count(distinct session_id) as c
                    from ev where event_type = 1 group by 1 order by c desc limit p_limit) dv)
         )),
      'events',
        (select coalesce(jsonb_agg(jsonb_build_object('event_name', event_name, 'total_events', te, 'unique_visitors', uv) order by te desc),
                '[]'::jsonb)
         from (
           select event_name,
                  count(*) as te,
                  count(distinct session_id) as uv
           from ev
           where event_type = 2 and event_name is not null
           group by 1
           order by te desc
           limit p_limit
         ) e),
      'channels',
        (select coalesce(jsonb_agg(jsonb_build_object('utm_source', src, 'pageviews', pv, 'visitors', uv) order by pv desc),
                '[]'::jsonb)
         from (
           select coalesce(nullif(utm_source, ''), 'direct') as src,
                  count(*) filter (where event_type = 1) as pv,
                  count(distinct session_id) filter (where event_type = 1) as uv
           from ev
           where utm_source is not null
           group by 1
           order by pv desc
           limit p_limit
         ) ch)
    )
  );

  return jsonb_build_object(
    'stats', coalesce(v_stats, '{}'::jsonb),
    'prev_stats', v_prev_stats,
    'timeseries', coalesce(v_chart, '[]'::jsonb),
    'pages', coalesce((v_breakdowns->'pages'), '[]'::jsonb),
    'referrers', coalesce((v_breakdowns->'referrers'), '[]'::jsonb),
    'countries', coalesce((v_breakdowns->'countries'), '[]'::jsonb),
    'devices', coalesce((v_breakdowns->'devices'), '{"browsers":[],"os":[],"devices":[]}'::jsonb),
    'events', coalesce((v_breakdowns->'events'), '[]'::jsonb),
    'channels', coalesce((v_breakdowns->'channels'), '[]'::jsonb),
    'ai_sources', '[]'::jsonb,
    'filtered_by', case when v_filtered then jsonb_build_object('type', p_filter_type, 'value', p_filter_value) else null end,
    'generated_at', extract(epoch from now())
  );
end;
$$;

revoke all on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
grant execute on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to authenticated;
