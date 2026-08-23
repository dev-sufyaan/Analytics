-- ============================================================================
-- 0009_ai_sources.sql
--
-- AI chatbot referrer detection (Core 5): tag referrals from ChatGPT,
-- Perplexity, Gemini, Claude and Copilot as a distinct source category so the
-- dashboard can aggregate "AI traffic" as one segment.
--
--   1. website_events.referrer_source text + partial index.
--   2. ONE-TIME backfill: reclassify historical rows with the same host list
--      as the ingest-side classifier (exact match or dot-boundary subdomain).
--   3. ingest_event: trailing optional p_referrer_source param (29-arg
--      overload replaces the 28-arg one; named-arg REST callers are
--      unaffected, but the param MUST exist because the Worker's legacy
--      fallback path now sends it).
--   4. ingest_events: batch loop stores the capped value.
--   5. private_dashboard_payload: new `ai_sources` breakdown panel aggregated
--      off the existing materialized ev scan (zero extra table passes),
--      filter contract mirroring channels (ignores its own referrer-dimension
--      filter). Public share pages inherit it via the shared payload fn.
--
-- KNOWN LIMITATION (accepted): Google AI Overview clicks arrive as plain
-- www.google.com referrers — indistinguishable from organic search. They are
-- NOT tagged; only the explicit AI hosts below are classified.
--
-- Idempotent: if-not-exists / create-or-replace / grant-reassert.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column + partial index
-- ---------------------------------------------------------------------------
alter table public.website_events add column if not exists referrer_source text;

create index if not exists idx_events_ai_source
  on public.website_events (website_id, created_at desc)
  where referrer_source is not null;

-- Integrity: referrer_source is a closed enum mirroring AI_SOURCES in
-- apps/web/lib/ingest-guards.mjs. Extend BOTH when adding hosts.
alter table public.website_events drop constraint if exists chk_referrer_source;
alter table public.website_events
  add constraint chk_referrer_source
  check (referrer_source is null or referrer_source in
    ('chatgpt', 'perplexity', 'gemini', 'claude', 'copilot'));

-- ---------------------------------------------------------------------------
-- 2. Backfill historical rows (fills NULLs only; safe to re-run)
-- ---------------------------------------------------------------------------
with m(src, hosts) as (
  values
    ('chatgpt'::text,   array['chatgpt.com', 'openai.com']),
    ('perplexity'::text, array['perplexity.ai']),
    ('gemini'::text,     array['gemini.google.com']),
    ('claude'::text,     array['claude.ai']),
    ('copilot'::text,    array['copilot.microsoft.com'])
)
update public.website_events e
   set referrer_source = m.src
  from m
 where e.referrer_source is null
   and e.referrer_domain is not null
   and exists (
     select 1 from unnest(m.hosts) h
      where lower(e.referrer_domain) = h
         or lower(e.referrer_domain) like '%.' || h
   );

