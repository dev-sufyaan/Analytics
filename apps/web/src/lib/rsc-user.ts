// apps/web/src/lib/rsc-user.ts
// Server-side request-scoped accessors. React's cache() memoizes per render
// pass, so app/layout and app/page share ONE auth lookup and ONE websites
// query instead of duplicating them.
import { cache } from 'react';
import { createServerClient } from '@analytics/db/server';
import { getUserWebsites } from '@analytics/db/queries';
import type { User } from '@supabase/supabase-js';
import type { Website } from '@analytics/db/types';

export const getRscUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getRscUserWebsites = cache(async (): Promise<Website[]> => {
  const supabase = await createServerClient();
  return getUserWebsites(supabase);
});
