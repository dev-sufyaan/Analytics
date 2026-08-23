-- ============================================================================
-- 0007_single_pass_payload.sql
--
-- PHASE 4 — Dashboard read-path consolidation.
--
-- private_dashboard_payload previously computed every breakdown panel with its
-- own SELECT ... INTO, so ONE overview request scanned the same
-- website_events ⋈ sessions date-window up to 8-10 times (pages, referrers,
-- countries, devices ×3, events, channels), and drill-down mode repeated the
-- correlated per-session EXISTS for countries AND every device dimension.
--
-- This rewrite computes ALL breakdown panels from TWO materialized relations
-- built in a single statement:
--   ev   : one unfiltered scan of in-window events ⋈ session attrs; each panel
--          applies only its 0005 contract (row-grain panels — pages/referrers/
--          channels — deliberately never restrict by their OWN dimension's
--          filter, keeping drill-down views comparable)
--   sess : one scan of in-window sessions; under a filter the 0005 correlated
--          EXISTS to matching pageviews is evaluated exactly once here and
--          shared by countries + all three device lists
--
-- Output JSON shape is IDENTICAL to 0005 (validated by snapshot equivalence +
-- rpc integration tests). Only internal execution changed. KPI and timeseries
-- blocks are carried over verbatim.
--
-- Deterministic ordering: exact-tie rows now break alphabetically (previously
-- arbitrary plan order) — cosmetic only, and makes responses cache-friendly.
--
-- Idempotent: create-or-replace + grant/revoke re-assertion.
-- ============================================================================

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
  v_breakdowns jsonb;
