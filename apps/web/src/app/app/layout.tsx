import React from 'react';
import { createServerClient } from '@aether/db/server';
import { getUserWebsites } from '@aether/db/queries';
import { redirect } from 'next/navigation';
import AppShellClient from './AppShellClient';

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
