-- ============================================================================
-- 0005_utm_channels.sql
--
-- Umami parity: UTM + click-ID + referrer path/query tracking.
--   1. website_events adds utm_source/medium/campaign/content/term,
--      referrer_path/query, gclid/fbclid/msclkid/ttclid/lifatid/twclid.
--      All free-text, capped in RPC, nullable. Partial indexes for breakdowns.
--   2. ingest_event extended to store them (keeps 0004 hostname fix + 0002
--      hardening). Old callers without new params still work (defaults null).
--   3. private_dashboard_payload extended with `channels` (top utm_source) —
--      single round-trip still powers overview. New standalone RPCs for
--      dedicated drill-down pages.
--   4. Idempotent — IF NOT EXISTS, CREATE OR REPLACE, REVOKE/GRANT.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns + indexes
-- ---------------------------------------------------------------------------
alter table public.website_events add column if not exists utm_source text;
alter table public.website_events add column if not exists utm_medium text;
alter table public.website_events add column if not exists utm_campaign text;
alter table public.website_events add column if not exists utm_content text;
alter table public.website_events add column if not exists utm_term text;
alter table public.website_events add column if not exists referrer_path text;
alter table public.website_events add column if not exists referrer_query text;
alter table public.website_events add column if not exists gclid text;
alter table public.website_events add column if not exists fbclid text;
alter table public.website_events add column if not exists msclkid text;
alter table public.website_events add column if not exists ttclid text;
alter table public.website_events add column if not exists lifatid text;
alter table public.website_events add column if not exists twclid text;

create index if not exists idx_events_utm_source on public.website_events (website_id, utm_source) where utm_source is not null;
create index if not exists idx_events_utm_medium on public.website_events (website_id, utm_medium) where utm_medium is not null;
create index if not exists idx_events_utm_campaign on public.website_events (website_id, utm_campaign) where utm_campaign is not null;
create index if not exists idx_events_referrer_path on public.website_events (website_id, referrer_path) where referrer_path is not null;
create index if not exists idx_events_gclid on public.website_events (website_id, gclid) where gclid is not null;

-- ---------------------------------------------------------------------------
-- 2. ingest_event — now stores UTM / click IDs / referrer path
--    Keeps all 0004 logic (hostname) + 0002 hardening (caps, advisory lock,
--    dedupe, quota). New params default null so old deployments stay compat.
--    Drop old 15-arg overload so only the 28-arg version remains.
-- ---------------------------------------------------------------------------
drop function if exists public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb);

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
  p_twclid text default null
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

  insert into public.website_events (
    website_id, session_id, hostname, url_path, url_query,
    title, referrer_domain, referrer_path, referrer_query,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, msclkid, ttclid, lifatid, twclid,
    event_name, event_data, created_at
  ) values (
    p_website_id, v_session_id, p_hostname, p_url_path, p_url_query,
    p_title, p_referrer_domain, p_referrer_path, p_referrer_query,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_gclid, p_fbclid, p_msclkid, p_ttclid, p_lifatid, p_twclid,
    p_event_name, v_sanitized_data, now()
  );

  update public.websites
     set events_this_month = case when v_month_rolled then 1 else events_this_month + 1 end,
         quota_month = case when v_month_rolled then v_current_month else quota_month end
   where id = p_website_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Channel RPCs — top UTM breakdowns (pageviews only, Umami parity)
-- ---------------------------------------------------------------------------
create or replace function public.get_top_utm_sources(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  utm_source text,
  pageviews bigint,
  visitors bigint
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
    e.utm_source,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
    and e.utm_source is not null
  group by e.utm_source
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_top_utm_mediums(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  utm_medium text,
  pageviews bigint,
  visitors bigint
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
    e.utm_medium,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
    and e.utm_medium is not null
  group by e.utm_medium
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_top_utm_campaigns(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  utm_campaign text,
  pageviews bigint,
  visitors bigint
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
    e.utm_campaign,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
    and e.utm_campaign is not null
  group by e.utm_campaign
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_public_top_utm_sources(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  utm_source text,
  pageviews bigint,
  visitors bigint
)
language plpgsql
security definer
as $$
declare
  v_website_id uuid;
begin
  select id into v_website_id from public.websites where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;
  return query
  select
    e.utm_source,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = v_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
    and e.utm_source is not null
  group by e.utm_source
  order by pageviews desc
  limit p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Extend private_dashboard_payload with channels (top utm_source)
--    Re-create with new column handling + channels aggregation.
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
  v_channels jsonb;
begin
  if btrim(coalesce(p_filter_value, '')) = '' then
    p_filter_type := null;
    p_filter_value := null;
  end if;

  v_filtered := p_filter_type is not null and p_filter_value is not null;

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

  -- NEW: Channels — top utm_source (marketing attribution)
  select coalesce(jsonb_agg(jsonb_build_object(
           'utm_source', b.utm_source, 'pageviews', b.pageviews, 'visitors', b.visitors)),
           '[]'::jsonb)
  into v_channels
  from (
    select e.utm_source,
           count(*) as pageviews,
           count(distinct s.visitor_hash) as visitors
    from public.website_events e
    join public.sessions s on s.id = e.session_id
    where e.website_id = p_website_id
      and e.created_at >= p_start and e.created_at <= p_end
      and e.event_name is null
      and e.utm_source is not null
      and (
           (p_filter_type = 'path'    and e.url_path = p_filter_value)
        or (p_filter_type = 'country' and coalesce(s.country, 'Unknown') = p_filter_value)
        or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
      )
    group by e.utm_source
    order by pageviews desc
    limit p_limit
  ) b;

  return jsonb_build_object(
           'stats', coalesce(v_stats, '{}'::jsonb),
           'prev_stats', v_prev_stats,
           'timeseries', coalesce(v_chart, '[]'::jsonb),
           'pages', coalesce(v_pages, '[]'::jsonb),
           'referrers', coalesce(v_referrers, '[]'::jsonb),
           'countries', coalesce(v_countries, '[]'::jsonb),
           'devices', coalesce(v_devices, '{}'::jsonb),
           'events', coalesce(v_events, '[]'::jsonb),
           'channels', coalesce(v_channels, '[]'::jsonb),
           'filtered_by', case when v_filtered
             then jsonb_build_object('type', p_filter_type, 'value', p_filter_value)
             else null end,
           'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
         );
end;
$$;

-- Grants
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;

revoke all on function public.get_top_utm_sources(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_utm_sources(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_top_utm_mediums(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_utm_mediums(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_top_utm_campaigns(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_utm_campaigns(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_public_top_utm_sources(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_utm_sources(text, timestamptz, timestamptz, int) to anon, authenticated;