begin
  -- Normalize: an empty/whitespace filter value means "no filter" everywhere.
  if btrim(coalesce(p_filter_value, '')) = '' then
    p_filter_type := null;
    p_filter_value := null;
  end if;

  v_filtered := p_filter_type is not null and p_filter_value is not null;

  -- ------------------------------------------------------------------ KPIs --
  -- (verbatim semantics from 0005: daily_stats history + live raw window,
  --  or fully raw when a drill-down filter is active)
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
  -- (verbatim from 0005: hour buckets from raw, day history from daily_stats
  --  + live today tail, filtered mode buckets straight off matched rows)
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
  -- SINGLE PASS: one materialized scan of the window feeds every panel.
  --   ev   : all in-window events ⋈ session attrs (UNFILTERED — each panel
  --          applies only its own contract below, preserving 0005 semantics
  --          where a row-grain panel never restricts by its own dimension's
  --          filter, e.g. Top Pages stays comparable inside a /path drill-down)
  --   sess : in-window sessions; under a filter, correlated to matching
  --          PAGEVIEWS on the raw table exactly like 0005's EXISTS (index-
  --          served; evaluated once here instead of four separate times)
  with
  ev as materialized (
    select e.session_id,
           e.event_name,
           e.url_path,
           coalesce(e.referrer_domain, 'Direct / None') as referrer_domain,
           e.utm_source,
           s.visitor_hash,
           coalesce(s.country, 'Unknown') as country
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start
      and e.created_at <= p_end
  ),
  sess as materialized (
    select s.id,
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
            and e.event_name is null
            and (
                 (p_filter_type = 'path'     and e.url_path = p_filter_value)
              or (p_filter_type = 'referrer' and coalesce(e.referrer_domain, 'Direct / None') = p_filter_value)
              or (p_filter_type = 'country'  and coalesce(s.country, 'Unknown') = p_filter_value)
            )
        )
      )
  ),
  pages_b as (
    -- Top pages: path filter never restricts this panel (comparable view),
    -- referrer/country filters do. Same contract as 0005.
    select url_path, count(*) as pageviews, count(distinct visitor_hash) as visitors
    from ev
    where event_name is null
      and (
           (p_filter_type = 'referrer' and referrer_domain = p_filter_value)
        or (p_filter_type = 'country'  and country = p_filter_value)
        or (p_filter_type is distinct from 'referrer' and p_filter_type is distinct from 'country')
      )
    group by url_path
    order by pageviews desc, url_path asc
    limit p_limit
  ),
  ref_b as (
    -- Top referrers: path/country filters apply, referrer filter does not.
    select referrer_domain, count(*) as pageviews, count(distinct visitor_hash) as visitors
    from ev
    where event_name is null
      and (
           (p_filter_type = 'path'    and url_path = p_filter_value)
        or (p_filter_type = 'country' and country = p_filter_value)
        or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
      )
    group by referrer_domain
    order by pageviews desc, referrer_domain asc
    limit p_limit
  ),
  ctry_b as (
    select country, count(distinct visitor_hash) as visitors, count(*) as sessions
    from sess
    group by country
    order by visitors desc, country asc
    limit p_limit
  ),
  browsers_b as (
    select browser as name, count(distinct visitor_hash) as count
    from sess
    group by browser
    order by count desc, name asc
    limit 10
  ),
  os_b as (
    select os as name, count(distinct visitor_hash) as count
    from sess
    group by os
    order by count desc, name asc
    limit 10
  ),
  devices_b as (
    select device as name, count(distinct visitor_hash) as count
    from sess
    group by device
    order by count desc, name asc
    limit 10
  ),
  events_b as (
    select event_name, count(*) as total_events, count(distinct visitor_hash) as unique_visitors
    from ev
    where event_name is not null
      and (
           (p_filter_type = 'path'     and url_path = p_filter_value)
        or (p_filter_type = 'referrer' and referrer_domain = p_filter_value)
        or (p_filter_type = 'country'  and country = p_filter_value)
        or p_filter_type is null
      )
    group by event_name
    order by total_events desc, event_name asc
    limit least(coalesce(p_limit, 6), 20)
  ),
  chan_b as (
    -- Channels: path/country filters apply, referrer filter does not (0005).
    select utm_source, count(*) as pageviews, count(distinct visitor_hash) as visitors
    from ev
    where event_name is null
      and utm_source is not null
      and (
           (p_filter_type = 'path'    and url_path = p_filter_value)
        or (p_filter_type = 'country' and country = p_filter_value)
        or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
      )
    group by utm_source
    order by pageviews desc, utm_source asc
    limit p_limit
  )
  select jsonb_build_object(
           'pages', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'url_path', b.url_path, 'pageviews', b.pageviews, 'visitors', b.visitors))
             from pages_b b), '[]'::jsonb),
           'referrers', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'referrer_domain', b.referrer_domain, 'pageviews', b.pageviews, 'visitors', b.visitors))
             from ref_b b), '[]'::jsonb),
           'countries', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'country', b.country, 'visitors', b.visitors, 'sessions', b.sessions))
             from ctry_b b), '[]'::jsonb),
           'devices', jsonb_build_object(
             'browsers', coalesce((
               select jsonb_agg(jsonb_build_object('name', d.name, 'count', d.count))
               from browsers_b d), '[]'::jsonb),
             'os', coalesce((
               select jsonb_agg(jsonb_build_object('name', o.name, 'count', o.count))
               from os_b o), '[]'::jsonb),
             'devices', coalesce((
               select jsonb_agg(jsonb_build_object('name', dv.name, 'count', dv.count))
               from devices_b dv), '[]'::jsonb)),
           'events', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'event_name', e2.event_name, 'total_events', e2.total_events,
                      'unique_visitors', e2.unique_visitors))
             from events_b e2), '[]'::jsonb),
           'channels', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'utm_source', c.utm_source, 'pageviews', c.pageviews, 'visitors', c.visitors))
             from chan_b c), '[]'::jsonb)
         )
  into v_breakdowns;

  return jsonb_build_object(
           'stats', coalesce(v_stats, '{}'::jsonb),
           'prev_stats', v_prev_stats,
           'timeseries', coalesce(v_chart, '[]'::jsonb),
           'pages', v_breakdowns -> 'pages',
           'referrers', v_breakdowns -> 'referrers',
           'countries', v_breakdowns -> 'countries',
           'devices', v_breakdowns -> 'devices',
           'events', v_breakdowns -> 'events',
           'channels', v_breakdowns -> 'channels',
           'filtered_by', case when v_filtered
             then jsonb_build_object('type', p_filter_type, 'value', p_filter_value)
             else null end,
           'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
         );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants intact (re-asserted after create-or-replace)
-- ---------------------------------------------------------------------------
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

revoke all on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
grant execute on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to authenticated;

revoke all on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) from public;
grant execute on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) to anon, authenticated;
