import React from 'react';
import { createServerClient } from '@aether/db/server';
import { getWebsiteById } from '@aether/db/queries';
import { notFound } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function WebsiteOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const website = await getWebsiteById(supabase, id);

  if (!website) {
    notFound();
  }

  return <DashboardClient website={website} />;
}
