-- ===========================================================================
-- 0012_tracking_hardening.sql — Tracking & Count Hardening (Umami Parity)
-- ===========================================================================
-- Fixes:
--   1. ingest_events: per-visitor pg_advisory_xact_lock restored (prevents
--      duplicate sessions on concurrent beacon bursts across Worker isolates).
--   2. ingest_events: heartbeat check moved BEFORE session insert / counter
--      updates. Heartbeats only bump total_duration_seconds and last_seen on
--      existing sessions (within 30m window); they NEVER create phantom
--      sessions and NEVER increment pageview_count.
--   3. ingest_events: per-element quota enforcement (v_quota_left).
--   4. ingest_events: return payload schema includes both new and legacy keys
--      (accepted, deduped, dropped, heartbeats, inserted, skipped, failed).
--   5. get_dashboard_overview & private_dashboard_payload: single-pass breakdown
--      panel filter contracts preserved; ai_sources restored; generated_at
--      returned as ISO 8601 UTC string.
--   6. get_realtime_visitors: counts distinct sessions from events in window
--      UNION sessions active in window (preserves long-page reading presence);
--      generated_at returned as ISO 8601 UTC string.
--   7. get_website_stats: historical daily_stats bounds fixed for past ranges;
--      live today counts pageview events properly.
--   8. SET search_path = public added to all SECURITY DEFINER functions.
--   9. Automated data repair: purges phantom sessions, merges duplicate session
--      rows, recalculates corrupted counters from actual events, and re-runs
--      daily rollup.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. ingest_event (single-event RPC): exact 29-arg signature from 0009/0011
-- ---------------------------------------------------------------------------
create or replace function public.ingest_event(
  p_website_id uuid,
  p_visitor_hash text,
  p_hostname text default null,
  p_browser text default null,
  p_os text default null,
  p_device text default null,
  p_screen text default null,
  p_language text default null,
  p_country text default null,
  p_url_path text default '/',
  p_url_query text default null,
  p_title text default null,
  p_referrer_domain text default null,
  p_event_name text default null,
  p_event_data jsonb default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_referrer_path text default null,
  p_referrer_query text default null,
  p_gclid text default null,
  p_fbclid text default null,
  p_msclkid text default null,
  p_ttclid text default null,
  p_lifatid text default null,
  p_twclid text default null,
  p_referrer_source text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_visit_id uuid;
  v_event_type smallint;
  v_last_event record;
  v_website record;
  v_current_month date := date_trunc('month', now())::date;
  v_month_rolled boolean := false;
  v_sanitized_data jsonb;
begin
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

  p_hostname        := left(p_hostname, 255);
  p_browser         := left(p_browser, 64);
  p_os              := left(p_os, 64);
  p_device          := left(p_device, 32);
  p_screen          := left(p_screen, 32);
  p_language        := left(p_language, 35);
  p_country         := left(p_country, 8);
  p_url_path        := left(coalesce(nullif(p_url_path, ''), '/'), 1024);
  p_url_query       := left(p_url_query, 512);
  p_title           := left(p_title, 512);
  p_referrer_domain := left(p_referrer_domain, 255);
  p_event_name      := nullif(left(p_event_name, 128), '');
  p_utm_source      := left(p_utm_source, 255);
  p_utm_medium      := left(p_utm_medium, 255);
  p_utm_campaign    := left(p_utm_campaign, 255);
  p_utm_content     := left(p_utm_content, 255);
  p_utm_term        := left(p_utm_term, 255);
  p_referrer_path   := left(p_referrer_path, 500);
  p_referrer_query  := left(p_referrer_query, 500);
  p_gclid           := left(p_gclid, 255);
  p_fbclid          := left(p_fbclid, 255);
  p_msclkid         := left(p_msclkid, 255);
  p_ttclid          := left(p_ttclid, 255);
  p_lifatid         := left(p_lifatid, 255);
  p_twclid          := left(p_twclid, 255);
  p_referrer_source := left(nullif(p_referrer_source, ''), 32);
  p_visitor_hash    := left(coalesce(p_visitor_hash, ''), 64);

  if p_visitor_hash = '' then
    return;
  end if;

  v_event_type := case when p_event_name is null then 1 else 2 end;

  v_sanitized_data := null;
  if p_event_data is not null then
    begin
      v_sanitized_data := p_event_data;
      if pg_column_size(v_sanitized_data) > 2048 then
        v_sanitized_data := left(v_sanitized_data::text, 2048)::jsonb;
      end if;
    exception when others then
      v_sanitized_data := null;
    end;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_website_id::text), hashtext(p_visitor_hash));

  select id into v_session_id
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
      case when v_event_type = 1 then 1 else 0 end,
      case when v_event_type = 2 then 1 else 0 end,
      0
    ) returning id into v_session_id;
  else
    if v_event_type = 1 then
      select id, url_path, event_name, event_type, created_at
        into v_last_event
        from public.website_events
       where session_id = v_session_id
       order by created_at desc, id desc
       limit 1;

      if found and v_last_event.event_name is null
                and v_last_event.url_path = p_url_path
                and v_last_event.created_at > now() - interval '1 second' then
        return;
      end if;
    end if;

    if v_event_type = 1 then
      update public.sessions
         set last_seen = now(),
             pageview_count = pageview_count + 1
       where id = v_session_id;
    else
      update public.sessions
         set last_seen = now(),
             event_count = event_count + 1
       where id = v_session_id;
    end if;
  end if;

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

revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from anon;
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. ingest_events (batched RPC): locks, heartbeat ordering, quota, visit_id
-- ---------------------------------------------------------------------------
create or replace function public.ingest_events(
  p_website_id uuid,
  p_events jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website          record;
  v_current_month    date := date_trunc('month', now())::date;
  v_month_rolled     boolean := false;
  v_sorted           jsonb;
  v_total            int;
  v_i                int;
  v_elem             jsonb;
  v_type             text;
  v_vh               text;
  v_event_type       smallint;
  v_session_id       uuid;
  v_session_visitor  text := chr(1); -- sentinel: no visitor locked yet
  v_last_event       record;
  v_accepted         int := 0;
  v_deduped          int := 0;
  v_dropped          int := 0;
  v_beats            int := 0;
  v_quota_left       int;
  v_delta            int;
  v_url_path         text;
  v_event_name       text;
  v_referrer_source  text;
  v_sanitized_data   jsonb;
  v_visit_id         uuid;
begin
  if p_events is null or jsonb_typeof(p_events) is distinct from 'array' then
    return jsonb_build_object(
      'accepted', 0, 'deduped', 0, 'dropped', 0, 'heartbeats', 0,
      'inserted', 0, 'skipped', 0, 'failed', 0, 'reason', 'invalid_payload'
    );
  end if;

  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;
  if not found then
    return jsonb_build_object(
      'accepted', 0, 'deduped', 0, 'dropped', 0, 'heartbeats', 0,
      'inserted', 0, 'skipped', 0, 'failed', 0, 'reason', 'unknown_website'
    );
  end if;

  v_total := jsonb_array_length(p_events);
  if v_total = 0 then
    return jsonb_build_object(
      'accepted', 0, 'deduped', 0, 'dropped', 0, 'heartbeats', 0,
      'inserted', 0, 'skipped', 0, 'failed', 0
    );
  end if;

  if v_total > 50 then
    v_dropped := v_total - 50;
    v_total   := 50;
  end if;

  if v_website.quota_month < v_current_month then
    v_month_rolled := true;
    v_quota_left   := v_website.monthly_event_quota;
  else
    v_quota_left := greatest(v_website.monthly_event_quota - v_website.events_this_month, 0);
  end if;

  select coalesce(jsonb_agg(t.elem order by left(coalesce(t.elem ->> 'p_visitor_hash', ''), 64), t.ord), '[]'::jsonb)
    into v_sorted
    from jsonb_array_elements(p_events) with ordinality as t(elem, ord);

  for v_i in 0 .. (v_total - 1) loop
    v_elem := v_sorted -> v_i;
    if v_elem is null or jsonb_typeof(v_elem) is distinct from 'object' then
      v_dropped := v_dropped + 1;
      continue;
    end if;

    v_vh := left(coalesce(v_elem ->> 'p_visitor_hash', ''), 64);
    if v_vh is null or v_vh = '' then
      v_dropped := v_dropped + 1;
      continue;
    end if;

    begin
      v_type := coalesce(v_elem ->> 'type',
                         case when (v_elem ? 'p_delta_seconds') or (v_elem ->> 'p_event_name' = 'heartbeat')
                              then 'heartbeat'
                              else 'event' end);

      -- Transactional per-visitor advisory lock
      if v_session_visitor is distinct from v_vh then
        perform pg_advisory_xact_lock(hashtext(p_website_id::text), hashtext(v_vh));
        v_session_visitor := v_vh;
        v_session_id      := null;
      end if;

      -- 1. Heartbeats: update existing session ONLY, never insert, never consume quota
      if v_type = 'heartbeat' then
        if v_session_id is null then
          select id into v_session_id
            from public.sessions
           where website_id = p_website_id
             and visitor_hash = v_vh
             and last_seen > now() - interval '30 minutes'
           order by last_seen desc
           limit 1;
        end if;

        if v_session_id is not null then
          v_delta := least(greatest(coalesce((v_elem ->> 'p_delta_seconds')::int, 0), 0), 120);
          update public.sessions
             set total_duration_seconds = total_duration_seconds + v_delta,
                 last_seen = now()
           where id = v_session_id;
          v_beats := v_beats + 1;
        end if;

      -- 2. Pageviews and custom events
      else
        if v_quota_left <= 0 then
          v_dropped := v_dropped + 1;
          continue;
        end if;

        if v_session_id is null then
          select id into v_session_id
            from public.sessions
           where website_id = p_website_id
             and visitor_hash = v_vh
             and last_seen > now() - interval '30 minutes'
           order by last_seen desc
           limit 1;
        end if;

        v_url_path        := left(coalesce(nullif(v_elem ->> 'p_url_path', ''), '/'), 1024);
        v_event_name      := nullif(left(v_elem ->> 'p_event_name', 128), '');
        v_event_type      := case when v_event_name is null then 1 else 2 end;
        v_referrer_source := left(nullif(v_elem ->> 'p_referrer_source', ''), 32);

        if v_session_id is null then
          insert into public.sessions (
            website_id, visitor_hash, distinct_id, hostname, browser, os, device,
            screen, language, country, region, city, entry_path, first_seen, last_seen,
            pageview_count, event_count, total_duration_seconds
          ) values (
            p_website_id, v_vh,
            v_elem ->> 'p_distinct_id',
            left(v_elem ->> 'p_hostname', 255),
            left(v_elem ->> 'p_browser', 64),
            left(v_elem ->> 'p_os', 64),
            left(v_elem ->> 'p_device', 32),
            left(v_elem ->> 'p_screen', 32),
            left(v_elem ->> 'p_language', 35),
            left(v_elem ->> 'p_country', 8),
            left(v_elem ->> 'p_region', 64),
            left(v_elem ->> 'p_city', 64),
            v_url_path, now(), now(),
            case when v_event_type = 1 then 1 else 0 end,
            case when v_event_type = 2 then 1 else 0 end,
            0
          ) returning id into v_session_id;
        else
          -- 1s Dedupe check: only applies to pageviews
          if v_event_type = 1 then
            select id, url_path, event_name, event_type, created_at
              into v_last_event
              from public.website_events
             where session_id = v_session_id
             order by created_at desc, id desc
             limit 1;

            if found and v_last_event.event_name is null
                      and v_last_event.url_path = v_url_path
                      and v_last_event.created_at > now() - interval '1 second' then
              v_deduped := v_deduped + 1;
              continue;
            end if;
          end if;

          if v_event_type = 1 then
            update public.sessions
               set last_seen = now(),
                   pageview_count = pageview_count + 1,
                   distinct_id = coalesce(v_elem ->> 'p_distinct_id', distinct_id),
                   region = coalesce(left(v_elem ->> 'p_region', 64), region),
                   city = coalesce(left(v_elem ->> 'p_city', 64), city)
             where id = v_session_id;
          else
            update public.sessions
               set last_seen = now(),
                   event_count = event_count + 1,
                   distinct_id = coalesce(v_elem ->> 'p_distinct_id', distinct_id),
                   region = coalesce(left(v_elem ->> 'p_region', 64), region),
                   city = coalesce(left(v_elem ->> 'p_city', 64), city)
             where id = v_session_id;
          end if;
        end if;

        v_visit_id := md5(v_session_id::text || ':' || (extract(epoch from now())::bigint / 3600)::text)::uuid;

        v_sanitized_data := null;
        if v_elem -> 'p_event_data' is not null then
          begin
            v_sanitized_data := v_elem -> 'p_event_data';
            if pg_column_size(v_sanitized_data) > 2048 then
              v_sanitized_data := left(v_sanitized_data::text, 2048)::jsonb;
            end if;
          exception when others then
            v_sanitized_data := null;
          end;
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
          left(v_elem ->> 'p_hostname', 255),
          v_url_path,
          left(v_elem ->> 'p_url_query', 512),
          left(v_elem ->> 'p_title', 512),
          left(v_elem ->> 'p_referrer_domain', 255),
          left(v_elem ->> 'p_referrer_path', 500),
          left(v_elem ->> 'p_referrer_query', 500),
          left(v_elem ->> 'p_utm_source', 255),
          left(v_elem ->> 'p_utm_medium', 255),
          left(v_elem ->> 'p_utm_campaign', 255),
          left(v_elem ->> 'p_utm_content', 255),
          left(v_elem ->> 'p_utm_term', 255),
          left(v_elem ->> 'p_gclid', 255),
          left(v_elem ->> 'p_fbclid', 255),
          left(v_elem ->> 'p_msclkid', 255),
          left(v_elem ->> 'p_ttclid', 255),
          left(v_elem ->> 'p_lifatid', 255),
          left(v_elem ->> 'p_twclid', 255),
          v_referrer_source,
          v_event_name,
          v_sanitized_data,
          now()
        );

        v_accepted   := v_accepted + 1;
        v_quota_left := v_quota_left - 1;
      end if;

    exception when others then
      v_dropped := v_dropped + 1;
    end;
  end loop;

  if v_month_rolled then
    update public.websites
       set events_this_month = v_accepted,
           quota_month = v_current_month
     where id = p_website_id;
  elsif v_accepted > 0 then
    update public.websites
       set events_this_month = events_this_month + v_accepted
     where id = p_website_id;
  end if;

  return jsonb_build_object(
    'accepted', v_accepted,
    'deduped', v_deduped,
    'dropped', v_dropped,
    'heartbeats', v_beats,
    'inserted', v_accepted,
    'skipped', v_deduped,
    'failed', v_dropped
  );
