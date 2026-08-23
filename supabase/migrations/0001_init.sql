-- supabase/migrations/0001_init.sql
-- Analytics by Sufyaan Studio Schema & Security Definer RPCs

create extension if not exists "pgcrypto";

-- Grant schema usage
grant usage on schema public to anon, authenticated, service_role;

-- 1. Tables
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null,
  allowed_domains text[] not null default '{}',
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_public boolean not null default false,
  timezone text not null default 'UTC',
  data_retention_days int not null default 30,
  monthly_event_quota int not null default 25000,
  events_this_month int not null default 0,
  quota_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  visitor_hash text not null,
  hostname text,
  browser text,
  os text,
  device text,
  screen text,
  language text,
  country text,
  entry_path text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  pageview_count int not null default 0,
  event_count int not null default 0,
  total_duration_seconds int not null default 0
);

create table if not exists public.website_events (
  id bigint generated always as identity primary key,
  website_id uuid not null references public.websites(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  url_path text not null,
  url_query text,
  title text,
  referrer_domain text,
  event_name text,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_stats (
  website_id uuid not null references public.websites(id) on delete cascade,
  day date not null,
  pageviews bigint not null default 0,
  unique_visitors bigint not null default 0,
  sessions bigint not null default 0,
  bounces bigint not null default 0,
  total_duration_seconds bigint not null default 0,
  primary key (website_id, day)
);

-- 2. Indexes
create index if not exists idx_websites_user on public.websites (user_id);
create index if not exists idx_sessions_visitor on public.sessions (website_id, visitor_hash, last_seen desc);
create index if not exists idx_sessions_site_seen on public.sessions (website_id, last_seen desc);
create index if not exists idx_sessions_first_seen on public.sessions (website_id, first_seen desc);
create index if not exists idx_events_site_created on public.website_events (website_id, created_at desc);
create index if not exists idx_events_session on public.website_events (session_id);
create index if not exists idx_events_path on public.website_events (website_id, url_path);
create index if not exists idx_events_referrer on public.website_events (website_id, referrer_domain);
create index if not exists idx_events_name on public.website_events (website_id, event_name) where event_name is not null;
create index if not exists idx_sessions_country on public.sessions (website_id, country);

-- 3. Row Level Security
alter table public.websites enable row level security;
alter table public.sessions enable row level security;
alter table public.website_events enable row level security;
alter table public.daily_stats enable row level security;

-- Policies for websites
drop policy if exists websites_owner on public.websites;
create policy websites_owner on public.websites
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for sessions
drop policy if exists sessions_owner_select on public.sessions;
create policy sessions_owner_select on public.sessions
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = sessions.website_id and w.user_id = auth.uid()
  ));

drop policy if exists sessions_owner_delete on public.sessions;
create policy sessions_owner_delete on public.sessions
  for delete to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = sessions.website_id and w.user_id = auth.uid()
  ));

-- Policies for website_events
drop policy if exists events_owner_select on public.website_events;
create policy events_owner_select on public.website_events
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_events.website_id and w.user_id = auth.uid()
  ));

drop policy if exists events_owner_delete on public.website_events;
create policy events_owner_delete on public.website_events
  for delete to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = website_events.website_id and w.user_id = auth.uid()
  ));

-- Policies for daily_stats
drop policy if exists daily_owner_select on public.daily_stats;
create policy daily_owner_select on public.daily_stats
  for select to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = daily_stats.website_id and w.user_id = auth.uid()
  ));

drop policy if exists daily_owner_delete on public.daily_stats;
create policy daily_owner_delete on public.daily_stats
  for delete to authenticated
  using (exists (
    select 1 from public.websites w
    where w.id = daily_stats.website_id and w.user_id = auth.uid()
  ));

-- Table level grants (RLS applies on row level)
grant select, insert, update, delete on public.websites to authenticated;
grant select, delete on public.sessions to authenticated;
grant select, delete on public.website_events to authenticated;
grant select, delete on public.daily_stats to authenticated;

grant all on public.websites to service_role;
grant all on public.sessions to service_role;
grant all on public.website_events to service_role;
grant all on public.daily_stats to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;

-- 4. Ingest RPCs (service_role only)

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
  v_sanitized_data jsonb := null;
