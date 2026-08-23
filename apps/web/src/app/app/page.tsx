import { redirect } from 'next/navigation';
import { getRscUserWebsites } from '@/lib/rsc-user';

export default async function AppPage() {
  // Shares the layout's per-request cached query — no second round trip.
  const websites = await getRscUserWebsites();

  if (websites.length === 0) {
    redirect('/app/sites/new');
  }

  redirect(`/app/${websites[0].id}`);
}
