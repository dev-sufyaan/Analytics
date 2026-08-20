'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@aether/db/client';
import {
  ButtonPrimary,
  ButtonOutline,
  TextInput,
  CodeEditorMockup,
  LiveDot,
} from '@aether/ui';

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

      await fetch('/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const snippetCode = createdSite
    ? `<script defer src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/t.js" data-web="${createdSite.id}"></script>`
    : '';

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

          <div className="mb-8">
            <CodeEditorMockup
              title={`TRACKING SNIPPET — ${createdSite.domain.toUpperCase()}`}
              code={snippetCode}
            />
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
    </div>
  );
}
