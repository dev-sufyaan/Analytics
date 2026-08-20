'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@aether/db/client';
import {
  AuthFormCard,
  ButtonPrimary,
  ButtonOutline,
  TextInput,
} from '@aether/ui';

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

  const handleGitHubAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize GitHub OAuth');
      setLoading(false);
    }
  };

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
          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={handleGitHubAuth}
            disabled={loading}
            className="w-full h-11 bg-[#010120] hover:bg-[#1a1a3a] text-white rounded-[4px] font-mono text-[13px] font-medium uppercase tracking-[0.06em] flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            CONTINUE WITH GITHUB
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#ebebeb]" />
            <span className="px-3 font-mono text-[10px] uppercase text-[#999999] tracking-wider">
              OR WITH EMAIL
            </span>
            <div className="flex-1 border-t border-[#ebebeb]" />
          </div>

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
        <a href="/" className="flex items-center gap-2 text-white font-display text-[20px] font-medium tracking-tight">
          <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
          <span>aether</span>
        </a>
        <a
          href="/"
          className="font-mono text-[11px] font-medium uppercase text-[#999999] hover:text-white transition-colors"
        >
          ← BACK TO HOME
        </a>
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-2">
              AUTHENTICATION
            </span>
            <h1 className="font-display text-[28px] font-medium text-white tracking-[-0.4px]">
              Sign in to Aether
            </h1>
          </div>

          <Suspense fallback={<div className="text-white text-center font-mono text-[12px]">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-[#71717a] font-display text-[12px]">
        Aether Analytics • Privacy-first, cookie-free web metrics.
      </footer>
    </div>
  );
}
