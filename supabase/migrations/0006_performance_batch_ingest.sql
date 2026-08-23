-- ============================================================================
-- 0006_performance_batch_ingest.sql
--
-- Free-tier performance round: fewer REST requests, fewer writes per event,
-- less index tax on the hot table. Idempotent (drop-if-exists, if-not-exists,
-- create-or-replace). Safe to re-run via scripts/migrate.mjs.
--
-- PHASE 1 — Index cleanup + table tuning:
--   1. Drop indexes that are provably redundant or unused (verified live via
--      pg_stat_user_indexes idx_scan = 0 on 2026-08-23):
--        - idx_events_session        : fully covered by the leading column of
--                                      idx_events_session_created(session_id,
--                                      created_at desc) — planner switches
--                                      automatically.
--        - idx_events_hostname       : covered by idx_events_hostname_created
--                                      (website_id, hostname, created_at desc).
--        - idx_events_gclid          : zero queries filter by click ids.
--        - idx_events_utm_medium     : zero scans; no consuming UI yet.
--        - idx_events_utm_campaign   : zero scans; no consuming UI yet.
--        - idx_events_referrer_path  : zero scans; no consuming UI yet.
--      Every dropped index makes each event INSERT cheaper and frees 500 MB
--      budget. Rollback: recreate statements listed at the bottom.
--   2. sessions fillfactor 80: the session row is UPDATEd on every pageview,
--      custom event and heartbeat. Slack space enables HOT updates (no index
--      churn) and fewer page splits on the hottest table after events.
--
-- PHASE 2 — Batch ingest RPC `ingest_events`:
--   One PostgREST round trip per beacon (<=10 events client-side, hard cap 32
--   server-side) instead of one request PER event. Semantics are identical to
--   N sequential ingest_event / ingest_heartbeat calls:
--     - website lookup + quota check hoisted once per batch
--     - advisory lock acquired once per distinct visitor, in ASCENDING visitor
--       hash order (deterministic global lock ordering => deadlock-free even
--       when concurrent batches interleave visitors)
--     - session resolved/created once per visitor and reused across their
--       events in the batch (all events arrive within the same instant)
--     - per-pageview 1s same-path dedupe preserved; dedupe sees rows inserted
--       earlier in the SAME batch (own-transaction reads), so array order
--       matters and is preserved within a visitor group
--     - quota enforced DURING the loop (partial acceptance when quota runs
--       out mid-batch, exactly like sequential legacy calls)
--     - heartbeats never consume quota and never create sessions (legacy)
--     - ONE counter UPDATE per batch (+accepted), killing the per-event
--       websites-row write contention under bursts; month rollover reset is
--       merged into that single statement and only fires when accepted > 0
--     - all field caps from 0002/0005 replicated verbatim
--     - junk elements drop ONLY themselves (per-element exception guard),
--       never the whole batch
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PHASE 1.1 — Redundant / unused index drops
-- ---------------------------------------------------------------------------
drop index if exists public.idx_events_session;
drop index if exists public.idx_events_hostname;
drop index if exists public.idx_events_gclid;
drop index if exists public.idx_events_utm_medium;
drop index if exists public.idx_events_utm_campaign;
drop index if exists public.idx_events_referrer_path;

-- ---------------------------------------------------------------------------
-- PHASE 1.2 — HOT-friendly fillfactor for the update-heavy sessions table
-- ---------------------------------------------------------------------------
alter table public.sessions set (fillfactor = 80);

-- ---------------------------------------------------------------------------
-- PHASE 2 — Batch ingest
-- Element schema (jsonb object per event):
--   { "type": "heartbeat", "p_visitor_hash": "...", "p_delta_seconds": 42 }
--   { "type": "event", "p_visitor_hash": "...", "p_url_path": "/",
--     ...same p_* keys as ingest_event minus p_website_id... }
-- `type` defaults to heartbeat iff p_delta_seconds is present (belt & braces
-- for hand-built payloads). Returns { accepted, deduped, dropped, heartbeats }.
-- ---------------------------------------------------------------------------

-- Drop any earlier experimental signature before creating the canonical one.
drop function if exists public.ingest_events(uuid, jsonb);

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
  v_sanitized_data   jsonb;
