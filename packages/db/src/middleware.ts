// packages/db/src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // PERF: getSession() instead of getUser(). For a VALID session this is a
  // purely local JWT check — ZERO GoTrue network round trip per navigation
  // (previously every page/RSC request paid one). When the access token IS
  // expired it transparently refreshes AND persists the new cookies via the
  // setAll bridge above, preserving the exact behavior RSC relies on (server
  // components cannot write cookies themselves).
  //
  // SECURITY: middleware is a ROUTING gate only (redirect UX). It does not
  // verify signatures or authorization — that remains enforced where it
  // matters: app/layout re-validates with getUser(), and every data path goes
  // through RLS policies + owner-checked security-definer RPCs.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect /app routes
  if (request.nextUrl.pathname.startsWith('/app') && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect /login to /app if already logged in
  if (request.nextUrl.pathname === '/login' && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
