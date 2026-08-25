-- ============================================================================
-- 0010_push_tokens.sql
--
-- Mobile App Phase 4 — FCM Push Notification Device Registry & Daily Digest RPC.
--
-- 1. Table: public.push_tokens (user_id, device_id, fcm_token, preferences)
-- 2. Row Level Security: Authenticated users can insert/update their own tokens.
-- 3. Function: get_yesterday_user_digests() for Worker cron execution (service_role only).
--
-- Idempotent: create-if-not-exists / create-or-replace / grant-reassert.
-- ============================================================================

-- 1. Table Creation
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  fcm_token text not null,
  preferences jsonb not null default '{"daily_digest": true, "milestones": false}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_id)
);

-- Indexes for efficient lookup & cascade deletions
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
create index if not exists idx_push_tokens_fcm on public.push_tokens(fcm_token);

-- 2. Row Level Security
alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select on public.push_tokens;
create policy push_tokens_select on public.push_tokens
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists push_tokens_insert on public.push_tokens;
create policy push_tokens_insert on public.push_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists push_tokens_update on public.push_tokens;
create policy push_tokens_update on public.push_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_tokens_delete on public.push_tokens;
create policy push_tokens_delete on public.push_tokens
  for delete to authenticated using (auth.uid() = user_id);

-- 3. Dedicated service-role helper for Cloudflare Worker push digest
create or replace function public.get_yesterday_user_digests()
returns table (user_id uuid, fcm_token text, total_views bigint, total_visitors bigint)
security definer
language sql as $$
  select pt.user_id, pt.fcm_token,
         coalesce(sum(ds.pageviews), 0)::bigint as total_views,
         coalesce(sum(ds.unique_visitors), 0)::bigint as total_visitors
  from public.push_tokens pt
  join public.websites w on w.user_id = pt.user_id
  left join public.daily_stats ds on ds.website_id = w.id and ds.day = (current_date - 1)
  where (pt.preferences->>'daily_digest')::boolean = true
  group by pt.user_id, pt.fcm_token;
$$;

-- Security Grants: Revoke from public and grant to service_role ONLY
revoke all on function public.get_yesterday_user_digests() from public;
grant execute on function public.get_yesterday_user_digests() to service_role;