begin
  -- 1. Check website & quota
  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;

  if not found then
    return;
  end if;

  -- Reset monthly quota if month has rolled over
  if v_website.quota_month < v_current_month then
    update public.websites
       set events_this_month = 0,
           quota_month = v_current_month
     where id = p_website_id;
    v_website.events_this_month := 0;
  end if;

  -- Check monthly quota cap
  if v_website.events_this_month >= v_website.monthly_event_quota then
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
    -- Best-effort 1s dedupe on duplicate pageview
    if p_event_name is null then
      select id, url_path, created_at
        into v_last_event
        from public.website_events
       where session_id = v_session_id
       order by created_at desc
       limit 1;

      if found and v_last_event.url_path = p_url_path and v_last_event.created_at > now() - interval '1 second' then
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
      if length(p_event_data::text) <= 2048 then
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

  -- 5. Increment website monthly events
  update public.websites
     set events_this_month = events_this_month + 1
   where id = p_website_id;
end;
$$;

create or replace function public.ingest_heartbeat(
  p_website_id uuid,
  p_visitor_hash text,
  p_delta_seconds int
) returns void
language plpgsql
security definer
as $$
begin
  update public.sessions
     set total_duration_seconds = total_duration_seconds + least(greatest(p_delta_seconds, 0), 120),
         last_seen = now()
   where website_id = p_website_id
     and visitor_hash = p_visitor_hash
     and last_seen > now() - interval '30 minutes';
end;
$$;

create or replace function public.run_daily_rollup(
  p_target_date date default (now() at time zone 'utc')::date - 1
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_retention record;
begin
  -- 1. Idempotently roll up daily stats for target_date
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
      count(*) filter (where pageview_count <= 1) as bounce_sess,
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

  -- 2. Retention cleanup: delete raw events older than retention period
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

-- 5. Authenticated User RPCs (auth.uid() = user_id check)

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
  v_hist_bounces bigint := 0;
  v_hist_duration bigint := 0;
  v_today_pvs bigint := 0;
  v_today_uvs bigint := 0;
  v_today_sess bigint := 0;
  v_today_bounces bigint := 0;
  v_today_duration bigint := 0;
  v_total_pvs bigint;
  v_total_uvs bigint;
  v_total_sess bigint;
  v_total_bounces bigint;
  v_total_dur bigint;
  v_bounce_rate numeric := 0;
  v_avg_duration numeric := 0;
begin
  -- Validate ownership
  select user_id, name, domain into v_user_id, v_site_name, v_domain from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- 1. Read historical daily_stats for complete days before today
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

  -- 2. Read live data for today / recent active window if in range
  if p_end >= v_today_start then
    select coalesce(count(*), 0)
      into v_today_pvs
      from public.website_events
     where website_id = p_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and event_name is null;

    select
      coalesce(count(distinct visitor_hash), 0),
      coalesce(count(*), 0),
      coalesce(count(*) filter (where pageview_count <= 1), 0),
      coalesce(sum(total_duration_seconds), 0)
    into v_today_uvs, v_today_sess, v_today_bounces, v_today_duration
    from public.sessions
    where website_id = p_website_id
      and first_seen >= greatest(p_start, v_today_start)
      and first_seen <= p_end;
  end if;

  v_total_pvs := v_hist_pvs + v_today_pvs;
  v_total_uvs := v_hist_uvs + v_today_uvs;
  v_total_sess := v_hist_sess + v_today_sess;
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
    'bounces', v_total_bounces,
    'bounce_rate', v_bounce_rate,
    'total_duration_seconds', v_total_dur,
    'avg_duration_seconds', v_avg_duration
  );
end;
$$;

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
        and ds.day < least(p_end::date, v_today_start::date)
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