begin
  -- ---- Shape guards ------------------------------------------------------
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

  -- Hard server-side cap (client MAX_BATCH is 10; this bounds abuse).
  if v_total > 32 then
    v_dropped := v_total - 32;
    v_total   := 32;
  end if;

  -- ---- Quota state -------------------------------------------------------
  if v_website.quota_month < v_current_month then
    v_month_rolled := true;
    v_quota_left   := v_website.monthly_event_quota;
  else
    v_quota_left := greatest(v_website.monthly_event_quota - v_website.events_this_month, 0);
  end if;

  -- ---- Deterministic order ----------------------------------------------
  -- Sort by visitor hash (ascending) so concurrent batches acquire per-visitor
  -- advisory locks in a consistent GLOBAL order -> no deadlocks. Ordinality
  -- tiebreaker keeps original array order inside each visitor group, which the
  -- 1s dedupe and [pageview, custom, pageview] sequences depend on.
  select coalesce(jsonb_agg(t.elem order by left(coalesce(t.elem ->> 'p_visitor_hash', ''), 64), t.ord), '[]'::jsonb)
    into v_sorted
    from jsonb_array_elements(p_events) with ordinality as t(elem, ord);

  -- ---- Main loop ---------------------------------------------------------
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

      -- Lock + cache boundary per distinct visitor. pg_advisory_xact_lock is
      -- re-entrant but we only cross this branch when the visitor changes.
      if v_session_visitor is distinct from v_vh then
        perform pg_advisory_xact_lock(hashtext(p_website_id::text), hashtext(v_vh));
        v_session_visitor := v_vh;
        v_session_id      := null;
      end if;

      -- ---------------------------------------------------------- heartbeat
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
        -- Unknown/expired session: silent no-op (legacy parity). No quota use.

        -- ------------------------------------------------------------- event
        else
          -- Quota is enforced per EVENT during the loop so partial batches
          -- behave exactly like sequential legacy calls would have.
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

          v_url_path   := left(coalesce(nullif(v_elem ->> 'p_url_path', ''), '/'), 1024);
          v_event_name := nullif(left(v_elem ->> 'p_event_name', 128), '');

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
              -- Best-effort 1s dedupe: only when the LAST event of ANY type in
              -- this session is itself a same-path pageview. Sees rows this
              -- transaction inserted earlier in the batch. Ordered by id (not
              -- created_at): within one batch transaction now() is constant,
              -- so created_at ties are guaranteed and created_at ordering
              -- would be arbitrary — the identity sequence is the true
              -- insertion order.
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

          -- Sanitize event data (cap 2KB), identical to ingest_event.
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
            v_event_name, v_sanitized_data, now()
          );

          v_accepted   := v_accepted + 1;
          v_quota_left := v_quota_left - 1;
        end if;

    exception when others then
      -- A single malformed element must never sink its siblings.
      v_dropped := v_dropped + 1;
    end;
  end loop;

  -- ---- One counter write per BATCH (not per event) ------------------------
  -- Merges month rollover exactly like legacy: only an actually-accepted
  -- event flips quota_month / resets the counter.
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
-- Grants (REVOKE ALL FROM PUBLIC is non-negotiable — agent.md §4.3).
-- NOTE: Supabase's default privileges for supabase_admin auto-grant EXECUTE
-- on every NEW function to anon + authenticated + service_role. Removing the
-- PUBLIC grant alone is therefore NOT enough — anon/authenticated must be
-- revoked EXPLICITLY or the RPC stays publicly executable.
-- ---------------------------------------------------------------------------
revoke all on function public.ingest_events(uuid, jsonb) from public;
revoke all on function public.ingest_events(uuid, jsonb) from anon;
revoke all on function public.ingest_events(uuid, jsonb) from authenticated;
grant execute on function public.ingest_events(uuid, jsonb) to service_role;

-- ============================================================================
-- ROLLBACK REFERENCE (not executed):
--   recreate dropped indexes if a consumer ships:
--     create index if not exists idx_events_utm_medium
--       on public.website_events (website_id, utm_medium) where utm_medium is not null;
--     create index if not exists idx_events_utm_campaign
--       on public.website_events (website_id, utm_campaign) where utm_campaign is not null;
--     create index if not exists idx_events_referrer_path
--       on public.website_events (website_id, referrer_path) where referrer_path is not null;
--   revert fillfactor: alter table public.sessions set (fillfactor = 100);
-- ============================================================================
