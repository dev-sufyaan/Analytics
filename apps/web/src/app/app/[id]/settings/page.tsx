'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@analytics/db/client';
import type { Website } from '@analytics/db/types';
import { wipeWebsiteData } from '@analytics/db/queries';
import {
  PanelCard,
  ButtonPrimary,
  ButtonOutline,
  TextInput,
  Switch,
  CodeEditorMockup,
  ModalCard,
  Toast,
} from '@analytics/ui';
import { Trash2, Copy, ExternalLink, ArrowLeft, AlertCircle, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { buildAiPrompt } from '@/lib/ai-prompt';
import { getCollectOrigin } from '@/lib/collect-url';

export default function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: websiteId } = use(params);
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserClient(), []);

  const [website, setWebsite] = useState<Website | null>(null);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  const fetchSite = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from('websites').select('*').eq('id', websiteId).single();
    if (error || !data) {
      setLoadError(error?.message || 'Website not found or you do not have access.');
      setWebsite(null);
    } else {
      setWebsite(data as Website);
      setName((data as Website).name);
      setDomain((data as Website).domain);
      setAllowedDomains(((data as Website).allowed_domains || []).join(', '));
      setIsPublic((data as Website).is_public);
    }
    setLoading(false);
  }, [websiteId, supabase]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;
    setSaving(true);
    try {
      const domainsArray = allowedDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const { error } = await supabase
        .from('websites')
        .update({
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
          allowed_domains: domainsArray,
          is_public: isPublic,
        })
        .eq('id', websiteId);
      if (error) throw error;
      setToastMsg('Settings saved successfully');
      fetchSite();
    } catch (e: any) {
      setToastMsg(e.message || 'Error updating website');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
    if (!website) return;
    setTogglingPublic(true);
    try {
      const { error } = await supabase.from('websites').update({ is_public: checked }).eq('id', websiteId);
      if (error) throw error;
      setWebsite((prev) => (prev ? { ...prev, is_public: checked } : prev));
      setToastMsg(checked ? 'Public dashboard enabled.' : 'Public dashboard disabled.');
    } catch (e: any) {
      setIsPublic(!checked);
      setToastMsg(e.message || 'Could not update sharing setting.');
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleWipeData = async () => {
    setWiping(true);
    try {
      await wipeWebsiteData(supabase, websiteId);
      setShowWipeModal(false);
      setToastMsg('Analytics data wiped successfully');
    } catch (e: any) {
      setToastMsg(e.message || 'Error wiping data');
    } finally {
      setWiping(false);
    }
  };

  const handleDeleteWebsite = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('websites').delete().eq('id', websiteId);
      if (error) throw error;
      router.push('/app');
      router.refresh();
    } catch (e: any) {
      setToastMsg(e.message || 'Error deleting website');
      setDeleting(false);
    }
  };

  const snippetCode = website
    ? `<script defer src="${getCollectOrigin()}/t.js" data-web="${website.id}"></script>`
    : '';

  const shareUrl = website ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${website.share_token}` : '';

  const quotaPct = website ? Math.min(100, Math.round((website.events_this_month / Math.max(1, website.monthly_event_quota)) * 100)) : 0;
  const quotaTone = quotaPct >= 90 ? 'bg-black' : quotaPct >= 70 ? 'bg-amber-500' : 'bg-[#c8f6f9]';

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        <div className="animate-pulse space-y-4 max-w-3xl">
          <div className="h-6 w-40 bg-[#f0f0f0] rounded" />
          <div className="h-8 w-64 bg-[#f0f0f0] rounded" />
          <div className="h-32 bg-white border border-[#ebebeb] rounded-[4px]" />
          <div className="h-40 bg-white border border-[#ebebeb] rounded-[4px]" />
        </div>
      </div>
    );
  }

  if (loadError || !website) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        <Link href="/app" className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="w-3 h-3" /> BACK TO APP
        </Link>
        <div className="max-w-lg bg-white border border-red-200 rounded-[4px] p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-[16px] font-medium text-black mb-1">Couldn&apos;t load settings</h2>
              <p className="font-display text-[13px] text-[#71717a] mb-4">{loadError || 'Website not found.'}</p>
              <div className="flex gap-2">
                <ButtonOutline type="button" onClick={fetchSite}>RETRY</ButtonOutline>
                <Link href="/app"><ButtonPrimary>GO TO DASHBOARD</ButtonPrimary></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="pb-6 mb-8 border-b border-[#ebebeb]">
        <Link href={`/app/${websiteId}`} className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black inline-flex items-center gap-1 mb-1.5">
          <ArrowLeft className="w-3 h-3" /> BACK TO OVERVIEW
        </Link>
        <h1 className="font-display text-[28px] md:text-[40px] font-medium tracking-[-0.8px] text-black">Settings: {website.name}</h1>
      </div>

      <div className="space-y-8 max-w-3xl">
        <PanelCard eyebrow="GENERAL" title="Site Details">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <TextInput label="WEBSITE NAME" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextInput label="PRIMARY DOMAIN" value={domain} onChange={(e) => setDomain(e.target.value)} required />
            <TextInput
              label="ALLOWED DOMAINS (COMMA SEPARATED)"
              helper="Domains permitted to send pageviews. Localhost is automatically allowed with data-dev='true'."
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
            />
            <div className="pt-2 flex items-center gap-3">
              <ButtonPrimary type="submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</ButtonPrimary>
              <span className="font-mono text-[11px] uppercase text-[#999999] hidden sm:inline">Changes apply immediately to the tracker ingest allowlist.</span>
            </div>
          </form>
        </PanelCard>

        <PanelCard eyebrow="INSTALLATION" title="Tracking Code">
          <p className="font-display text-[13px] leading-[20px] text-[#71717a] mb-4">
            Paste this snippet into the <code className="bg-[#ebebeb] px-1 py-0.5 rounded text-black font-mono text-[11px]">&lt;head&gt;</code> of your site. It&apos;s under 1.5 KB gzipped and sends no cookies.
          </p>
          <CodeEditorMockup code={snippetCode} title="EMBED CODE" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(snippetCode);
                setToastMsg('Snippet copied');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ebebeb] rounded-[4px] font-mono text-[11px] uppercase hover:bg-[#fafafa]"
            >
              <Copy className="w-3.5 h-3.5" /> COPY SNIPPET
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!website) return;
                const prompt = buildAiPrompt({
                  websiteId: website.id,
                  domain: website.domain,
                  origin: getCollectOrigin(),
                  siteName: website.name,
                });
                await navigator.clipboard.writeText(prompt);
                setAiCopied(true);
                setToastMsg('AI prompt copied — paste into Cursor / Claude');
                setTimeout(() => setAiCopied(false), 2000);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-[11px] uppercase ${aiCopied ? 'bg-black text-white' : 'bg-[#010120] text-white hover:bg-[#26263a]'}`}
            >
              {aiCopied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {aiCopied ? 'COPIED' : 'COPY AI PROMPT'}
            </button>
          </div>
          <p className="font-mono text-[10px] uppercase text-[#999999] mt-2">AI prompt includes your real ID {website?.id.slice(0, 8)}… + framework steps + verification. No hallucinated IDs.</p>
        </PanelCard>

        <PanelCard eyebrow="SHARING" title="Public Dashboard">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black flex items-center gap-2">
                  Enable Public Link <ShieldCheck className="w-4 h-4 text-[#71717a]" />
                </h4>
                <p className="font-display text-[13px] text-[#71717a]">Anyone with the link can view a read-only overview. No login required.</p>
              </div>
              <Switch checked={isPublic} onChange={handleTogglePublic} disabled={togglingPublic} />
            </div>

            {isPublic && (
              <div className="mt-4 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1.5">SHAREABLE PUBLIC URL</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" readOnly value={shareUrl} className="flex-1 min-w-0 bg-white border border-[#ebebeb] rounded-[4px] px-3 py-2 font-mono text-[12px] text-black truncate" />
                  <div className="flex gap-2 shrink-0">
                    <ButtonOutline type="button" onClick={() => { navigator.clipboard.writeText(shareUrl); setToastMsg('Share link copied!'); }}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> COPY
                    </ButtonOutline>
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-3 border border-[#ebebeb] rounded-[3.25px] hover:bg-white text-black transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PanelCard>

        <PanelCard eyebrow="STORAGE & RETENTION" title="Usage & Quota">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#71717a]">Monthly events</span>
                <span className="font-mono font-medium text-black">{website.events_this_month.toLocaleString()} / {website.monthly_event_quota.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-[#ebebeb] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${quotaTone}`} style={{ width: `${quotaPct}%` }} />
              </div>
              <p className="font-mono text-[11px] uppercase text-[#999999]">{quotaPct}% used · resets 1st of next month · Free Tier ($0)</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px] pt-2 border-t border-[#ebebeb]">
              <div><span className="text-[#71717a]">Raw retention:</span> <span className="font-mono font-medium">{website.data_retention_days} days</span></div>
              <div><span className="text-[#71717a]">Summaries:</span> <span className="font-mono font-medium">Forever</span></div>
            </div>
            <p className="font-display text-[12px] text-[#999999]">Historical daily rollups in <code className="font-mono text-[11px]">daily_stats</code> are kept indefinitely.</p>
          </div>
        </PanelCard>

        <PanelCard eyebrow="DANGER ZONE" title="Destructive Actions">
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black">Wipe Analytics Data</h4>
                <p className="font-display text-[13px] text-[#71717a]">Delete all pageviews, sessions and rollups for this website (one atomic request).</p>
              </div>
              <ButtonOutline type="button" onClick={() => setShowWipeModal(true)} className="shrink-0">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> WIPE DATA
              </ButtonOutline>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#ebebeb]">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black">Delete Website</h4>
                <p className="font-display text-[13px] text-[#71717a]">Permanently remove this website and all its data from your account.</p>
              </div>
              <ButtonOutline type="button" onClick={() => setShowDeleteModal(true)} className="shrink-0 border-red-200 text-red-700 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> DELETE WEBSITE
              </ButtonOutline>
            </div>
          </div>
        </PanelCard>
      </div>

      <ModalCard isOpen={showWipeModal} onClose={() => setShowWipeModal(false)} title="Confirm Data Wipe">
        <p className="font-display text-[14px] leading-[22px] text-[#71717a] mb-6">
          Are you absolutely sure you want to wipe all recorded events and sessions for <strong className="text-black">{website.name}</strong>? This deletes from <code className="font-mono text-[11px]">website_events</code>, <code className="font-mono text-[11px]">sessions</code> and <code className="font-mono text-[11px]">daily_stats</code> in one transaction. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <ButtonOutline type="button" onClick={() => setShowWipeModal(false)}>CANCEL</ButtonOutline>
          <ButtonPrimary type="button" onClick={handleWipeData} disabled={wiping}>{wiping ? 'WIPING…' : 'CONFIRM WIPE'}</ButtonPrimary>
        </div>
      </ModalCard>

      <ModalCard isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Website?">
        <p className="font-display text-[14px] leading-[22px] text-[#71717a] mb-6">
          This will permanently delete <strong className="text-black">{website.name} ({website.domain})</strong> and every associated event and session. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <ButtonOutline type="button" onClick={() => setShowDeleteModal(false)} disabled={deleting}>CANCEL</ButtonOutline>
          <ButtonPrimary type="button" onClick={handleDeleteWebsite} disabled={deleting} className="bg-red-600 hover:bg-red-700 border-red-600">
            {deleting ? 'DELETING…' : 'DELETE WEBSITE'}
          </ButtonPrimary>
        </div>
      </ModalCard>

      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
