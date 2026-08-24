'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@analytics/db/client';
import {
  ButtonPrimary,
  ButtonOutline,
  TextInput,
  CodeEditorMockup,
  LiveDot,
  Toast,
} from '@analytics/ui';
import { Sparkles, Copy, Check } from 'lucide-react';
import { buildAiPrompt } from '@/lib/ai-prompt';
import { getCollectOrigin } from '@/lib/collect-url';
import { posthog } from '@/components/PostHogProvider';

export default function NewSitePage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [timezone, setTimezone] = useState(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [createdSite, setCreatedSite] = useState<{
    id: string;
    name: string;
    domain: string;
  } | null>(null);

  const [testSent, setTestSent] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [aiCopied, setAiCopied] = useState(false);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !domain) {
      setErrorMsg('Please fill in both the site name and domain.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)/, '').replace(/\/.*$/, '');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('websites')
        .insert({
          user_id: user.id,
          name: name.trim(),
          domain: cleanDomain,
          allowed_domains: [cleanDomain],
          timezone,
        })
        .select('id, name, domain')
        .single();

      if (error) throw error;
      posthog.capture('website_created', { website_id: data.id });
      setCreatedSite(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create website');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEvent = async () => {
    if (!createdSite) return;
    setTestSent(true);

    try {
      // Ingest test event via collect endpoint or direct RPC
      const payload = {
        w: createdSite.id,
        n: 'pageview',
        u: '/',
        r: 'https://google.com',
        t: 'Test Pageview',
        s: '1920x1080',
        l: 'en-US',
      };

      const response = await fetch('/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        posthog.capture('test_event_sent', { website_id: createdSite.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const snippetCode = createdSite
    ? `<script defer src="${getCollectOrigin()}/t.js" data-web="${createdSite.id}"></script>`
    : '';

  const aiPrompt = createdSite
    ? buildAiPrompt({
        websiteId: createdSite.id,
        domain: createdSite.domain,
        origin: getCollectOrigin(),
        siteName: createdSite.name,
      })
    : '';

  const handleCopy = async (text: string, isAi = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isAi) {
        setAiCopied(true);
        setTimeout(() => setAiCopied(false), 2000);
        setToastMsg('AI prompt copied — paste into Cursor / Claude / Copilot');
      } else {
        setToastMsg('Snippet copied to clipboard');
      }
    } catch {
      setToastMsg('Copy failed — please select and copy manually');
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {!createdSite ? (
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              ONBOARDING
            </span>
            <h1 className="font-display text-[32px] font-medium tracking-[-0.8px] text-black mb-3">
              Add a new website
            </h1>
            <p className="font-display text-[15px] leading-[22px] text-[#71717a]">
              Enter your site name and domain to generate your lightweight tracking script.
            </p>
          </div>

          <form onSubmit={handleCreateSite} className="space-y-5 bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8">
            <TextInput
              label="WEBSITE NAME"
              placeholder="My SaaS App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextInput
              label="DOMAIN"
              placeholder="example.com"
              helper="Enter your production domain (without https://)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />

            <TextInput
              label="TIMEZONE"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helper="Used for daily rollup aggregation boundaries"
              required
            />

            {errorMsg && (
              <div className="p-3 bg-[#fcfcfc] border border-black text-black font-mono text-[11px] uppercase rounded-[4px]">
                {errorMsg}
              </div>
            )}

            <ButtonPrimary type="submit" disabled={loading} className="w-full">
              {loading ? 'CREATING WEBSITE...' : 'CREATE WEBSITE'}
            </ButtonPrimary>
          </form>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] bg-black px-2.5 py-1 rounded-[4px] inline-block mb-3">
              STEP 2 OF 2
            </span>
            <h1 className="font-display text-[32px] md:text-[36px] font-medium tracking-[-0.8px] text-black mb-3">
              Paste this on {createdSite.domain}
            </h1>
            <p className="font-display text-[15px] leading-[22px] text-[#71717a]">
              Insert this snippet inside the <code className="font-mono text-[13px] bg-[#ebebeb] px-1.5 py-0.5 rounded text-black">&lt;head&gt;</code> of your website. It loads asynchronously and weighs under 1.5 KB.
            </p>
          </div>

          <div className="mb-6">
            <CodeEditorMockup
              title={`TRACKING SNIPPET — ${createdSite.domain.toUpperCase()}`}
              code={snippetCode}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopy(snippetCode, false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase hover:bg-[#fafafa] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> COPY SNIPPET
              </button>
              <span className="font-mono text-[11px] uppercase text-[#999999] self-center">or</span>
              <button
                type="button"
                onClick={() => handleCopy(aiPrompt, true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-[11px] uppercase transition-colors ${aiCopied ? 'bg-black text-white' : 'bg-[#010120] text-white hover:bg-[#26263a]'}`}
              >
                {aiCopied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiCopied ? 'COPIED' : 'COPY AI PROMPT'}
              </button>
              <span className="font-mono text-[10px] uppercase text-[#999999] self-center hidden sm:inline">
                with ID {createdSite.id.slice(0, 8)}… included
              </span>
            </div>
          </div>

          {/* AI Agent Instructions — vibe coding era */}
          <div className="mb-8 border border-[#bdbbff] bg-[#fafaff] rounded-[4px] overflow-hidden">
            <div className="bg-[#010120] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#c8f6f9] rounded-full animate-pulse" />
                <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-white">
                  VIBE CODING — AI AGENT INSTRUCTIONS
                </span>
                <span className="hidden sm:inline font-mono text-[10px] uppercase bg-[#c8f6f9] text-black px-1.5 py-0.5 rounded">
                  CURSOR / CLAUDE / COPILOT
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase text-[#999999] hidden md:inline">PASTE INTO YOUR AGENT → DONE IN 60S</span>
            </div>
            <div className="p-4 md:p-5">
              <p className="font-display text-[13px] leading-[20px] text-[#71717a] mb-3">
                Don&apos;t paste the snippet yourself — let your AI do it. This prompt includes your real Website ID <code className="font-mono text-[11px] bg-white border border-[#ebebeb] px-1 py-0.5 rounded text-black">{createdSite.id}</code> and framework-aware steps for <strong className="text-black">Next.js, Vite, Vue, SvelteKit, Astro, Remix, HTML</strong> + verification.
              </p>
              <div className="bg-white border border-[#ebebeb] rounded-[4px] p-3 max-h-[220px] overflow-y-auto">
                <pre className="font-mono text-[11px] leading-[16px] text-black whitespace-pre-wrap break-words">
                  {aiPrompt.slice(0, 900)}
                  {aiPrompt.length > 900 ? '\n… (full prompt copied, 2.1k tokens)' : ''}
                </pre>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(aiPrompt, true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-[4px] font-mono text-[11px] uppercase hover:bg-[#26263a] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiCopied ? 'PROMPT COPIED ✓' : 'COPY FULL AI PROMPT'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(snippetCode, false)}
                  className="px-4 py-2 bg-white border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase hover:bg-[#fafafa] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1.5" />
                  COPY SNIPPET ONLY
                </button>
              </div>
              <p className="font-mono text-[10px] uppercase text-[#999999] mt-2">
                Prompt is generated from your live site (ID + domain + origin) and reflects current tracker (1.15KB, ≤1.5KB budget, {new Date().toISOString().slice(0, 10)}). No hallucinated IDs.
              </p>
            </div>
          </div>

          <div className="bg-[#fafafa] border border-[#ebebeb] rounded-[4px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LiveDot />
              <span className="font-mono text-[12px] uppercase text-[#71717a]">
                {testSent ? 'TEST EVENT SENT! CHECKING DATA...' : 'WAITING FOR FIRST PAGEVIEW...'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <ButtonOutline onClick={handleSendTestEvent} className="flex-1 md:flex-initial">
                SEND TEST EVENT
              </ButtonOutline>
              <ButtonPrimary
                onClick={() => router.push(`/app/${createdSite.id}`)}
                className="flex-1 md:flex-initial"
              >
                GO TO DASHBOARD
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}
      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