create or replace function public.get_top_pages(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  url_path text,
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
    e.url_path,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
  group by e.url_path
  order by pageviews desc
  limit p_limit;
end;
$$;

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
  group by 1
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_top_countries(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  country text,
  visitors bigint,
  sessions bigint
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
    coalesce(s.country, 'Unknown') as country,
    count(distinct s.visitor_hash) as visitors,
    count(*) as sessions
  from public.sessions s
  where s.website_id = p_website_id
    and s.first_seen >= p_start
    and s.first_seen <= p_end
  group by 1
  order by visitors desc
  limit p_limit;
end;
$$;

create or replace function public.get_top_devices(
  p_website_id uuid,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_browsers jsonb;
  v_os jsonb;
  v_devices jsonb;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(b), '[]'::jsonb)
  into v_browsers
  from (
    select coalesce(browser, 'Other') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = p_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) b;

  select coalesce(jsonb_agg(o), '[]'::jsonb)
  into v_os
  from (
    select coalesce(os, 'Other') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = p_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) o;

  select coalesce(jsonb_agg(d), '[]'::jsonb)
  into v_devices
  from (
    select coalesce(device, 'Desktop') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = p_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) d;

  return jsonb_build_object('browsers', v_browsers, 'os', v_os, 'devices', v_devices);
end;
$$;

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
    count(distinct s.visitor_hash) as unique_visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = p_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is not null
  group by e.event_name
  order by total_events desc
  limit p_limit;
end;
$$;

create or replace function public.get_realtime_visitors(
  p_website_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_active_visitors bigint;
  v_active_pages jsonb;
begin
  select user_id into v_user_id from public.websites where id = p_website_id;
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  select count(distinct visitor_hash)
  into v_active_visitors
  from public.sessions
  where website_id = p_website_id
    and last_seen > now() - interval '5 minutes';

  select coalesce(jsonb_agg(p), '[]'::jsonb)
  into v_active_pages
  from (
    select e.url_path, count(*) as count
    from public.website_events e
    where e.website_id = p_website_id
      and e.created_at > now() - interval '5 minutes'
    group by e.url_path
    order by count desc
    limit 5
  ) p;

  return jsonb_build_object(
    'active_visitors', coalesce(v_active_visitors, 0),
    'active_pages', v_active_pages
  );
end;
$$;

-- 6. Public Share RPCs (anon & authenticated)

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
  v_today_bounces bigint := 0;
  v_today_duration bigint := 0;
  v_total_pvs bigint;
  v_total_uvs bigint;
  v_total_sess bigint;
  v_total_bounces bigint;
  v_total_dur bigint;
  v_bounce_rate numeric := 0;
  v_avg_duration numeric := 0;
begin
  select id, name, domain into v_website_id, v_site_name, v_domain
  from public.websites
  where share_token = p_share_token and is_public = true;

  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  select
    coalesce(sum(pageviews), 0),
    coalesce(sum(unique_visitors), 0),
    coalesce(sum(sessions), 0),
    coalesce(sum(bounces), 0),
    coalesce(sum(total_duration_seconds), 0)
  into v_hist_pvs, v_hist_uvs, v_hist_sess, v_hist_bounces, v_hist_duration
  from public.daily_stats
  where website_id = v_website_id
    and day >= p_start::date
    and day < least(p_end::date, v_today_start::date);

  if p_end >= v_today_start then
    select coalesce(count(*), 0)
      into v_today_pvs
      from public.website_events
     where website_id = v_website_id
       and created_at >= greatest(p_start, v_today_start)
       and created_at <= p_end
       and event_name is null;

    select
      coalesce(count(distinct visitor_hash), 0),
      coalesce(count(*), 0),
      coalesce(count(*) filter (where pageview_count <= 1), 0),
      coalesce(sum(total_duration_seconds), 0)
    into v_today_uvs, v_today_sess, v_today_bounces, v_today_duration
    from public.sessions
    where website_id = v_website_id
      and first_seen >= greatest(p_start, v_today_start)
      and first_seen <= p_end;
  end if;

  v_total_pvs := v_hist_pvs + v_today_pvs;
  v_total_uvs := v_hist_uvs + v_today_uvs;
  v_total_sess := v_hist_sess + v_today_sess;
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
    'bounces', v_total_bounces,
    'bounce_rate', v_bounce_rate,
    'total_duration_seconds', v_total_dur,
    'avg_duration_seconds', v_avg_duration
  );
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
        and ds.day < least(p_end::date, v_today_start::date)
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

create or replace function public.get_public_top_pages(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  url_path text,
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
    e.url_path,
    count(*) as pageviews,
    count(distinct s.visitor_hash) as visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = v_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is null
  group by e.url_path
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
  group by 1
  order by pageviews desc
  limit p_limit;
end;
$$;

create or replace function public.get_public_top_countries(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz,
  p_limit int default 10
) returns table (
  country text,
  visitors bigint,
  sessions bigint
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
    coalesce(s.country, 'Unknown') as country,
    count(distinct s.visitor_hash) as visitors,
    count(*) as sessions
  from public.sessions s
  where s.website_id = v_website_id
    and s.first_seen >= p_start
    and s.first_seen <= p_end
  group by 1
  order by visitors desc
  limit p_limit;
end;
$$;

create or replace function public.get_public_top_devices(
  p_share_token text,
  p_start timestamptz,
  p_end timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_website_id uuid;
  v_browsers jsonb;
  v_os jsonb;
  v_devices jsonb;
begin
  select id into v_website_id from public.websites where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  select coalesce(jsonb_agg(b), '[]'::jsonb)
  into v_browsers
  from (
    select coalesce(browser, 'Other') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = v_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) b;

  select coalesce(jsonb_agg(o), '[]'::jsonb)
  into v_os
  from (
    select coalesce(os, 'Other') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = v_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) o;

  select coalesce(jsonb_agg(d), '[]'::jsonb)
  into v_devices
  from (
    select coalesce(device, 'Desktop') as name, count(distinct visitor_hash) as count
    from public.sessions
    where website_id = v_website_id and first_seen >= p_start and first_seen <= p_end
    group by 1 order by count desc limit 10
  ) d;

  return jsonb_build_object('browsers', v_browsers, 'os', v_os, 'devices', v_devices);
end;
$$;

create or replace function public.get_public_top_events(
  p_share_token text,
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
  v_website_id uuid;
begin
  select id into v_website_id from public.websites where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  return query
  select
    e.event_name,
    count(*) as total_events,
    count(distinct s.visitor_hash) as unique_visitors
  from public.website_events e
  join public.sessions s on s.id = e.session_id
  where e.website_id = v_website_id
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_name is not null
  group by e.event_name
  order by total_events desc
  limit p_limit;
end;
$$;

create or replace function public.get_public_realtime_visitors(
  p_share_token text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_website_id uuid;
  v_active_visitors bigint;
  v_active_pages jsonb;
begin
  select id into v_website_id from public.websites where share_token = p_share_token and is_public = true;
  if v_website_id is null then
    raise exception 'Not found or not public';
  end if;

  select count(distinct visitor_hash)
  into v_active_visitors
  from public.sessions
  where website_id = v_website_id
    and last_seen > now() - interval '5 minutes';

  select coalesce(jsonb_agg(p), '[]'::jsonb)
  into v_active_pages
  from (
    select e.url_path, count(*) as count
    from public.website_events e
    where e.website_id = v_website_id
      and e.created_at > now() - interval '5 minutes'
    group by e.url_path
    order by count desc
    limit 5
  ) p;

  return jsonb_build_object(
    'active_visitors', coalesce(v_active_visitors, 0),
    'active_pages', v_active_pages
  );
end;
$$;

-- 7. Security & Grants (Revoke all from public, grant selectively)

revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;

revoke all on function public.ingest_heartbeat(uuid, text, int) from public;
grant execute on function public.ingest_heartbeat(uuid, text, int) to service_role;

revoke all on function public.run_daily_rollup(date) from public;
grant execute on function public.run_daily_rollup(date) to service_role;

revoke all on function public.get_website_stats(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_website_stats(uuid, timestamptz, timestamptz) to authenticated;

revoke all on function public.get_timeseries(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.get_timeseries(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.get_top_pages(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_pages(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_top_referrers(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_referrers(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_top_countries(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_countries(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_top_devices(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_top_devices(uuid, timestamptz, timestamptz) to authenticated;

revoke all on function public.get_top_events(uuid, timestamptz, timestamptz, int) from public;
grant execute on function public.get_top_events(uuid, timestamptz, timestamptz, int) to authenticated;

revoke all on function public.get_realtime_visitors(uuid) from public;
grant execute on function public.get_realtime_visitors(uuid) to authenticated;

-- Public share grants
revoke all on function public.get_public_website_stats(text, timestamptz, timestamptz) from public;
grant execute on function public.get_public_website_stats(text, timestamptz, timestamptz) to anon, authenticated;

revoke all on function public.get_public_timeseries(text, timestamptz, timestamptz, text) from public;
grant execute on function public.get_public_timeseries(text, timestamptz, timestamptz, text) to anon, authenticated;

revoke all on function public.get_public_top_pages(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_pages(text, timestamptz, timestamptz, int) to anon, authenticated;

revoke all on function public.get_public_top_referrers(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_referrers(text, timestamptz, timestamptz, int) to anon, authenticated;

revoke all on function public.get_public_top_countries(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_countries(text, timestamptz, timestamptz, int) to anon, authenticated;

revoke all on function public.get_public_top_devices(text, timestamptz, timestamptz) from public;
grant execute on function public.get_public_top_devices(text, timestamptz, timestamptz) to anon, authenticated;

revoke all on function public.get_public_top_events(text, timestamptz, timestamptz, int) from public;
grant execute on function public.get_public_top_events(text, timestamptz, timestamptz, int) to anon, authenticated;

revoke all on function public.get_public_realtime_visitors(text) from public;
grant execute on function public.get_public_realtime_visitors(text) to anon, authenticated;
