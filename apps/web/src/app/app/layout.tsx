import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getRscUser, getRscUserWebsites } from '@/lib/rsc-user';
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
  const user = await getRscUser();

  if (!user) {
    redirect('/login');
  }

  // Request-scoped cached (shared with app/page.tsx — queried once per request).
  const websites = await getRscUserWebsites();

  return (
    <AppShellClient userId={user.id} userEmail={user.email || ''} websites={websites}>
      {children}
    </AppShellClient>
  );
}
