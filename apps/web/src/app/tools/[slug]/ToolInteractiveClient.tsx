'use client';

import React, { useState } from 'react';
import { Copy, Check, Sparkles, Shield, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ButtonPrimary, ButtonSecondaryMint, TextInput } from '@analytics/ui';

export function Ga4CalculatorClient() {
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(50000);

  const ga4SizeKb = 45;
  const analyticsSizeKb = 1.15;
  const savingsPerVisitorKb = ga4SizeKb - analyticsSizeKb;

  const totalSavingsMb = ((savingsPerVisitorKb * monthlyVisitors) / 1024).toFixed(1);
  const totalSavingsGb = (Number(totalSavingsMb) / 1024).toFixed(2);
  const cpuHoursSaved = ((monthlyVisitors * 120) / (1000 * 3600)).toFixed(1);

  return (
    <div className="my-8 p-6 sm:p-8 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] shadow-xs">
      <div className="max-w-xl mb-6">
        <label className="font-mono text-[12px] uppercase text-[#71717a] font-medium block mb-2">
          ESTIMATED MONTHLY VISITORS: <span className="text-black font-bold font-display text-[16px]">{monthlyVisitors.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min="1000"
          max="1000000"
          step="5000"
          value={monthlyVisitors}
          onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
          className="w-full h-2 bg-[#ebebeb] rounded-lg appearance-none cursor-pointer accent-black"
        />
        <div className="flex justify-between text-[11px] font-mono text-[#999999] mt-1">
          <span>1,000</span>
          <span>250,000</span>
          <span>500,000</span>
          <span>1,000,000+</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#ebebeb]">
        <div className="p-4 bg-white border border-[#ebebeb] rounded-[4px]">
          <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">BANDWIDTH SAVED</span>
          <div className="font-display text-[26px] font-medium text-emerald-600">
            {Number(totalSavingsGb) > 1 ? `${totalSavingsGb} GB` : `${totalSavingsMb} MB`}
          </div>
          <span className="font-display text-[12px] text-[#71717a]">per month saved</span>
        </div>

        <div className="p-4 bg-white border border-[#ebebeb] rounded-[4px]">
          <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">CPU TIME SAVED</span>
          <div className="font-display text-[26px] font-medium text-black">
            {cpuHoursSaved} Hours
          </div>
          <span className="font-display text-[12px] text-[#71717a]">main-thread execution</span>
        </div>

        <div className="p-4 bg-white border border-[#ebebeb] rounded-[4px]">
          <span className="font-mono text-[10px] uppercase text-[#71717a] block mb-1">LIGHTHOUSE GAIN</span>
          <div className="font-display text-[26px] font-medium text-[#fc4c02]">
            +4 to +8 Pts
          </div>
          <span className="font-display text-[12px] text-[#71717a]">mobile Core Web Vitals</span>
        </div>
      </div>
    </div>
  );
}

export function UtmBuilderClient() {
  const [baseUrl, setBaseUrl] = useState('https://yourdomain.com/pricing');
  const [source, setSource] = useState('twitter');
  const [medium, setMedium] = useState('social');
  const [campaign, setCampaign] = useState('summer_launch');
  const [content, setContent] = useState('header_cta');
  const [term, setTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const cleanBase = baseUrl.trim() || 'https://yourdomain.com';
  const params = new URLSearchParams();
  if (source.trim()) params.set('utm_source', source.trim().toLowerCase());
  if (medium.trim()) params.set('utm_medium', medium.trim().toLowerCase());
  if (campaign.trim()) params.set('utm_campaign', campaign.trim().toLowerCase());
  if (content.trim()) params.set('utm_content', content.trim().toLowerCase());
  if (term.trim()) params.set('utm_term', term.trim().toLowerCase());

  const queryString = params.toString();
  const fullUrl = queryString ? `${cleanBase}${cleanBase.includes('?') ? '&' : '?'}${queryString}` : cleanBase;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-8 p-6 sm:p-8 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] shadow-xs space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="WEBSITE URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        <TextInput label="CAMPAIGN SOURCE (utm_source)" value={source} onChange={(e) => setSource(e.target.value)} />
        <TextInput label="CAMPAIGN MEDIUM (utm_medium)" value={medium} onChange={(e) => setMedium(e.target.value)} />
        <TextInput label="CAMPAIGN NAME (utm_campaign)" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        <TextInput label="CAMPAIGN CONTENT (optional)" value={content} onChange={(e) => setContent(e.target.value)} />
        <TextInput label="CAMPAIGN TERM (optional keyword)" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>

      <div className="p-4 bg-white border border-[#ebebeb] rounded-[4px] space-y-2">
        <span className="font-mono text-[11px] uppercase text-[#71717a] block font-medium">
          GENERATED CAMPAIGN URL
        </span>
        <div className="flex items-center justify-between gap-3 bg-[#f7f7f7] p-3 rounded-[3px] border border-[#ebebeb] font-mono text-[13px] break-all">
          <span>{fullUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-black text-white rounded-[3px] font-mono text-[11px] uppercase shrink-0 flex items-center gap-1 hover:bg-[#26263a] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GdprCheckerClient() {
  const [usesCookies, setUsesCookies] = useState<boolean>(false);
  const [usesThirdPartyPixels, setUsesThirdPartyPixels] = useState<boolean>(false);
  const [storesRawIps, setStoresRawIps] = useState<boolean>(false);
  const [tracksCrossSite, setTracksCrossSite] = useState<boolean>(false);

  const isExempt = !usesCookies && !usesThirdPartyPixels && !storesRawIps && !tracksCrossSite;

  return (
    <div className="my-8 p-6 sm:p-8 bg-[#fafafa] border border-[#ebebeb] rounded-[4px] shadow-xs space-y-6">
      <h3 className="font-display text-[20px] font-medium text-black">
        Answer 4 Questions About Your Website Stack:
      </h3>

      <div className="space-y-4 font-display text-[15px]">
        <label className="flex items-center justify-between p-4 bg-white border border-[#ebebeb] rounded-[4px] cursor-pointer">
          <span>Does your website place non-essential tracking cookies on visitor devices?</span>
          <input
            type="checkbox"
            checked={usesCookies}
            onChange={(e) => setUsesCookies(e.target.checked)}
            className="w-5 h-5 accent-black cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-white border border-[#ebebeb] rounded-[4px] cursor-pointer">
          <span>Do you load advertising pixels (Meta Pixel, Google Ads remarketing, TikTok pixel)?</span>
          <input
            type="checkbox"
            checked={usesThirdPartyPixels}
            onChange={(e) => setUsesThirdPartyPixels(e.target.checked)}
            className="w-5 h-5 accent-black cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-white border border-[#ebebeb] rounded-[4px] cursor-pointer">
          <span>Do you store raw, unmasked client IP addresses in your logs or analytics database?</span>
          <input
            type="checkbox"
            checked={storesRawIps}
            onChange={(e) => setStoresRawIps(e.target.checked)}
            className="w-5 h-5 accent-black cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-white border border-[#ebebeb] rounded-[4px] cursor-pointer">
          <span>Do you track individual visitor profiles across different external websites?</span>
          <input
            type="checkbox"
            checked={tracksCrossSite}
            onChange={(e) => setTracksCrossSite(e.target.checked)}
            className="w-5 h-5 accent-black cursor-pointer"
          />
        </label>
      </div>

      <div className={`p-6 rounded-[4px] border ${isExempt ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
        <div className="flex items-center gap-3 mb-2">
          {isExempt ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-amber-600" />}
          <h4 className="font-display text-[20px] font-medium">
            {isExempt ? '100% Exempt from Cookie Consent Banners' : 'Cookie Consent Banner Legally Required'}
          </h4>
        </div>
        <p className="font-display text-[14px] leading-[22px]">
          {isExempt
            ? 'Congratulations! Because your stack uses zero non-essential cookies, no advertising pixels, and drops raw IP addresses at the edge, you are exempt from GDPR and ePrivacy consent banner mandates.'
            : 'Because your website uses persistent tracking cookies, advertising pixels, or stores raw IP addresses, you are legally required to display an opt-in consent banner under GDPR and ePrivacy regulations. Switching to Analytics by Sufyaan Studio allows you to achieve 100% exemption.'}
        </p>
      </div>
    </div>
  );
}
