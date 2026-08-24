'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@analytics/db/client';
import {
  AuthFormCard,
  ButtonPrimary,
  ButtonOutline,
  TextInput,
} from '@analytics/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/app';
  const urlError = searchParams.get('error');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(urlError || '');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createBrowserClient();

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectPath);
        router.refresh();
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push(redirectPath);
          router.refresh();
        } else {
          setMagicLinkSent(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard>
      {magicLinkSent ? (
        <div className="text-center py-4">
          <div className="w-10 h-10 bg-[#c8f6f9] text-black rounded-full flex items-center justify-center mx-auto mb-4 font-mono text-[16px]">
            ✓
          </div>
          <h3 className="font-display text-[20px] font-medium mb-2">Check your email</h3>
          <p className="font-display text-[14px] text-[#71717a] mb-6">
            We sent a confirmation link to <strong className="text-black">{email}</strong>.
          </p>
          <ButtonOutline onClick={() => setMagicLinkSent(false)} className="w-full">
            BACK TO SIGN IN
          </ButtonOutline>
        </div>
      ) : (
        <div>
          <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
            <TextInput
              label="EMAIL ADDRESS"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextInput
              label="PASSWORD"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {errorMsg && (
              <div className="p-3 bg-[#fcfcfc] border border-black text-black font-mono text-[11px] uppercase rounded-[4px]">
                {errorMsg}
              </div>
            )}

            <ButtonPrimary type="submit" disabled={loading} className="w-full">
              {loading ? 'PROCESSING...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </ButtonPrimary>
          </form>

          <div className="mt-6 pt-4 border-t border-[#ebebeb] text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMsg('');
              }}
              className="font-display text-[13px] text-[#71717a] hover:text-black transition-colors cursor-pointer"
            >
              {mode === 'signin'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}
    </AuthFormCard>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#010120] flex flex-col justify-between">
      {/* Top Header */}
      <header className="p-6 md:p-8 max-w-[1280px] w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white font-display text-[20px] font-medium tracking-tight">
          <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
          <span>analytics</span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[11px] font-medium uppercase text-[#999999] hover:text-white transition-colors"
        >
          ← BACK TO HOME
        </Link>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-2">
              AUTHENTICATION
            </span>
            <h1 className="font-display text-[28px] font-medium text-white tracking-[-0.4px]">
              Sign in to Analytics
            </h1>
          </div>

          <Suspense fallback={<div className="text-white text-center font-mono text-[12px]">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-[#71717a] font-display text-[12px]">
        Analytics by Sufyaan Studio • Privacy-first, cookie-free web metrics.
      </footer>
    </div>
  );
}
