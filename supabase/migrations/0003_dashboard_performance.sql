-- ============================================================================
-- 0003_dashboard_performance.sql
--
-- Dashboard performance + UX round-trip consolidation:
--   1. private_dashboard_payload(): computes KPIs (current + previous period),
--      timeseries, and every breakdown in ONE call so the overview dashboard
--      needs a single HTTP request instead of seven parallel RPCs.
--   2. get_dashboard_overview(): owner-gated wrapper (authenticated).
--   3. get_public_dashboard_overview(): share-token wrapper for public
--      dashboards (anon + authenticated), replacing five public RPC calls.
--   4. Drill-down filters ('path' | 'referrer' | 'country'): when active the
--      whole payload is computed from raw rows inside the window, making the
--      previously-cosmetic filter chips fully functional.
--   5. wipe_website_data(): transactional single-call data wipe (replaces
--      three sequential browser-issued PostgREST deletes).
--   6. idx_events_session_created: composite index so the 1s ingest dedupe
--      lookup ("last event of session") is an index scan, not a sort.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Composite index for per-session "latest event" lookups (ingest dedupe)
-- ---------------------------------------------------------------------------
create index if not exists idx_events_session_created
  on public.website_events (session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Shared payload builder. Caller MUST verify ownership/publicity first.
--    Unfiltered: past complete days come from daily_stats via
--    private_site_kpis (cheap); today's live slice scans raw rows once.
--    Filtered:   everything derives from raw events joined to sessions inside
--                [p_start, p_end] — drill-downs are retention-bounded by
--                design, matching the raw-scan breakdown contract.
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
  select jsonb_build_object(
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'count', d.count))
      from (
        select coalesce(s.browser, 'Other') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
        group by 1 order by count desc limit 10
      ) d), '[]'::jsonb),
    'os', coalesce((
      select jsonb_agg(jsonb_build_object('name', o.name, 'count', o.count))
      from (
        select coalesce(s.os, 'Other') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
        group by 1 order by count desc limit 10
      ) o), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('name', dv.name, 'count', dv.count))
      from (
        select coalesce(s.device, 'Desktop') as name, count(distinct s.visitor_hash) as count
        from public.sessions s
        where s.website_id = p_website_id
          and s.first_seen >= p_start and s.first_seen <= p_end
        group by 1 order by count desc limit 10
      ) dv), '[]'::jsonb)
  )
  into v_devices;

  -- Custom events (top N by trigger volume).
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

-- ---------------------------------------------------------------------------
-- 3. Owner-facing combined overview (authenticated only).
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
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  return private_dashboard_payload(p_website_id, p_start, p_end, p_interval,
                                   p_prev_start, p_prev_end,
                                   p_filter_type, p_filter_value, p_limit);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Public share variant: one request powers the entire public dashboard.
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

-- ---------------------------------------------------------------------------
-- 5. Transactional data wipe (single authenticated call replaces three
--    sequential browser deletes that time out at scale).
-- ---------------------------------------------------------------------------
create or replace function public.wipe_website_data(
  p_website_id uuid
) returns void
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

  delete from public.website_events where website_id = p_website_id;
  delete from public.sessions      where website_id = p_website_id;
  delete from public.daily_stats   where website_id = p_website_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants (REVOKE ALL FROM PUBLIC is non-negotiable — agent.md §4.3).
-- ---------------------------------------------------------------------------
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

revoke all on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
grant execute on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to authenticated;

revoke all on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) from public;
grant execute on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) to anon, authenticated;

revoke all on function public.wipe_website_data(uuid) from public;
grant execute on function public.wipe_website_data(uuid) to authenticated;
