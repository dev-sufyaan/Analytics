-- ============================================================================
-- 0008_self_healing_rollup.sql
--
-- PHASE 6a — Reliability: no more permanent zero-days.
--
-- Problem: run_daily_rollup processed exactly ONE date per invocation. If the
-- Cloudflare cron missed a night (deploy, outage, quota), that day never made
-- it into daily_stats — and because KPI/timeseries history reads ONLY
-- daily_stats for complete days, the gap silently showed zeros FOREVER.
--
-- Fix:
--   1. private_rollup_day(p_day): extracted single-day rollup (verbatim
--      semantics from 0002 — bounce = pageview_count = 1, idempotent upsert).
--   2. run_daily_rollup(p_target_date DEFAULT NULL):
--        - explicit date  -> rolls up exactly that day (legacy behavior,
--          used by tests and manual backfills)
--        - NULL (cron {}) -> SELF-HEAL: finds every (website, day) pair
--          missing from daily_stats within a bounded 35-day window ending
--          yesterday and backfills them in order. After one pass every site
--          has rows for all window days, so steady-state nightly runs do
--          exactly one day of work — same cost as before.
--   3. Retention cleanup still runs once per invocation on either path.
--
-- The Worker cron POSTs {} already, so self-heal activates with ZERO deploy
-- changes; the keep-alive GitHub Action additionally calls this RPC so a
-- missed cron heals at least every 3 days.
--
-- SECURITY note: Supabase default privileges auto-grant EXECUTE on new
-- functions to anon/authenticated — both functions explicitly revoke them.
-- Idempotent (create-or-replace).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Single-day rollup helper (verbatim body from 0002)
-- ---------------------------------------------------------------------------
create or replace function private_rollup_day(
  p_target_date date
) returns void
language plpgsql
security definer
as $$
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
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Self-healing entry point
-- ---------------------------------------------------------------------------
create or replace function public.run_daily_rollup(
  p_target_date date default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_end           date := (now() at time zone 'utc')::date - 1; -- yesterday
  v_start         date := v_end - 34;                            -- 35-day heal window (> 30d default retention + buffer)
  v_days          jsonb := '[]'::jsonb;
  v_rec           record;
begin
  if p_target_date is not null then
    -- Legacy contract: roll up exactly this day.
    perform private_rollup_day(p_target_date);
    v_days := jsonb_build_array(p_target_date);
  else
    -- SELF-HEAL: only days missing for at least one site get recomputed.
    -- Steady state (cron healthy) => exactly yesterday. Missed N nights =>
    -- those N days come back on the next call.
    for v_rec in
      select distinct g.d::date as day
      from generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g(d)
      cross join public.websites w
      where not exists (
        select 1 from public.daily_stats ds
        where ds.website_id = w.id
          and ds.day = g.d::date
      )
      order by 1
    loop
      perform private_rollup_day(v_rec.day);
      v_days := v_days || jsonb_build_array(v_rec.day);
    end loop;
  end if;

  -- ------------------------------------------------------------------
  -- Retention cleanup (verbatim semantics from 0002, set-based) —
  -- runs on every invocation.
  -- ------------------------------------------------------------------
  delete from public.website_events e
  using public.websites w
  where e.website_id = w.id
    and e.created_at < (now() - (w.data_retention_days || ' days')::interval);

  delete from public.sessions s
  using public.websites w
  where s.website_id = w.id
    and s.last_seen < (now() - (w.data_retention_days || ' days')::interval)
    and not exists (
      select 1 from public.website_events e
      where e.session_id = s.id
    );

  return jsonb_build_object(
    'status', 'ok',
    'rolled_up', v_days,
    'days_processed', jsonb_array_length(v_days),
    'heal_window', jsonb_build_object('start', case when p_target_date is null then v_start end,
                                       'end',   case when p_target_date is null then v_end end)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Grants — service_role only, anon/authenticated explicitly revoked
-- (Supabase default privileges auto-grant EXECUTE to anon/authenticated on
-- every new function; PUBLIC-only revokes are NOT sufficient)
-- ---------------------------------------------------------------------------
revoke all on function private_rollup_day(date) from public;
revoke all on function private_rollup_day(date) from anon;
revoke all on function private_rollup_day(date) from authenticated;
grant execute on function private_rollup_day(date) to service_role;

revoke all on function public.run_daily_rollup(date) from public;
revoke all on function public.run_daily_rollup(date) from anon;
revoke all on function public.run_daily_rollup(date) from authenticated;
grant execute on function public.run_daily_rollup(date) to service_role;
