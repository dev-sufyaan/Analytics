'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  QrCode,
  Radio,
  FileCheck,
  Lock,
  BatteryCharging,
  RefreshCw,
  Eye,
  Sliders,
  ExternalLink,
  ChevronDown,
  Layers,
  Terminal,
} from 'lucide-react';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Footer, FooterWordmarkBanner, LiveDot } from '@analytics/ui';
import { SITE_CONFIG } from '@/lib/seo/seo-config';

export function DownloadClient() {
  const [copiedSha, setCopiedSha] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const sha256Checksum = SITE_CONFIG.androidApp.sha256;
  const apkDownloadUrl = SITE_CONFIG.androidApp.directApkPath;

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(sha256Checksum);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2500);
  };

  // Simple direct download — APK is now a static asset at /download/analytics-latest.apk (no R2/proxy).
  // Native <a download> handles the binary streaming directly via Cloudflare ASSETS.
  const handleDownloadClick = () => {
    setDownloadError(null);
    setIsDownloading(true);
    setTimeout(() => setIsDownloading(false), 3000);
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-[#fc4c02]" />,
      title: 'Native 60fps Charts',
      desc: 'Silky smooth uPlot and Skia-grade native rendering on mobile screens. Zoom, pan, and inspect daily traffic spikes without browser lag.',
    },
    {
      icon: <Radio className="w-5 h-5 text-[#10b981]" />,
      title: 'Instant Cold Start (< 50ms)',
      desc: 'Pre-compiled Hermes bytecode with persistent local SWR caching. The dashboard opens instantly even when offline or on spotty cellular networks.',
    },
    {
      icon: <Lock className="w-5 h-5 text-[#bdbbff]" />,
      title: 'Hardware Keystore Biometrics',
      desc: 'Authenticate instantly via Fingerprint or Face Unlock. Session tokens are encrypted using hardware-backed Android Keystore enclave.',
    },
    {
      icon: <BatteryCharging className="w-5 h-5 text-[#06b6d4]" />,
      title: 'Zero Background Battery Drain',
      desc: 'Syncs traffic data strictly when the app is in the foreground. No silent background polling, wake locks, or unneeded battery consumption.',
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-[#8b5cf6]" />,
      title: 'In-App APK Self-Updating',
      desc: 'Automatic release checking on startup. Update to newer versions with one tap directly in the app without visiting app stores.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#10b981]" />,
      title: 'Zero 3rd-Party Store Tracking',
      desc: 'Distributed directly as an APK to bypass Google Play store telemetry, advertising ID association, and mandatory store bloatware.',
    },
  ];

  const faqs = [
    {
      q: 'Why is the app available only as an APK download on the official website?',
      a: 'We distribute the Android app directly as a universal signed APK to ensure 100% user privacy and independence. By bypassing Google Play, we eliminate mandatory Google Play Services telemetry, advertising ID tracking, store-level metadata collection, and forced review delays for critical security patches.',
    },
    {
      q: 'Is it safe to install this APK on my Android phone?',
      a: 'Yes, 100%. Our Android APK is cryptographically signed and built deterministically. You can independently verify the binary integrity by matching its SHA-256 hash against the checksum published on this page.',
    },
    {
      q: 'How will I receive future updates if not from Google Play?',
      a: 'The app contains a built-in release checker that connects directly to our releases bucket. When a new version is released, the app notifies you in Settings and lets you download and install the update in-place with a single tap.',
    },
    {
      q: 'Which Android devices and versions are supported?',
      a: 'The APK is a universal build that supports Android 10 through Android 15 (API levels 29 to 35) across ARM64 (arm64-v8a), ARM32 (armeabi-v7a), and x86_64 processor architectures.',
    },
    {
      q: 'Does the mobile app support multiple websites and dark mode?',
      a: 'Yes! You can switch between all your tracked websites with one tap, view live realtime visitors, filter by date ranges, inspect custom events, and enjoy an adaptive dark/light interface designed to match your system theme.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-display selection:bg-[#c8f6f9]">
      <SiteHeader />

      {/* Hero Section — Dark High-Impact Band */}
      <section className="bg-[#010120] text-white pt-16 pb-20 px-4 md:px-8 border-b border-[#26263a] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-[#ef2cc1]/15 to-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-[#c8f6f9]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Title & CTA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[#26263a] border border-[#3a3a54]">
                  <LiveDot />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#c8f6f9]">
                    OFFICIAL ANDROID RELEASE
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-white text-black font-mono text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-[#fc4c02]" />
                  <span>v2.1.0 · UNIVERSAL SIGNED APK</span>
                </div>
              </div>

              <h1 className="font-display text-[40px] sm:text-[54px] lg:text-[62px] font-medium leading-[1.08] tracking-[-1.8px] text-white">
                Your website analytics,{' '}
                <span className="bg-gradient-to-r from-[#fc4c02] via-[#ef2cc1] to-[#bdbbff] bg-clip-text text-transparent">
                  native at 60fps.
                </span>
              </h1>

              <p className="font-display text-[16px] sm:text-[18px] text-[#999999] leading-relaxed max-w-xl">
                Monitor live concurrent visitors, pageviews, referrers, custom conversions, and traffic spike alerts directly from your pocket — distributed exclusively via our official website for uncompromising privacy.
              </p>

              {/* Direct Download Action Row */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href={apkDownloadUrl}
                  download="analytics-latest.apk"
                  onClick={handleDownloadClick}
                  aria-busy={isDownloading}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#c8f6f9] text-[#010120] font-mono text-[13px] font-bold tracking-wider uppercase rounded-[4px] hover:bg-[#b0f0f4] active:scale-[0.99] transition-all shadow-lg cursor-pointer disabled:opacity-60"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-pulse' : ''}`} />
                  <span>{isDownloading ? 'STARTING DOWNLOAD...' : 'DOWNLOAD OFFICIAL APK'}</span>
                  <span className="text-[11px] opacity-75 font-mono font-normal">({SITE_CONFIG.androidApp.fileSize})</span>
                </a>

                <a
                  href="#install-guide"
                  className="inline-flex items-center justify-center gap-2 px-5 py-4 bg-[#151538] text-white border border-[#26263a] font-mono text-[13px] font-medium uppercase rounded-[4px] hover:bg-[#202048] transition-colors"
                >
                  <span>INSTALL GUIDE</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Compatibility Pill & Assurance */}
              <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#999999] pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span>Android 10 through 15 (ARM64 & x86_64)</span>
                </div>
                <span className="text-[#3a3a54]">•</span>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#c8f6f9]" />
                  <span>100% Free & Open Ecosystem</span>
                </div>
              </div>
              {downloadError && (
                <p className="font-mono text-[12px] text-[#f87171] bg-[#1e1e38] border border-[#3a3a54] px-3 py-2 rounded-[4px] mt-2">
                  {downloadError}
                </p>
              )}
            </div>

            {/* Right Column: QR Code & Visual Badge Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-[#151538]/90 backdrop-blur-md rounded-[8px] p-6 border border-[#26263a] shadow-2xl space-y-5 text-center">
                <div className="flex items-center justify-between pb-3 border-b border-[#26263a]">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#c8f6f9] flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>SCAN TO INSTALL</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#999999] uppercase bg-[#26263a] px-2 py-0.5 rounded-[2px]">
                    DIRECT URL
                  </span>
                </div>

                {/* Scannable High-Precision QR Code */}
                <div className="bg-white p-3.5 rounded-[6px] shadow-inner inline-block mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/qr-code-direct-download.png"
                    alt="Scan QR Code to Download Analytics Android APK"
                    width={176}
                    height={176}
                    className="w-44 h-44 mx-auto rounded-[2px] object-contain"
                  />
                </div>



                <p className="font-display text-[13px] text-[#999999] leading-snug">
                  Point your Android camera at the QR code to begin the direct download immediately.
                </p>

                <div className="pt-2 border-t border-[#26263a] flex items-center justify-between text-[11px] font-mono text-[#71717a]">
                  <span>PACKAGE: studio.sufyaan.analytics</span>
                  <span className="text-[#c8f6f9]">BUILD v2.1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cryptographic Binary Integrity Box */}
      <section className="py-10 bg-[#f8fafc] border-b border-[#ebebeb]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="bg-white border border-[#ebebeb] rounded-[6px] p-5 md:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#10b981]" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#71717a]">
                  BINARY INTEGRITY (SHA-256 CHECKSUM)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="font-mono text-[12px] sm:text-[13px] text-[#010120] bg-[#f1f5f9] px-3 py-1.5 rounded-[4px] border border-[#e2e8f0] select-all break-all">
                  {sha256Checksum}
                </code>
                <button
                  type="button"
                  onClick={handleCopyChecksum}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#010120] text-white hover:bg-[#26263a] font-mono text-[11px] uppercase font-medium transition-colors cursor-pointer"
                >
                  {copiedSha ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>COPY SHA-256</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-[13px] text-[#71717a] font-display border-t lg:border-t-0 pt-4 lg:pt-0 border-[#ebebeb]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                <span>Signed with Production Keystore</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span>Zero Malware & Zero Telemetry</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-20 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            MOBILE ENGINE ARCHITECTURE
          </span>
          <h2 className="font-display text-[34px] md:text-[42px] font-medium tracking-[-0.8px] text-black">
            Built from scratch for mobile performance.
          </h2>
          <p className="font-display text-[16px] text-[#71717a] mt-3">
            Not an embedded web view. A high-performance native application engineered with modern React Native, Hermes Engine, and hardware security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-6 bg-[#fafafa] border border-[#ebebeb] rounded-[6px] hover:border-black transition-colors space-y-3"
            >
              <div className="w-10 h-10 rounded-[4px] bg-white border border-[#ebebeb] flex items-center justify-center shadow-xs">
                {item.icon}
              </div>
              <h3 className="font-display text-[18px] font-medium text-black">{item.title}</h3>
              <p className="font-display text-[14px] text-[#71717a] leading-[22px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Sideloading 3-Step Guide */}
      <section id="install-guide" className="py-20 bg-[#fafafa] border-y border-[#ebebeb]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              INSTALLATION INSTRUCTIONS
            </span>
            <h2 className="font-display text-[34px] md:text-[42px] font-medium tracking-[-0.8px] text-black">
              How to install the APK on Android
            </h2>
            <p className="font-display text-[16px] text-[#71717a] mt-3">
              Because this app is distributed directly to eliminate store tracking, follow these 3 quick steps on your Android device:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-[6px] border border-[#ebebeb] shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="w-10 h-10 rounded-[4px] bg-[#c8f6f9] text-[#010120] font-mono font-bold flex items-center justify-center text-[16px] mb-6">
                  01
                </div>
                <h3 className="font-display text-[20px] font-medium text-black mb-2">Download APK</h3>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px]">
                  Tap the download button above or scan the QR code to save <code className="font-mono text-[12px] bg-[#f1f5f9] px-1.5 py-0.5 rounded text-black">analytics-latest.apk</code> to your device storage.
                </p>
              </div>
              <div className="p-3 bg-[#f8fafc] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] text-[#71717a]">
                File size: 76.0 MB · Universal Android binary
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-[6px] border border-[#ebebeb] shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="w-10 h-10 rounded-[4px] bg-[#bdbbff] text-[#010120] font-mono font-bold flex items-center justify-center text-[16px] mb-6">
                  02
                </div>
                <h3 className="font-display text-[20px] font-medium text-black mb-2">Allow Unknown Apps</h3>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px]">
                  If Android displays a security prompt, tap <strong>Settings</strong> and toggle on <strong>"Allow from this source"</strong> for Chrome, Brave, or your Files app.
                </p>
              </div>
              <div className="p-3 bg-[#f8fafc] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] text-[#71717a]">
                Standard Android permission for direct APK releases
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-[6px] border border-[#ebebeb] shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="w-10 h-10 rounded-[4px] bg-[#010120] text-white font-mono font-bold flex items-center justify-center text-[16px] mb-6">
                  03
                </div>
                <h3 className="font-display text-[20px] font-medium text-black mb-2">Install & Auto-Sync</h3>
                <p className="font-display text-[14px] text-[#71717a] leading-[22px]">
                  Tap <strong>Install</strong>. Launch the app and log in with your account credentials. All future updates install automatically in-place from within the app!
                </p>
              </div>
              <div className="p-3 bg-[#f8fafc] border border-[#ebebeb] rounded-[4px] font-mono text-[11px] text-[#71717a]">
                Includes built-in self-updater in Settings
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications Table */}
      <section className="py-20 max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
            SPECIFICATION SHEET
          </span>
          <h2 className="font-display text-[34px] md:text-[40px] font-medium tracking-[-0.8px] text-black">
            Technical Release Specifications
          </h2>
        </div>

        <div className="border border-[#ebebeb] rounded-[6px] overflow-x-auto shadow-xs bg-white">
          <table className="w-full text-left text-[14px] font-display">
            <thead className="bg-[#f7f7f7] border-b border-[#ebebeb] font-mono text-[11px] uppercase text-[#71717a]">
              <tr>
                <th className="p-4">Attribute</th>
                <th className="p-4">Official Value</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              <tr>
                <td className="p-4 font-medium">Application Name</td>
                <td className="p-4 font-mono text-[13px]">Analytics for Android</td>
                <td className="p-4 text-[#71717a]">Official client for Analytics by Sufyaan Studio</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Package Identifier</td>
                <td className="p-4 font-mono text-[13px] text-[#010120] font-medium">studio.sufyaan.analytics</td>
                <td className="p-4 text-[#71717a]">Unique Android package name</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Current Version</td>
                <td className="p-4 font-mono text-[13px]">2.1.0 (versionCode 5)</td>
                <td className="p-4 text-[#71717a]">Icon fix + direct R2 download</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Minimum Android Version</td>
                <td className="p-4 font-mono text-[13px]">Android 10.0 (API Level 29)</td>
                <td className="p-4 text-[#71717a]">Tested through Android 15 (API 35)</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Supported Architectures</td>
                <td className="p-4 font-mono text-[13px]">arm64-v8a, armeabi-v7a, x86_64</td>
                <td className="p-4 text-[#71717a]">Universal APK containing all native ABIs</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Binary Size</td>
                <td className="p-4 font-mono text-[13px]">76.0 MB (79,653,307 bytes)</td>
                <td className="p-4 text-[#71717a]">Includes standalone Hermes engine & Skia assets</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Distribution Channel</td>
                <td className="p-4 font-mono text-[13px]">Direct Website APK (/download)</td>
                <td className="p-4 text-[#71717a]">Exclusively available on official website</td>
              </tr>
              <tr>
                <td className="p-4 font-medium">Data Storage Security</td>
                <td className="p-4 font-mono text-[13px]">Android Keystore + EncryptedStorage</td>
                <td className="p-4 text-[#71717a]">Hardware-isolated cryptographic keys</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 bg-[#fafafa] border-t border-[#ebebeb]">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] block mb-2">
              HELP & SUPPORT
            </span>
            <h3 className="font-display text-[28px] md:text-[34px] font-medium tracking-[-0.6px] text-black">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#ebebeb] rounded-[4px] overflow-hidden bg-white transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#fafafa]"
                  >
                    <span className="font-display text-[16px] font-medium text-black">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#71717a] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 font-display text-[14px] leading-[22px] text-[#71717a] border-t border-[#ebebeb] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 max-w-[1280px] mx-auto px-4 md:px-8 w-full">
        <div className="bg-[#010120] text-white rounded-[6px] p-8 md:p-12 text-center border border-[#26263a]">
          <h3 className="font-display text-[28px] md:text-[36px] font-medium tracking-[-0.8px] mb-4">
            Download the official Android app today.
          </h3>
          <p className="font-display text-[15px] text-[#999999] max-w-lg mx-auto mb-8">
            Experience high-performance, cookie-free web analytics directly on your phone with zero Google Play bloat.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={apkDownloadUrl}
              download="analytics-latest.apk"
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c8f6f9] text-[#010120] font-mono text-[13px] font-bold uppercase rounded-[4px] hover:bg-[#b0f0f4] transition-colors"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-pulse' : ''}`} />
              <span>{isDownloading ? 'STARTING DOWNLOAD...' : 'DOWNLOAD APK (76.0 MB)'}</span>
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#151538] text-white border border-[#26263a] font-mono text-[13px] font-medium uppercase rounded-[4px] hover:bg-[#202048] transition-colors"
            >
              <span>VIEW DOCUMENTATION</span>
            </Link>
          </div>
          {downloadError && (
            <p className="font-mono text-[12px] text-[#f87171] text-center mt-3">{downloadError}</p>
          )}
        </div>
      </section>

      <Footer />
      <FooterWordmarkBanner />
    </div>
  );
}