end;
$$;

revoke all on function public.ingest_events(uuid, jsonb) from public;
revoke all on function public.ingest_events(uuid, jsonb) from anon;
revoke all on function public.ingest_events(uuid, jsonb) from authenticated;
grant execute on function public.ingest_events(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. get_realtime_visitors — union windowed events & active sessions
-- ---------------------------------------------------------------------------
create or replace function public.get_realtime_visitors(p_website_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_realtime_interval interval := interval '5 minutes';
  v_active_visitors bigint := 0;
  v_urls jsonb;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  with recent_events as (
    select
      e.session_id,
      e.url_path,
      e.created_at
    from public.website_events e
    where e.website_id = p_website_id
      and e.created_at > now() - v_realtime_interval
    order by e.created_at desc
    limit 100
  ),
  active_sessions as (
    select s.id as session_id, s.entry_path as fallback_path
    from public.sessions s
    where s.website_id = p_website_id
      and s.last_seen > now() - v_realtime_interval
  ),
  all_active_sessions as (
    select session_id from recent_events
    union
    select session_id from active_sessions
  ),
  url_buckets as (
    select
      r.url_path,
      count(distinct r.session_id) as active
    from recent_events r
    group by r.url_path
  )
  select
    (select count(*) from all_active_sessions),
    coalesce(
      (select jsonb_agg(jsonb_build_object('url_path', ub.url_path, 'count', ub.active) order by ub.active desc, ub.url_path)
         from (select * from url_buckets order by active desc, url_path limit 5) ub),
      '[]'::jsonb
    )
  into v_active_visitors, v_urls;

  return jsonb_build_object(
    'active_visitors', coalesce(v_active_visitors, 0),
    'active_pages', coalesce(v_urls, '[]'::jsonb),
    'realtime_interval_seconds', extract(epoch from v_realtime_interval)::int,
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

revoke all on function public.get_realtime_visitors(uuid) from public;
grant execute on function public.get_realtime_visitors(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. get_dashboard_overview: preserved breakdown contracts + ISO timestamp
-- ---------------------------------------------------------------------------
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
set search_path = public
as $$
declare
  v_user_id uuid;
  v_website_name text;
  v_domain text;
  v_payload jsonb;
begin
  select user_id, name, domain into v_user_id, v_website_name, v_domain from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  v_payload := private_dashboard_payload(
    p_website_id, p_start, p_end, p_interval,
    p_prev_start, p_prev_end, p_filter_type, p_filter_value, p_limit
  );

  return v_payload;
end;
$$;

revoke all on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
grant execute on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. private_dashboard_payload: single-pass with correct panel filter contracts
-- ---------------------------------------------------------------------------
create or replace function private_dashboard_payload(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_interval text,
  p_prev_start timestamptz,
  p_prev_end timestamptz,
  p_filter_type text,
  p_filter_value text,
  p_limit int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website_name text;
  v_domain text;
  v_filtered boolean;
  v_stats jsonb;
  v_prev_stats jsonb;
  v_chart jsonb;
  v_breakdowns jsonb;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
begin
  select name, domain into v_website_name, v_domain from public.websites where id = p_website_id;

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
    with base as (
      select e.event_name, e.event_type, s.visitor_hash, s.id as session_id,
             s.pageview_count, s.total_duration_seconds
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= p_start
        and e.created_at <= p_end
        and (
             (p_filter_type = 'path'     and e.url_path = p_filter_value)
          or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
          or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
        )
    ),
    sess as (
      select distinct session_id, pageview_count, total_duration_seconds from base
    )
    select
      jsonb_build_object(
        'pageviews', coalesce((select count(*) from base where event_type = 1 or (event_type is null and event_name is null)), 0),
        'visitors', coalesce((select count(distinct visitor_hash) from base), 0),
        'sessions', coalesce((select count(*) from sess), 0),
        'visits', coalesce((select count(*) from sess), 0),
        'bounces', coalesce((select count(*) from sess where pageview_count = 1), 0),
        'bounce_rate', case
          when (select count(*) from sess) > 0
            then round(((select count(*) from sess where pageview_count = 1)::numeric /
                        (select count(*) from sess)::numeric) * 100, 1)
          else 0
        end,
        'total_duration_seconds', coalesce((select sum(total_duration_seconds) from sess), 0),
        'avg_duration_seconds', case
          when (select count(*) from sess) > 0
            then round((select sum(total_duration_seconds) from sess)::numeric /
                       (select count(*) from sess)::numeric, 0)
          else 0
        end,
        'website_name', v_website_name,
        'domain', v_domain
      )
    into v_stats;
    v_prev_stats := null;
  end if;

  -- Chart
  v_chart := (
    with bucketed as (
      select
        date_trunc(p_interval::text, e.created_at) as bucket,
        e.event_type,
        e.event_name,
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
        'pageviews', (select count(*) from bucketed b2 where b2.bucket = b.bucket and (b2.event_type = 1 or (b2.event_type is null and b2.event_name is null))),
        'visitors',  (select count(distinct b2.session_id) from bucketed b2 where b2.bucket = b.bucket and (b2.event_type = 1 or (b2.event_type is null and b2.event_name is null)))
      ) order by bucket
    ), '[]'::jsonb)
    from (select distinct bucket from bucketed) b
  );

  -- Breakdowns with 0005/0007 panel isolation contracts:
  --   ev: all events in window (UNFILTERED)
  --   sess: sessions in window filtered to matching sessions
  with
  ev as (
    select
      e.session_id,
      e.url_path,
      coalesce(e.referrer_domain, 'Direct / None') as referrer_domain,
      e.utm_source,
      e.event_name,
      e.event_type,
      e.referrer_source,
      e.visit_id,
      e.created_at,
      coalesce(s.country, 'Unknown') as country,
      s.browser,
      s.os,
      s.device
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start
      and e.created_at <= p_end
  ),
  sess as (
    select
      s.id,
      s.visitor_hash,
      coalesce(s.country, 'Unknown') as country,
      coalesce(s.browser, 'Other')   as browser,
      coalesce(s.os, 'Other')        as os,
      coalesce(s.device, 'Desktop')  as device
    from public.sessions s
    where s.website_id = p_website_id
      and s.first_seen >= p_start
      and s.first_seen <= p_end
      and (
        p_filter_type is null
        or exists (
          select 1 from public.website_events e
          where e.session_id = s.id
            and (e.event_type = 1 or (e.event_type is null and e.event_name is null))
            and (
                 (p_filter_type = 'path'     and e.url_path = p_filter_value)
              or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
              or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
            )
        )
      )
  )
  select jsonb_build_object(
    'pages',
      (select coalesce(jsonb_agg(jsonb_build_object('url_path', url_path, 'pageviews', pv, 'visitors', uv) order by pv desc),
              '[]'::jsonb)
       from (
         select url_path,
                count(*) filter (where event_type = 1 or (event_type is null and event_name is null)) as pv,
                count(distinct session_id) filter (where event_type = 1 or (event_type is null and event_name is null)) as uv
         from ev
         where (event_type = 1 or (event_type is null and event_name is null))
           and (
                (p_filter_type = 'referrer' and referrer_domain = p_filter_value)
             or (p_filter_type = 'country'  and country = p_filter_value)
             or (p_filter_type is distinct from 'referrer' and p_filter_type is distinct from 'country')
           )
         group by url_path
         order by pv desc
         limit coalesce(p_limit, 8)
       ) p),
    'referrers',
      (select coalesce(jsonb_agg(jsonb_build_object('referrer_domain', domain, 'pageviews', pv, 'visitors', uv) order by pv desc),
              '[]'::jsonb)
       from (
         select referrer_domain as domain,
                count(*) filter (where event_type = 1 or (event_type is null and event_name is null)) as pv,
                count(distinct session_id) filter (where event_type = 1 or (event_type is null and event_name is null)) as uv
         from ev
         where (event_type = 1 or (event_type is null and event_name is null))
           and (
                (p_filter_type = 'path'    and url_path = p_filter_value)
             or (p_filter_type = 'country' and country = p_filter_value)
             or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
           )
         group by referrer_domain
         order by pv desc
         limit coalesce(p_limit, 8)
       ) r),
    'countries',
      (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'visitors', visitors, 'sessions', sessions) order by visitors desc),
              '[]'::jsonb)
       from (
         select country,
                count(distinct session_id) as visitors,
                count(distinct visit_id) as sessions
         from ev
         where (event_type = 1 or (event_type is null and event_name is null))
           and (
                (p_filter_type = 'path'     and url_path = p_filter_value)
             or (p_filter_type = 'referrer' and referrer_domain = p_filter_value)
             or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'referrer')
           )
         group by country
         order by visitors desc
         limit coalesce(p_limit, 8)
       ) c),
    'devices',
      (select jsonb_build_object(
         'browsers',
           (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
            from (select browser as name, count(distinct id) as c from sess group by browser order by c desc limit coalesce(p_limit, 8)) br),
         'os',
           (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
            from (select os as name, count(distinct id) as c from sess group by os order by c desc limit coalesce(p_limit, 8)) osq),
         'devices',
           (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc), '[]'::jsonb)
            from (select device as name, count(distinct id) as c from sess group by device order by c desc limit coalesce(p_limit, 8)) dv)
       )),
    'events',
      (select coalesce(jsonb_agg(jsonb_build_object('event_name', event_name, 'total_events', te, 'unique_visitors', uv) order by te desc),
              '[]'::jsonb)
       from (
         select event_name,
                count(*) as te,
                count(distinct session_id) as uv
         from ev
         where (event_type = 2 or (event_type is null and event_name is not null)) and event_name is not null
           and (
                (p_filter_type = 'path'     and url_path = p_filter_value)
             or (p_filter_type = 'referrer' and referrer_domain = p_filter_value)
             or (p_filter_type = 'country'  and country = p_filter_value)
             or p_filter_type is null
           )
         group by event_name
         order by te desc
         limit coalesce(p_limit, 8)
       ) e),
    'channels',
      (select coalesce(jsonb_agg(jsonb_build_object('utm_source', src, 'pageviews', pv, 'visitors', uv) order by pv desc),
              '[]'::jsonb)
       from (
         select coalesce(nullif(utm_source, ''), 'direct') as src,
                count(*) filter (where event_type = 1 or (event_type is null and event_name is null)) as pv,
                count(distinct session_id) filter (where event_type = 1 or (event_type is null and event_name is null)) as uv
         from ev
         where utm_source is not null
           and (
                (p_filter_type = 'path'    and url_path = p_filter_value)
             or (p_filter_type = 'country' and country = p_filter_value)
             or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
           )
         group by 1
         order by pv desc
         limit coalesce(p_limit, 8)
       ) ch),
    'ai_sources',
      (select coalesce(jsonb_agg(jsonb_build_object('source', src, 'pageviews', pv, 'visitors', uv) order by pv desc),
              '[]'::jsonb)
       from (
         select referrer_source as src,
                count(*) filter (where event_type = 1 or (event_type is null and event_name is null)) as pv,
                count(distinct session_id) filter (where event_type = 1 or (event_type is null and event_name is null)) as uv
         from ev
         where referrer_source is not null
           and (
                (p_filter_type = 'path'    and url_path = p_filter_value)
             or (p_filter_type = 'country' and country = p_filter_value)
             or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
           )
         group by 1
         order by pv desc
         limit coalesce(p_limit, 8)
       ) ai)
  )
  into v_breakdowns;

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
    'ai_sources', coalesce((v_breakdowns->'ai_sources'), '[]'::jsonb),
    'filtered_by', case when v_filtered then jsonb_build_object('type', p_filter_type, 'value', p_filter_value) else null end,
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 6. get_public_dashboard_overview wrapper
-- ---------------------------------------------------------------------------
create or replace function public.get_public_dashboard_overview(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_interval text default 'day',
  p_limit int default 8
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website_id uuid;
begin
  select id into v_website_id
  from public.websites
  where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  return private_dashboard_payload(v_website_id, p_start, p_end, p_interval,
                                   null, null, null, null, p_limit);
end;
$$;

revoke all on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) from public;
grant execute on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. get_website_stats — accurate historical daily_stats + live today
-- ---------------------------------------------------------------------------
create or replace function public.get_website_stats(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_site_name text;
  v_domain text;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
  v_hist_pvs bigint := 0;
  v_hist_uvs bigint := 0;
  v_hist_sess bigint := 0;
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

  -- 1. Historical daily_stats (inclusive of start and end date up to yesterday)
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
    and day < v_today_start::date
    and day <= p_end::date;

  -- 2. Live data for today / recent window
  if p_end >= v_today_start then
    select coalesce(count(*), 0)
      into v_today_pvs
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and (event_type = 1 or (event_type is null and event_name is null));

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

    select coalesce(count(distinct visit_id), 0)
      into v_today_visits
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and (event_type = 1 or (event_type is null and event_name is null))
       and visit_id is not null;
  end if;

  v_total_pvs := v_hist_pvs + v_today_pvs;
  v_total_uvs := v_hist_uvs + v_today_uvs;
  v_total_sess := v_hist_sess + v_today_sess;
  v_total_visits := v_hist_sess + coalesce(nullif(v_today_visits, 0), v_today_sess);
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
-- 8. Data Repair & Healing Routine (Runs idempotently on migration apply)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_master_id uuid;
begin
  -- A. Remove phantom sessions (created by heartbeats; 0 events ever)
  delete from public.sessions s
   where not exists (
     select 1 from public.website_events e where e.session_id = s.id
   );

  -- B. Merge duplicate sessions with identical website_id and visitor_hash
  for r in
    select website_id, visitor_hash, count(*) as cnt
      from public.sessions
     group by website_id, visitor_hash
    having count(*) > 1
  loop
    -- Pick earliest session as master
    select id into v_master_id
      from public.sessions
     where website_id = r.website_id
       and visitor_hash = r.visitor_hash
     order by first_seen asc, id asc
     limit 1;

    if v_master_id is not null then
      -- Re-point all events to master session
      update public.website_events
         set session_id = v_master_id
       where session_id in (
         select id from public.sessions
          where website_id = r.website_id
            and visitor_hash = r.visitor_hash
            and id != v_master_id
       );

      -- Update master session duration, last_seen
      update public.sessions
         set total_duration_seconds = (
           select coalesce(sum(total_duration_seconds), 0)
             from public.sessions
            where website_id = r.website_id
              and visitor_hash = r.visitor_hash
         ),
         last_seen = (
           select coalesce(max(last_seen), now())
             from public.sessions
            where website_id = r.website_id
              and visitor_hash = r.visitor_hash
         )
       where id = v_master_id;

      -- Delete the merged non-master sessions
      delete from public.sessions
       where website_id = r.website_id
         and visitor_hash = r.visitor_hash
         and id != v_master_id;
    end if;
  end loop;

  -- C. Recalculate pageview_count and event_count from actual event rows
  update public.sessions s
     set pageview_count = coalesce(sub.pv_count, 0),
         event_count = coalesce(sub.ev_count, 0)
    from (
      select session_id,
             count(*) filter (where event_type = 1 or (event_type is null and event_name is null)) as pv_count,
             count(*) filter (where event_type = 2 or (event_type is null and event_name is not null)) as ev_count
      from public.website_events
      group by session_id
    ) sub
   where s.id = sub.session_id
     and (s.pageview_count <> coalesce(sub.pv_count, 0) or s.event_count <> coalesce(sub.ev_count, 0));

  -- D. Re-run daily rollup to heal historical aggregates
  perform public.run_daily_rollup();
end;
$$;
