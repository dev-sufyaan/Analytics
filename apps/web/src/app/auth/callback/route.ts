// apps/web/src/app/auth/callback/route.ts
import { createServerClient } from '@analytics/db/server';
import { NextResponse } from 'next/server';
import { getServerPostHog } from '@/lib/posthog-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Capture the login server-side, linked to the same distinct_id the
      // client uses in posthog.identify() so backend + frontend events join.
      const posthog = getServerPostHog();
      if (posthog && user) {
        posthog.identify({
          distinctId: user.id,
          properties: { email: user.email },
        });
        posthog.capture({
          distinctId: user.id,
          event: 'user_logged_in',
        });
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`);
}