-- ---------------------------------------------------------------------------
-- 3. Legacy single-event RPC: append optional p_referrer_source (29-arg).
--    Body identical to 0005 plus the new column; dedupe semantics preserved.
-- ---------------------------------------------------------------------------
drop function if exists public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text);

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

  insert into public.website_events (
    website_id, session_id, hostname, url_path, url_query,
    title, referrer_domain, referrer_path, referrer_query,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, msclkid, ttclid, lifatid, twclid,
    referrer_source,
    event_name, event_data, created_at
  ) values (
    p_website_id, v_session_id, p_hostname, p_url_path, p_url_query,
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

-- ---------------------------------------------------------------------------
-- 4. Batch RPC: store referrer_source per element (body identical to 0006
--    plus the new field).
-- ---------------------------------------------------------------------------
create or replace function public.ingest_events(
  p_website_id uuid,
  p_events jsonb
) returns jsonb
language plpgsql
security definer
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
  v_session_id       uuid;
  v_session_visitor  text := chr(1); -- sentinel: no visitor locked yet
  v_last_event       record;
  v_accepted         int := 0;
  v_deduped          int := 0;
  v_dropped          int := 0;
  v_beats            int := 0;
  v_quota_left       int;
  -- per-element fields
  v_delta            int;
  v_url_path         text;
  v_event_name       text;
  v_referrer_source  text;
  v_sanitized_data   jsonb;
begin
  if p_events is null or jsonb_typeof(p_events) is distinct from 'array' then
    return jsonb_build_object('accepted', 0, 'deduped', 0, 'dropped', 0,
                              'heartbeats', 0, 'reason', 'invalid_payload');
  end if;

  select id, events_this_month, monthly_event_quota, quota_month
    into v_website
    from public.websites
   where id = p_website_id;
  if not found then
    return jsonb_build_object('accepted', 0, 'deduped', 0, 'dropped', 0,
                              'heartbeats', 0, 'reason', 'unknown_website');
  end if;

  v_total := jsonb_array_length(p_events);
  if v_total = 0 then
    return jsonb_build_object('accepted', 0, 'deduped', 0, 'dropped', 0,
                              'heartbeats', 0);
  end if;

  if v_total > 32 then
    v_dropped := v_total - 32;
    v_total   := 32;
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

    begin
      v_type := coalesce(v_elem ->> 'type',
                         case when v_elem ? 'p_delta_seconds' then 'heartbeat' else 'event' end);

      if v_session_visitor is distinct from v_vh then
        perform pg_advisory_xact_lock(hashtext(p_website_id::text), hashtext(v_vh));
        v_session_visitor := v_vh;
        v_session_id      := null;
      end if;

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
          v_delta := least(greatest(coalesce(v_elem ->> 'p_delta_seconds', '')::int, 0), 120);
          update public.sessions
             set total_duration_seconds = total_duration_seconds + v_delta,
                 last_seen = now()
           where id = v_session_id;
          v_beats := v_beats + 1;
        end if;

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
        v_referrer_source := left(nullif(v_elem ->> 'p_referrer_source', ''), 32);

        if v_session_id is null then
          insert into public.sessions (
            website_id, visitor_hash, hostname, browser, os, device,
            screen, language, country, entry_path, first_seen, last_seen,
            pageview_count, event_count, total_duration_seconds
          ) values (
            p_website_id, v_vh,
            left(v_elem ->> 'p_hostname', 255),
            left(v_elem ->> 'p_browser', 64),
            left(v_elem ->> 'p_os', 64),
            left(v_elem ->> 'p_device', 32),
            left(v_elem ->> 'p_screen', 32),
            left(v_elem ->> 'p_language', 35),
            left(v_elem ->> 'p_country', 8),
            v_url_path, now(), now(),
            case when v_event_name is null then 1 else 0 end,
            case when v_event_name is not null then 1 else 0 end,
            0
          ) returning id into v_session_id;
        else
          if v_event_name is null then
            select id, url_path, event_name, created_at
              into v_last_event
              from public.website_events
             where session_id = v_session_id
             order by id desc
             limit 1;

            if found and v_last_event.event_name is null
                      and v_last_event.url_path = v_url_path
                      and v_last_event.created_at > now() - interval '1 second' then
              v_deduped := v_deduped + 1;
              continue;
            end if;
          end if;

          if v_event_name is null then
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
          website_id, session_id, hostname, url_path, url_query,
          title, referrer_domain, referrer_path, referrer_query,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          gclid, fbclid, msclkid, ttclid, lifatid, twclid,
          referrer_source,
          event_name, event_data, created_at
        ) values (
          p_website_id, v_session_id,
          left(v_elem ->> 'p_hostname', 255),
          v_url_path,
          left(v_elem ->> 'p_url_query', 512),
          left(nullif(v_elem ->> 'p_title', ''), 512),
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
          v_event_name, v_sanitized_data, now()
        );

        v_accepted   := v_accepted + 1;
        v_quota_left := v_quota_left - 1;
      end if;

    exception when others then
      v_dropped := v_dropped + 1;
    end;
  end loop;

  if v_accepted > 0 then
    update public.websites
       set events_this_month = case when v_month_rolled then v_accepted
                                    else events_this_month + v_accepted end,
           quota_month = case when v_month_rolled then v_current_month
                              else quota_month end
     where id = p_website_id;
  end if;

  return jsonb_build_object('accepted', v_accepted, 'deduped', v_deduped,
                            'dropped', v_dropped, 'heartbeats', v_beats);
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Dashboard payload: expose the ai_sources panel (body identical to 0007
--    plus the ai_b aggregate and output key).
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
           e.referrer_source,
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
  ai_b as (
    -- AI traffic panel: referrals tagged by the ingest-side classifier
    -- (chatgpt / perplexity / gemini / claude / copilot). Filter contract
    -- mirrors channels: path/country drills apply, the referrer-dimension
    -- drill-down does not restrict this panel.
    select referrer_source,
           count(*) as pageviews,
           count(distinct visitor_hash) as visitors
    from ev
    where referrer_source is not null
      and (
           (p_filter_type = 'path'    and url_path = p_filter_value)
        or (p_filter_type = 'country' and country = p_filter_value)
        or (p_filter_type is distinct from 'path' and p_filter_type is distinct from 'country')
      )
    group by referrer_source
    order by pageviews desc, referrer_source asc
    limit least(coalesce(p_limit, 8), 20)
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
             from chan_b c), '[]'::jsonb),
           'ai_sources', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'source', b.referrer_source, 'pageviews', b.pageviews, 'visitors', b.visitors))
             from ai_b b), '[]'::jsonb)
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
           'ai_sources', coalesce(v_breakdowns -> 'ai_sources', '[]'::jsonb),
           'filtered_by', case when v_filtered
             then jsonb_build_object('type', p_filter_type, 'value', p_filter_value)
             else null end,
           'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
         );
end;
$$;
-- ---------------------------------------------------------------------------
-- 6. Grants — service_role / authenticated / anon per surface, anon and
--    authenticated explicitly revoked on ingest internals (Supabase default
--    privileges auto-grant EXECUTE to them on every NEW function).
-- ---------------------------------------------------------------------------
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from anon;
revoke all on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.ingest_event(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;

revoke all on function public.ingest_events(uuid, jsonb) from public;
revoke all on function public.ingest_events(uuid, jsonb) from anon;
revoke all on function public.ingest_events(uuid, jsonb) from authenticated;
grant execute on function public.ingest_events(uuid, jsonb) to service_role;

revoke all on function private_rollup_day(date) from public;
grant execute on function private_rollup_day(date) to service_role;

revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from anon;
revoke all on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from authenticated;
grant execute on function private_dashboard_payload(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to service_role;

revoke all on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) from public;
grant execute on function public.get_dashboard_overview(uuid, timestamptz, timestamptz, text, timestamptz, timestamptz, text, text, int) to authenticated;

revoke all on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) from public;
grant execute on function public.get_public_dashboard_overview(text, timestamptz, timestamptz, text, int) to anon, authenticated;
