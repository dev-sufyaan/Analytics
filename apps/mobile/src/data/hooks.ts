// apps/mobile/src/data/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from './keys';
import { rangeWindow } from '@analytics/db/range';
import { getDashboardOverview, getUserWebsites, wipeWebsiteData, getWebsiteEventStats } from '@analytics/db/queries';
import type { Website, DashboardOverview, DashboardFilter, DashboardRange, RealtimeData, WebsiteEventStats } from '@analytics/db/types';
import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// useAuth — single source of truth for the current session.
//
// CRITICAL: prior versions set `loading=false` AFTER the async getSession()
// resolved, but the React Query hooks for sites / overview / realtime
// mounted and fired their first request BEFORE that resolution completed.
// Those requests went out without a valid JWT, so PostgREST + RLS returned
// an empty array / 0 rows. React Query then cached the empty result and
// never re-ran the query when the session finally arrived — which is why
// the mobile dashboard was stuck on zeros while the web dashboard (which
// loads the session synchronously via cookies) showed the real numbers.
//
// Fix: track `loading` until BOTH the initial getSession() AND the first
// `INITIAL_SESSION` / `SIGNED_IN` event from onAuthStateChange have fired.
// Data hooks below use this flag to gate themselves and only refetch once
// the session is actually present.
// ---------------------------------------------------------------------------
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // sessionReady flips to true exactly once we have a definitive answer from
  // the Supabase auth layer (either a real session or `null` after the
  // initial restore). Components use this to gate RLS-protected queries.
  const [sessionReady, setSessionReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    // Tracks the last session we have applied to React state. Used to
    // detect a real null → authenticated transition so we can invalidate
    // RLS-gated queries exactly once. This also de-dupes the case where
    // both getSession() and the INITIAL_SESSION event resolve to the
    // same session.
    const prevRef: { current: Session | null } = { current: null };

    const applySession = (next: Session | null) => {
      if (!mounted) return;
      const hadPrev = !!prevRef.current;
      prevRef.current = next;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
      setSessionReady(true);
      // Real null → authenticated transition: kick off any RLS-gated
      // queries that mounted with `enabled: false`. Without this they
      // would never recover.
      if (next && !hadPrev) {
        queryClient.invalidateQueries();
      }
    };

    // 1. Initial restore from SecureStore (the slow path on cold start).
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        applySession(s ?? null);
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
          setSessionReady(true);
        }
      });

    // 2. Subscribe to subsequent changes (sign-in, sign-out, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'SIGNED_OUT'
      ) {
        applySession(s ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    // Clear all cached RLS-gated data first so the next user (or a re-login)
    // does not briefly see another account's numbers.
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  return {
    session,
    user,
    loading,
    sessionReady,
    signOut,
    isAuthenticated: !!session,
  };
}

export function useSites() {
  const { sessionReady, isAuthenticated } = useAuth();
  return useQuery<Website[]>({
    queryKey: queryKeys.sites(),
    queryFn: async () => {
      return await getUserWebsites(supabase);
    },
    // Wait for the auth layer to finish restoring the session before
    // attempting a PostgREST call; otherwise RLS returns an empty list and
    // the empty result gets cached for `staleTime`.
    enabled: sessionReady && isAuthenticated,
    staleTime: 60_000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
}

export function useOverview(
  websiteId: string | null | undefined,
  range: DashboardRange = '30d',
  filter: DashboardFilter | null = null
) {
  const { sessionReady, isAuthenticated } = useAuth();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return useQuery<DashboardOverview>({
    queryKey: queryKeys.overview(websiteId || '', range, filter),
    queryFn: async () => {
      if (!websiteId) throw new Error('Website ID required');
      const win = rangeWindow(range);
      return await getDashboardOverview(supabase, websiteId, {
        start: win.start,
        end: win.end,
        interval: win.interval,
        prevStart: win.prevStart,
        prevEnd: win.prevEnd,
        filterType: filter?.type ?? null,
        filterValue: filter?.value ?? null,
        limit: 100,
      });
    },
    enabled: sessionReady && isAuthenticated && !!websiteId,
    staleTime: 30_000, // 30s fresh window matching web overview-store.ts
    gcTime: 24 * 60 * 60 * 1000, // 24 hours offline garbage collection
    refetchInterval: isForeground ? 30_000 : false, // Auto-poll only while foregrounded
    refetchOnReconnect: true,
    refetchOnWindowFocus: 'always',
    retry: (failureCount, error) => {
      if (error && error.message && /Unauthorized/i.test(error.message)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: (previousData) => previousData, // SWR: smooth data retention across filter/range changes
  });
}

export function useRealtime(websiteId: string | null | undefined, enabled = true) {
  const { sessionReady, isAuthenticated } = useAuth();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const shouldPoll = sessionReady && isAuthenticated && enabled && !!websiteId && isForeground;

  return useQuery<RealtimeData>({
    queryKey: queryKeys.realtime(websiteId || ''),
    queryFn: async () => {
      if (!websiteId) throw new Error('Website ID required');
      const { data, error } = await supabase.rpc('get_realtime_visitors', {
        p_website_id: websiteId,
      });
      if (error) throw new Error(error.message);
      return (
        (data as RealtimeData) || {
          active_visitors: 0,
          active_pages: [],
        }
      );
    },
    enabled: shouldPoll,
    staleTime: 10_000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: shouldPoll ? 15_000 : false, // 15-second live polling suspended on background
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Aggregate KPI for the events surface (Umami parity).
 *
 * Returns: { events, visitors, visits, unique_events }
 * This is the single source of truth for the "TOTAL TRIGGERS" and
 * "UNIQUE VISITORS" tiles on the events page. DO NOT replace it with a
 * client-side reduce over the per-event list — that double-counts the
 * same visitor across multiple event names.
 */
export function useEventStats(websiteId: string | null | undefined, range: DashboardRange = '30d') {
  const { sessionReady, isAuthenticated } = useAuth();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return useQuery<WebsiteEventStats>({
    queryKey: [...queryKeys.all, 'event_stats', websiteId || '', range] as const,
    queryFn: async () => {
      if (!websiteId) throw new Error('Website ID required');
      const win = rangeWindow(range);
      return await getWebsiteEventStats(supabase, websiteId, win.start, win.end);
    },
    enabled: sessionReady && isAuthenticated && !!websiteId,
    staleTime: 30_000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchInterval: isForeground ? 30_000 : false,
    refetchOnReconnect: true,
    placeholderData: (previousData: WebsiteEventStats | undefined) => previousData,
  });
}

export function useWipeSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (websiteId: string) => {
      await wipeWebsiteData(supabase, websiteId);
    },
    onSuccess: (_, websiteId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.overview(websiteId, '30d') });
      queryClient.invalidateQueries({ queryKey: queryKeys.realtime(websiteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites() });
    },
  });
}
