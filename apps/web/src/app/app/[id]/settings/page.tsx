'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@aether/db/client';
import { Website } from '@aether/db/types';
import {
  PanelCard,
  ButtonPrimary,
  ButtonOutline,
  TextInput,
  Switch,
  CodeEditorMockup,
  ModalCard,
  Toast,
} from '@aether/ui';
import { Trash2, Copy, ExternalLink, ArrowLeft } from 'lucide-react';

export default function SiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: websiteId } = use(params);
  const router = useRouter();
  const supabase = createBrowserClient();

  const [website, setWebsite] = useState<Website | null>(null);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wiping, setWiping] = useState(false);

  const fetchSite = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (data) {
      setWebsite(data);
      setName(data.name);
      setDomain(data.domain);
      setAllowedDomains((data.allowed_domains || []).join(', '));
      setIsPublic(data.is_public);
    }
    setLoading(false);
  }, [websiteId, supabase]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleWipeData = async () => {
    setWiping(true);
    try {
      await supabase.from('website_events').delete().eq('website_id', websiteId);
      await supabase.from('sessions').delete().eq('website_id', websiteId);
      await supabase.from('daily_stats').delete().eq('website_id', websiteId);

      setShowWipeModal(false);
      setToastMsg('Website analytics data wiped successfully');
    } catch (e: any) {
      setToastMsg(e.message || 'Error wiping data');
    } finally {
      setWiping(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!confirm('Are you sure you want to completely delete this website and all associated stats?')) {
      return;
    }
    try {
      await supabase.from('websites').delete().eq('id', websiteId);
      router.push('/app');
      router.refresh();
    } catch (e: any) {
      setToastMsg(e.message || 'Error deleting website');
    }
  };

  const snippetCode = website
    ? `<script defer src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/t.js" data-web="${website.id}"></script>`
    : '';

  const shareUrl = website
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${website.share_token}`
    : '';

  if (loading || !website) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto text-center font-display text-[14px] text-[#71717a]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="pb-6 mb-8 border-b border-[#ebebeb]">
        <div className="flex items-center gap-2 mb-1.5">
          <Link
            href={`/app/${websiteId}`}
            className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] hover:text-black transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>BACK TO OVERVIEW</span>
          </Link>
        </div>
        <h1 className="font-display text-[32px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
          Settings: {website.name}
        </h1>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* General Settings */}
        <PanelCard eyebrow="GENERAL" title="Site Details">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <TextInput
              label="WEBSITE NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextInput
              label="PRIMARY DOMAIN"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />

            <TextInput
              label="ALLOWED DOMAINS (COMMA SEPARATED)"
              helper="Domains permitted to send pageviews. Localhost is automatically allowed with data-dev='true'."
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
            />

            <div className="pt-2">
              <ButtonPrimary type="submit" disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </ButtonPrimary>
            </div>
          </form>
        </PanelCard>

        {/* Tracking Snippet */}
        <PanelCard eyebrow="INSTALLATION" title="Tracking Code">
          <p className="font-display text-[14px] leading-[22px] text-[#71717a] mb-4">
            Copy and paste this snippet into the <code className="bg-[#ebebeb] px-1 py-0.5 rounded text-black font-mono text-[12px]">&lt;head&gt;</code> of your website.
          </p>
          <CodeEditorMockup code={snippetCode} title="EMBED CODE" />
        </PanelCard>

        {/* Public Share Link */}
        <PanelCard eyebrow="SHARING" title="Public Dashboard">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black">Enable Public Link</h4>
                <p className="font-display text-[13px] text-[#71717a]">
                  Allow anyone with the link to view analytics without logging in.
                </p>
              </div>
              <Switch
                checked={isPublic}
                onChange={(checked) => {
                  setIsPublic(checked);
                }}
              />
            </div>

            {isPublic && (
              <div className="mt-4 p-4 bg-[#fafafa] border border-[#ebebeb] rounded-[4px]">
                <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">
                  SHAREABLE PUBLIC URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-white border border-[#ebebeb] rounded-[4px] px-3 py-1.5 font-mono text-[12px] text-black"
                  />
                  <ButtonOutline
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setToastMsg('Share link copied!');
                    }}
                  >
                    COPY
                  </ButtonOutline>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-[#ebebeb] rounded-[3.25px] hover:bg-white text-black transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </PanelCard>

        {/* Data Retention */}
        <PanelCard eyebrow="STORAGE & RETENTION" title="Retention Policy">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#71717a]">Current Plan:</span>
              <span className="font-mono uppercase font-medium">Free Tier ($0)</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#71717a]">Raw Event Retention:</span>
              <span className="font-mono font-medium">{website.data_retention_days} Days</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#71717a]">Monthly Quota:</span>
              <span className="font-mono font-medium">{website.events_this_month.toLocaleString()} / {website.monthly_event_quota.toLocaleString()} events</span>
            </div>
            <p className="font-display text-[13px] text-[#71717a] pt-2">
              Historical daily summaries are preserved permanently in <code className="font-mono text-[11px]">daily_stats</code>.
            </p>
          </div>
        </PanelCard>

        {/* Danger Zone */}
        <PanelCard eyebrow="DANGER ZONE" title="Destructive Actions">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black">Wipe Analytics Data</h4>
                <p className="font-display text-[13px] text-[#71717a]">
                  Permanently delete all historical pageviews and sessions for this website.
                </p>
              </div>
              <ButtonOutline type="button" onClick={() => setShowWipeModal(true)}>
                WIPE DATA
              </ButtonOutline>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#ebebeb]">
              <div>
                <h4 className="font-display text-[15px] font-medium text-black">Delete Website</h4>
                <p className="font-display text-[13px] text-[#71717a]">
                  Completely remove this website from your account.
                </p>
              </div>
              <ButtonOutline type="button" onClick={handleDeleteWebsite}>
                DELETE WEBSITE
              </ButtonOutline>
            </div>
          </div>
        </PanelCard>
      </div>

      {/* Wipe Confirmation Modal */}
      <ModalCard
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        title="Confirm Data Wipe"
      >
        <p className="font-display text-[14px] leading-[22px] text-[#71717a] mb-6">
          Are you absolutely sure you want to wipe all recorded events and sessions for <strong className="text-black">{website.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <ButtonOutline type="button" onClick={() => setShowWipeModal(false)}>
            CANCEL
          </ButtonOutline>
          <ButtonPrimary type="button" onClick={handleWipeData} disabled={wiping}>
            {wiping ? 'WIPING...' : 'CONFIRM WIPE'}
          </ButtonPrimary>
        </div>
      </ModalCard>

      <Toast message={toastMsg} isVisible={!!toastMsg} onClose={() => setToastMsg('')} />
    </div>
  );
}
