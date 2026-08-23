-- ============================================================================
-- 0004_critical_gaps.sql
--
-- Critical robustness + Umami parity fixes (no feature explosion, $0-safe):
--   1. website_events.hostname (Umami parity — per-event hostname, not just
--      sessions.hostname). Required for multi-domain allowed_domains + domain
--      filter. Adds column + partial index, fixes ingest_event to store it.
--   2. private_dashboard_payload: devices & events were UNFILTERED. When a
--      filter (path / referrer / country) is active, devices now scopes to
--      sessions that actually contain that filter (mirrors countries logic),
--      and events scopes to matching raw rows. Without this the filter chips
--      were cosmetic for two panels.
--   3. Idempotent — create-or-replace + if-not-exists guards.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-event hostname (multi-domain parity)
-- ---------------------------------------------------------------------------
alter table public.website_events
  add column if not exists hostname text;

create index if not exists idx_events_hostname
  on public.website_events (website_id, hostname)
  where hostname is not null;

create index if not exists idx_events_hostname_created
  on public.website_events (website_id, hostname, created_at desc)
  where hostname is not null;

-- ---------------------------------------------------------------------------
-- 2. ingest_event: store hostname + keep all 0002 hardening
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
  p_event_data jsonb default null
) returns void
language plpgsql
security definer
as $$
declare
  v_website record;
  v_session_id uuid;
  v_last_event record;
  v_current_month date := date_trunc('month', now())::date;
  v_month_rolled boolean := false;
  v_sanitized_data jsonb := null;
begin
  -- Defensive caps on free-text fields (client is untrusted)
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

  -- Serialize ingests per (website, visitor): concurrent first-pageviews must
  -- not create duplicate sessions, and repeated beats must not lose counts.
  -- Scoped lock: different visitors never contend.
  perform pg_advisory_xact_lock(
    hashtext(p_website_id::text),
    hashtext(coalesce(p_visitor_hash, ''))
  );

  -- 1. Check website & quota
  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;

  if not found then
    return;
  end if;

  -- Reset monthly quota if month has rolled over. Counter update is merged
  -- into the post-insert increment below so a deduped event never consumes
  -- quota and the row is only written once.
  if v_website.quota_month < v_current_month then
    v_month_rolled := true;
  elsif v_website.events_this_month >= v_website.monthly_event_quota then
    return;
  end if;

  -- 2. Find or create session (30-min idle window)
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
    -- Best-effort 1s dedupe per spec §4.4: only when the LAST event of any
    -- type is itself a same-path pageview (a custom event in between resets
    -- the window — that pageview is legitimate, not a double-send).
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

  -- 3. Sanitize event data (cap 2KB)
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

  -- 4. Insert event (now includes hostname for Umami parity)
  insert into public.website_events (
    website_id, session_id, hostname, url_path, url_query,
    title, referrer_domain, event_name, event_data, created_at
  ) values (
    p_website_id, v_session_id, p_hostname, p_url_path, p_url_query,
    p_title, p_referrer_domain, p_event_name, v_sanitized_data, now()
  );

  -- 5. Increment website monthly events (also handles month rollover reset)
  update public.websites
     set events_this_month = case when v_month_rolled then 1 else events_this_month + 1 end,
         quota_month = case when v_month_rolled then v_current_month else quota_month end
   where id = p_website_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Fixed private_dashboard_payload — devices & events now respect filters
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
as $$
declare
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
  v_filtered boolean;
  v_stats jsonb;
  v_prev_stats jsonb;
  v_chart jsonb;
  v_pages jsonb;
  v_referrers jsonb;
  v_countries jsonb;
  v_devices jsonb;
  v_events jsonb;
