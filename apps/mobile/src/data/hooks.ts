// apps/mobile/src/data/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from './keys';
import { rangeWindow } from '@analytics/db/range';
import { getDashboardOverview, getUserWebsites, wipeWebsiteData } from '@analytics/db/queries';
import type { Website, DashboardOverview, DashboardFilter, DashboardRange, RealtimeData } from '@analytics/db/types';
import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, loading, signOut, isAuthenticated: !!session };
}

export function useSites() {
  return useQuery<Website[]>({
    queryKey: queryKeys.sites(),
    queryFn: async () => {
      return await getUserWebsites(supabase);
    },
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
    enabled: !!websiteId,
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
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const shouldPoll = isForeground && enabled && !!websiteId;

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
