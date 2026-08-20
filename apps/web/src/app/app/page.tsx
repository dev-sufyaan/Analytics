import { createServerClient } from '@aether/db/server';
import { getUserWebsites } from '@aether/db/queries';
import { redirect } from 'next/navigation';

export default async function AppPage() {
  const supabase = await createServerClient();
  const websites = await getUserWebsites(supabase);

  if (websites.length === 0) {
    redirect('/app/sites/new');
  }

  redirect(`/app/${websites[0].id}`);
}