begin
  -- Normalize: an empty/whitespace filter value means "no filter" everywhere.
  if btrim(coalesce(p_filter_value, '')) = '' then
    p_filter_type := null;
    p_filter_value := null;
  end if;

  v_filtered := p_filter_type is not null and p_filter_value is not null;

  -- ------------------------------------------------------------------ KPIs --
  if not v_filtered then
    v_stats := private_site_kpis(p_website_id, p_start, p_end);
    if p_prev_start is not null and p_prev_end is not null then
      v_prev_stats := private_site_kpis(p_website_id, p_prev_start, p_prev_end);
    end if;
  else
    with base as (
      select e.event_name, s.visitor_hash, s.id as session_id,
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
        'pageviews', (select count(*) from base where event_name is null),
        'visitors',  (select count(distinct visitor_hash) from base),
        'sessions',  (select count(*) from sess),
        'bounces',   (select count(*) from sess where pageview_count = 1),
        'bounce_rate',
          case when (select count(*) from sess) > 0
            then round((select count(*) from sess where pageview_count = 1)::numeric * 100
                       / (select count(*) from sess)::numeric, 1)
            else 0 end,
        'total_duration_seconds', (select coalesce(sum(total_duration_seconds), 0) from sess),
        'avg_duration_seconds',
          case when (select count(*) from sess) > 0
            then round((select coalesce(sum(total_duration_seconds), 0) from sess)::numeric
                       / (select count(*) from sess)::numeric, 0)
            else 0 end
      )
    into v_stats;
  end if;

  -- -------------------------------------------------------------- Timeseries --
  if not v_filtered and p_interval = 'hour' then
    with series as (
      select generate_series(date_trunc('hour', p_start), date_trunc('hour', p_end),
                             interval '1 hour') as bucket
    ),
    agg as (
      select date_trunc('hour', e.created_at) as bucket,
             count(*) filter (where e.event_name is null) as pageviews,
             count(distinct s.visitor_hash) as visitors
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= p_start and e.created_at <= p_end
      group by 1
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'time_bucket', s.bucket, 'pageviews', coalesce(a.pageviews, 0),
             'visitors', coalesce(a.visitors, 0)) order by s.bucket), '[]'::jsonb)
    into v_chart
    from series s left join agg a on a.bucket = s.bucket;
  elsif not v_filtered then
    -- Day interval: history from daily_stats, live tail from raw rows.
    with series as (
      select generate_series(date_trunc('day', p_start), date_trunc('day', p_end),
                             interval '1 day') as bucket
    ),
    hist as (
      select date_trunc('day', ds.day::timestamptz) as bucket,
             ds.pageviews, ds.unique_visitors as visitors
      from public.daily_stats ds
      where ds.website_id = p_website_id
        and ds.day >= p_start::date
        and ds.day <= least(p_end::date, v_today_start::date - 1)
    ),
    today_raw as (
      select date_trunc('day', e.created_at) as bucket,
             count(*) filter (where e.event_name is null) as pageviews,
             count(distinct s.visitor_hash) as visitors
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= greatest(p_start, v_today_start)
        and e.created_at <= p_end
      group by 1
    ),
    combined as (
      select bucket, sum(pageviews) as pageviews, sum(visitors) as visitors
      from (
        select * from hist
        union all
        select * from today_raw
      ) u
      group by bucket
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'time_bucket', s.bucket, 'pageviews', coalesce(c.pageviews, 0),
             'visitors', coalesce(c.visitors, 0)) order by s.bucket), '[]'::jsonb)
    into v_chart
    from series s left join combined c on c.bucket = s.bucket;
  else
    -- Filtered chart buckets straight off the matched rows.
    if p_interval = 'hour' then
      with series as (
        select generate_series(date_trunc('hour', p_start), date_trunc('hour', p_end), interval '1 hour') as bucket
      ),
      agg as (
        select date_trunc('hour', e.created_at) as bucket,
               count(*) filter (where e.event_name is null) as pageviews,
               count(distinct s.visitor_hash) as visitors
        from public.website_events e
        join public.sessions s on s.id = e.session_id
        where e.website_id = p_website_id
          and e.created_at >= p_start and e.created_at <= p_end
          and (
               (p_filter_type = 'path'     and e.url_path = p_filter_value)
            or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
            or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
          )
        group by 1
      )
      select coalesce(jsonb_agg(jsonb_build_object(
               'time_bucket', s.bucket, 'pageviews', coalesce(a.pageviews, 0),
               'visitors', coalesce(a.visitors, 0)) order by s.bucket), '[]'::jsonb)
      into v_chart
      from series s left join agg a on a.bucket = s.bucket;
    else
      with series as (
        select generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') as bucket
      ),
      agg as (
        select date_trunc('day', e.created_at) as bucket,
               count(*) filter (where e.event_name is null) as pageviews,
               count(distinct s.visitor_hash) as visitors
        from public.website_events e
        join public.sessions s on s.id = e.session_id
        where e.website_id = p_website_id
          and e.created_at >= p_start and e.created_at <= p_end
          and (
               (p_filter_type = 'path'     and e.url_path = p_filter_value)
            or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
            or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
          )
        group by 1
      )
      select coalesce(jsonb_agg(jsonb_build_object(
               'time_bucket', s.bucket, 'pageviews', coalesce(a.pageviews, 0),
               'visitors', coalesce(a.visitors, 0)) order by s.bucket), '[]'::jsonb)
      into v_chart
      from series s left join agg a on a.bucket = s.bucket;
    end if;
  end if;

  -- ------------------------------------------------------------- Breakdowns --
  -- Top pages (pageviews only, consistent with get_top_pages).
  select coalesce(jsonb_agg(jsonb_build_object(
           'url_path', b.url_path, 'pageviews', b.pageviews, 'visitors', b.visitors)),
           '[]'::jsonb)
  into v_pages
  from (
    select e.url_path,
           count(*) as pageviews,
           count(distinct s.visitor_hash) as visitors
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start and e.created_at <= p_end
      and e.event_name is null
      and (
           (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
        or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
        or (p_filter_type is distinct from 'referrer' and p_filter_type is distinct from 'country')
      )
    group by e.url_path
    order by pageviews desc
    limit p_limit
  ) b;

  -- Top referrers (pageviews only; self-referrals already nulled at ingest).
  select coalesce(jsonb_agg(jsonb_build_object(
           'referrer_domain', b.referrer_domain, 'pageviews', b.pageviews, 'visitors', b.visitors)),
           '[]'::jsonb)
  into v_referrers
  from (
    select coalesce(e.referrer_domain, 'Direct / None') as referrer_domain,
           count(*) as pageviews,
           count(distinct s.visitor_hash) as visitors
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start and e.created_at <= p_end
      and e.event_name is null
      and (
           (p_filter_type = 'path'    and e.url_path = p_filter_value)
        or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
        or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
      )
    group by 1
    order by pageviews desc
    limit p_limit
  ) b;

  -- Top countries (session-scoped, consistent with get_top_countries).
  select coalesce(jsonb_agg(jsonb_build_object(
           'country', b.country, 'visitors', b.visitors, 'sessions', b.sessions)),
           '[]'::jsonb)
  into v_countries
  from (
    select coalesce(s.country, 'Unknown') as country,
           count(distinct s.visitor_hash) as visitors,
           count(*) as sessions
    from public.sessions s
    where s.website_id = p_website_id
      and s.first_seen >= p_start and s.first_seen <= p_end
      and (
           (p_filter_type = 'path'
              and exists (select 1 from public.website_events e
                          where e.session_id = s.id and e.event_name is null
                            and e.url_path = p_filter_value))
        or (p_filter_type = 'referrer'
              and exists (select 1 from public.website_events e
                          where e.session_id = s.id and e.event_name is null
                            and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value))
        or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
        or p_filter_type is null
      )
    group by 1
    order by visitors desc
    limit p_limit
  ) b;

  -- Devices (distinct visitors per attribute over sessions in range).
  -- FIX: previously unfiltered — now scopes to the active drill-down just like
  -- countries. Mirrors Umami's FILTER_COLUMNS handling for device breakdowns.
  select jsonb_build_object(
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'count', d.count))
      from (
        select coalesce(s.browser, 'Other') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
          and (
               (p_filter_type = 'path'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and e.url_path = p_filter_value))
            or (p_filter_type = 'referrer'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value))
            or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
            or p_filter_type is null
          )
        group by 1 order by count desc limit 10
      ) d), '[]'::jsonb),
    'os', coalesce((
      select jsonb_agg(jsonb_build_object('name', o.name, 'count', o.count))
      from (
        select coalesce(s.os, 'Other') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
          and (
               (p_filter_type = 'path'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and e.url_path = p_filter_value))
            or (p_filter_type = 'referrer'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value))
            or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
            or p_filter_type is null
          )
        group by 1 order by count desc limit 10
      ) o), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('name', dv.name, 'count', dv.count))
      from (
        select coalesce(s.device, 'Desktop') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
          and (
               (p_filter_type = 'path'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and e.url_path = p_filter_value))
            or (p_filter_type = 'referrer'
                  and exists (select 1 from public.website_events e
                              where e.session_id = s.id and e.event_name is null
                                and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value))
            or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
            or p_filter_type is null
          )
        group by 1 order by count desc limit 10
      ) dv), '[]'::jsonb)
  )
  into v_devices;

  -- Custom events (top N by trigger volume).
  -- FIX: previously always global — now filtered consistently with KPIs.
  select coalesce(jsonb_agg(jsonb_build_object(
           'event_name', ev.event_name, 'total_events', ev.total_events,
           'unique_visitors', ev.unique_visitors)), '[]'::jsonb)
  into v_events
  from (
    select e.event_name,
           count(*) as total_events,
           count(distinct s.visitor_hash) as unique_visitors
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start and e.created_at <= p_end
      and e.event_name is not null
      and (
           (p_filter_type = 'path'    and e.url_path = p_filter_value)
        or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
        or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
        or p_filter_type is null
      )
    group by e.event_name
    order by total_events desc
    limit least(coalesce(p_limit, 6), 20)
  ) ev;

  return jsonb_build_object(
           'stats', coalesce(v_stats, '{}'::jsonb),
           'prev_stats', v_prev_stats,
           'timeseries', coalesce(v_chart, '[]'::jsonb),
           'pages', coalesce(v_pages, '[]'::jsonb),
           'referrers', coalesce(v_referrers, '[]'::jsonb),
           'countries', coalesce(v_countries, '[]'::jsonb),
           'devices', coalesce(v_devices, '{}'::jsonb),
           'events', coalesce(v_events, '[]'::jsonb),
           'filtered_by', case when v_filtered
             then jsonb_build_object('type', p_filter_type, 'value', p_filter_value)
             else null end,
           'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
         );
end;
$$;

-- Grants intact
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;
