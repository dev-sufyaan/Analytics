-- supabase/migrations/0002_hardening.sql
-- Pre-production accuracy + robustness fixes. Idempotent (create or replace).
--
-- 1. ingest_event: 1s dedupe must only collapse duplicate PAGEVIEWS, never a
--    pageview that follows a custom event on the same path.
-- 2. ingest_event: server-side field length caps (16KB body cap is not enough;
--    junk titles/paths/event names were storable verbatim).
-- 3. Bounce semantics per spec: session with pageview_count = 1 exactly
--    (event-only sessions are not bounces). Applied in rollup + stats RPCs.
-- 4. get_website_stats / get_public_website_stats: include the last COMPLETE
--    day from daily_stats when p_end ends before "now" (previously dropped).
-- 5. get_top_referrers / get_public_top_referrers: pageviews metric counts
--    pageviews only (event_name is null), consistent with top pages.

-- ---------------------------------------------------------------------------
-- 1+2. ingest_event
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

  -- 4. Insert event
  insert into public.website_events (
    website_id, session_id, url_path, url_query,
    title, referrer_domain, event_name, event_data, created_at
  ) values (
    p_website_id, v_session_id, p_url_path, p_url_query,
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
-- 3. run_daily_rollup: bounce = sessions with EXACTLY one pageview
-- ---------------------------------------------------------------------------
create or replace function public.run_daily_rollup(
  p_target_date date default (now() at time zone 'utc')::date - 1
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_retention record;
begin
  insert into public.daily_stats (
    website_id, day, pageviews, unique_visitors, sessions, bounces, total_duration_seconds
  )
  select
    w.id as website_id,
    p_target_date as day,
    coalesce(ev.pvs, 0) as pageviews,
    coalesce(sess.uvs, 0) as unique_visitors,
    coalesce(sess.total_sess, 0) as sessions,
    coalesce(sess.bounce_sess, 0) as bounces,
    coalesce(sess.dur, 0) as total_duration_seconds
  from public.websites w
  left join (
    select
      website_id,
      count(*) as pvs
    from public.website_events
    where created_at >= p_target_date::timestamptz
      and created_at < (p_target_date + 1)::timestamptz
      and event_name is null
    group by website_id
  ) ev on ev.website_id = w.id
  left join (
    select
      website_id,
      count(distinct visitor_hash) as uvs,
      count(*) as total_sess,
      count(*) filter (where pageview_count = 1) as bounce_sess,
      sum(total_duration_seconds) as dur
    from public.sessions
    where first_seen >= p_target_date::timestamptz
      and first_seen < (p_target_date + 1)::timestamptz
    group by website_id
  ) sess on sess.website_id = w.id
  on conflict (website_id, day) do update set
    pageviews = excluded.pageviews,
    unique_visitors = excluded.unique_visitors,
    sessions = excluded.sessions,
    bounces = excluded.bounces,
    total_duration_seconds = excluded.total_duration_seconds;

  for v_retention in select id, data_retention_days from public.websites loop
    delete from public.website_events
     where website_id = v_retention.id
       and created_at < (now() - (v_retention.data_retention_days || ' days')::interval);

    delete from public.sessions
     where website_id = v_retention.id
       and last_seen < (now() - (v_retention.data_retention_days || ' days')::interval)
       and not exists (
         select 1 from public.website_events e
         where e.session_id = sessions.id
       );
  end loop;

  return jsonb_build_object('status', 'ok', 'target_date', p_target_date);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Shared KPI computation. Complete past days come from daily_stats; the
--    live window covers everything after the last complete rollup day.
--    Fix: hist upper bound is least(p_end::date, today - 1) INCLUSIVE, so a
--    range ending yesterday 23:59 no longer loses yesterday.
-- ---------------------------------------------------------------------------

-- Helper: KPI jsonb shared by owner + public variants (assumes ownership
-- already verified by caller).
create or replace function private_site_kpis(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_site record;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
  v_hist_pvs bigint := 0;
  v_hist_uvs bigint := 0;
  v_hist_sess bigint := 0;
  v_hist_bounces bigint := 0;
  v_hist_duration bigint := 0;
  v_live_pvs bigint := 0;
  v_live_uvs bigint := 0;
  v_live_sess bigint := 0;
  v_live_bounces bigint := 0;
  v_live_duration bigint := 0;
  v_total_pvs bigint;
  v_total_uvs bigint;
  v_total_sess bigint;
  v_total_bounces bigint;
  v_total_dur bigint;
  v_bounce_rate numeric := 0;
  v_avg_duration numeric := 0;
begin
  select name, domain into v_site from public.websites where id = p_website_id;

  -- Complete UTC days fully covered by [p_start, p_end], excluding today.
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
    and day <= least(p_end::date, v_today_start::date - 1);

  -- Live raw window: anything at/past the last complete day boundary.
  if p_end > greatest(p_start, v_today_start) then
    select coalesce(count(*), 0)
      into v_live_pvs
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and event_name is null;

    select
      coalesce(count(distinct visitor_hash), 0),
      coalesce(count(*), 0),
      coalesce(count(*) filter (where pageview_count = 1), 0),
      coalesce(sum(total_duration_seconds), 0)
    into v_live_uvs, v_live_sess, v_live_bounces, v_live_duration
    from public.sessions
    where website_id = p_website_id
      and first_seen >= greatest(p_start, v_today_start)
      and first_seen <= p_end;
  end if;

  v_total_pvs := v_hist_pvs + v_live_pvs;
  v_total_uvs := v_hist_uvs + v_live_uvs;
  v_total_sess := v_hist_sess + v_live_sess;
  v_total_bounces := v_hist_bounces + v_live_bounces;
  v_total_dur := v_hist_duration + v_live_duration;

  if v_total_sess > 0 then
    v_bounce_rate := round((v_total_bounces::numeric / v_total_sess::numeric) * 100, 1);
    v_avg_duration := round((v_total_dur::numeric / v_total_sess::numeric), 0);
  end if;

  return jsonb_build_object(
    'website_name', v_site.name,
    'domain', v_site.domain,
    'pageviews', v_total_pvs,
    'visitors', v_total_uvs,
    'sessions', v_total_sess,
    'bounces', v_total_bounces,
    'bounce_rate', v_bounce_rate,
    'total_duration_seconds', v_total_dur,
    'avg_duration_seconds', v_avg_duration
  );
end;
$$;

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
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  return private_site_kpis(p_website_id, p_start, p_end);
end;
$$;

create or replace function public.get_public_website_stats(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
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
  return private_site_kpis(v_website_id, p_start, p_end);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Referrers count pageviews only (consistent with Top Pages)
-- ---------------------------------------------------------------------------

create or replace function public.get_top_referrers(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  referrer_domain text,
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
    coalesce(e.referrer_domain, 'Direct / None') as referrer_domain,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
  group by 1
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_public_top_referrers(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  referrer_domain text,
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
    coalesce(e.referrer_domain, 'Direct / None') as referrer_domain,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = v_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
  group by 1
  order by pageviews desc
  limit p_limit;
end;
$$;

-- Re-assert grants after create-or-replace (REVOKE ... FROM PUBLIC is
-- non-negotiable per agent.md §4.3; create or replace resets nothing but we
-- re-run to be explicit and idempotent).
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;

revoke all on function public.run_daily_rollup(date) from public;
grant execute on function public.run_daily_rollup(date) to service_role;

revoke all on function private_site_kpis(uuid, timestamptz, timestamptz) from public;
revoke all on function private_site_kpis(uuid, timestamptz, timestamptz) from anon;
revoke all on function private_site_kpis(uuid, timestamptz, timestamptz) from authenticated;
grant execute on function private_site_kpis(uuid, timestamptz, timestamptz) to service_role;

revoke all on function public.get_website_stats(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_website_stats(uuid, timestamptz, timestamptz) to authenticated;

revoke all on function public.get_public_website_stats(text, timestamptz, timestamptz) from public;
grant execute on function public.get_public_website_stats(text, timestamptz, timestamptz) to anon, authenticated;

revoke all on function public.get_top_referrers(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_referrers(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_public_top_referrers(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_referrers(text, timestamptz, timestamptz, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Timeseries: same complete-day boundary fix as the KPI RPCs (a range
--    ending before "now" must still include the last complete day).
-- ---------------------------------------------------------------------------
create or replace function public.get_timeseries(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_interval text default 'day'
) returns table (
  time_bucket timestamptz,
  pageviews bigint,
  visitors bigint
)
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  if p_interval = 'hour' then
    return query
    with series as (
      select generate_series(
        date_trunc('hour', p_start),
        date_trunc('hour', p_end),
        interval '1 hour'
      ) as bucket
    ),
    agg as (
      select
        date_trunc('hour', e.created_at) as bucket,
        count(*) filter (where e.event_name is null) as pageviews,
        count(distinct s.visitor_hash) as visitors
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = p_website_id
        and e.created_at >= p_start
        and e.created_at <= p_end
      group by 1
    )
    select
      s.bucket as time_bucket,
      coalesce(a.pageviews, 0)::bigint as pageviews,
      coalesce(a.visitors, 0)::bigint as visitors
    from series s
    left join agg a on a.bucket = s.bucket
    order by s.bucket;
  else
    return query
    with series as (
      select generate_series(
        date_trunc('day', p_start),
        date_trunc('day', p_end),
        interval '1 day'
      ) as bucket
    ),
    hist as (
      select
        date_trunc('day', day::timestamptz) as bucket,
        ds.pageviews as pageviews,
        ds.unique_visitors as visitors
      from public.daily_stats ds
      where ds.website_id = p_website_id
        and ds.day >= p_start::date
        and ds.day <= least(p_end::date, v_today_start::date - 1)
    ),
    today_raw as (
      select
        date_trunc('day', e.created_at) as bucket,
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
      select * from hist
      union all
      select * from today_raw
    )
    select
      s.bucket as time_bucket,
      coalesce(c.pageviews, 0)::bigint as pageviews,
      coalesce(c.visitors, 0)::bigint as visitors
    from series s
    left join combined c on c.bucket = s.bucket
    order by s.bucket;
  end if;
end;
$$;

create or replace function public.get_public_timeseries(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_interval text default 'day'
) returns table (
  time_bucket timestamptz,
  pageviews bigint,
  visitors bigint
)
language plpgsql
security definer
as $$
declare
  v_website_id uuid;
  v_today_start timestamptz := (now() at time zone 'utc')::date::timestamptz;
begin
  select id into v_website_id from public.websites where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  if p_interval = 'hour' then
    return query
    with series as (
      select generate_series(
        date_trunc('hour', p_start),
        date_trunc('hour', p_end),
        interval '1 hour'
      ) as bucket
    ),
    agg as (
      select
        date_trunc('hour', e.created_at) as bucket,
        count(*) filter (where e.event_name is null) as pageviews,
        count(distinct s.visitor_hash) as visitors
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = v_website_id
        and e.created_at >= p_start
        and e.created_at <= p_end
      group by 1
    )
    select
      s.bucket as time_bucket,
      coalesce(a.pageviews, 0)::bigint as pageviews,
      coalesce(a.visitors, 0)::bigint as visitors
    from series s
    left join agg a on a.bucket = s.bucket
    order by s.bucket;
  else
    return query
    with series as (
      select generate_series(
        date_trunc('day', p_start),
        date_trunc('day', p_end),
        interval '1 day'
      ) as bucket
    ),
    hist as (
      select
        date_trunc('day', day::timestamptz) as bucket,
        ds.pageviews as pageviews,
        ds.unique_visitors as visitors
      from public.daily_stats ds
      where ds.website_id = v_website_id
        and ds.day >= p_start::date
        and ds.day <= least(p_end::date, v_today_start::date - 1)
    ),
    today_raw as (
      select
        date_trunc('day', e.created_at) as bucket,
        count(*) filter (where e.event_name is null) as pageviews,
        count(distinct s.visitor_hash) as visitors
      from public.website_events e
      join public.sessions s on s.id = e.session_id
      where e.website_id = v_website_id
        and e.created_at >= greatest(p_start, v_today_start)
        and e.created_at <= p_end
      group by 1
    ),
    combined as (
      select * from hist
      union all
      select * from today_raw
    )
    select
      s.bucket as time_bucket,
      coalesce(c.pageviews, 0)::bigint as pageviews,
      coalesce(c.visitors, 0)::bigint as visitors
    from series s
    left join combined c on c.bucket = s.bucket
    order by s.bucket;
  end if;
end;
$$;

revoke all on function public.get_timeseries(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.get_timeseries(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.get_public_timeseries(text, timestamptz, timestamptz, text) from public;
grant execute on function public.get_public_timeseries(text, timestamptz, timestamptz, text) to anon, authenticated;
