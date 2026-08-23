import React from 'react';
import type { Metadata } from 'next';
import { createServerClient } from '@analytics/db/server';
import { getUserWebsites } from '@analytics/db/queries';
import { redirect } from 'next/navigation';
import AppShellClient from './AppShellClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const websites = await getUserWebsites(supabase);

  return (
    <AppShellClient userEmail={user.email || ''} websites={websites}>
      {children}
    </AppShellClient>
  );
}
