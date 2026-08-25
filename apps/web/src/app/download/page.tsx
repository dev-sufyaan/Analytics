// apps/web/src/app/download/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  ArrowRight,
  Sparkles,
  QrCode,
  Radio,
  FileCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download Android App — Analytics by Sufyaan Studio',
  description:
    'Download the official high-performance Android APK for Analytics by Sufyaan Studio. Native 60fps charts, instant cold start, and zero-cost push notifications.',
  openGraph: {
    title: 'Download Android App — Analytics by Sufyaan Studio',
    description:
      'Native Android APK for real-time website analytics with instant cold start and offline caching.',
  },
};

export default function DownloadPage() {
  const apkDownloadUrl =
    'https://analytics-collect.sufyaanstudio.workers.dev/download/analytics-latest.apk';
  const sha256Checksum =
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

  return (
    <div className="min-h-screen bg-white text-[#000000] font-display selection:bg-[#c8f6f9]">
      {/* Top Navigation */}
      <header className="border-b border-[#ebebeb] sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full ring-2 ring-[#010120]" />
            <span className="font-display font-semibold text-[18px] tracking-tight text-[#010120]">
              analytics
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#71717a] hover:text-black transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/app"
              className="px-4 py-2 bg-[#010120] text-white text-[13px] font-mono uppercase tracking-wider rounded-[4px] hover:bg-[#26263a] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f1f5f9] border border-[#ebebeb]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                v1.0.0 · Universal Android APK
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#010120] leading-[1.1]">
              Your website analytics,{' '}
              <span className="bg-gradient-to-r from-[#fc4c02] via-[#ef2cc1] to-[#bdbbff] bg-clip-text text-transparent">
                native at 60fps.
              </span>
            </h1>

            <p className="text-[16px] sm:text-[18px] text-[#71717a] leading-relaxed max-w-xl">
              Experience instant cold start, persistent offline viewing, foreground-only auto-sync,
              and real-time visitor counters — distributed directly as an APK without Google Play bloat.
            </p>

            {/* Direct Download Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href={apkDownloadUrl}
                download="analytics-latest.apk"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#010120] text-white font-mono text-[14px] font-bold tracking-wider uppercase rounded-[4px] shadow-lg hover:bg-[#26263a] active:scale-[0.99] transition-all"
              >
                <span>Download APK</span>
                <span className="text-[12px] opacity-70 font-normal">(24.5 MB)</span>
              </a>

              <div className="text-[12px] text-[#71717a] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                <span>Android 10 through 15 · Arm64 & x86_64</span>
              </div>
            </div>

            {/* Features Checklist */}
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-[#ebebeb] text-[13px] text-[#313641]">
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-bold">✓</span>
                <span>Instant Cold Start (&lt; 50ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-bold">✓</span>
                <span>Hardware Keystore Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-bold">✓</span>
                <span>Zero Battery Drain Background</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-bold">✓</span>
                <span>In-App APK Self-Updating</span>
              </div>
            </div>
          </div>

          {/* Right Column: QR Code & Visual Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#010120] text-white rounded-[12px] p-8 border border-[#26263a] shadow-2xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#c8f6f9]">
                    SCAN TO INSTALL
                  </span>
                </div>

                {/* QR Code Mockup Canvas */}
                <div className="bg-white p-4 rounded-[8px] shadow-inner">
                  <svg
                    className="w-44 h-44"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Simplified geometric QR Pattern for styling */}
                    <rect x="5" y="5" width="30" height="30" rx="2" fill="#010120" />
                    <rect x="10" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="14" width="12" height="12" fill="#010120" />

                    <rect x="65" y="5" width="30" height="30" rx="2" fill="#010120" />
                    <rect x="70" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="74" y="14" width="12" height="12" fill="#010120" />

                    <rect x="5" y="65" width="30" height="30" rx="2" fill="#010120" />
                    <rect x="10" y="70" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="74" width="12" height="12" fill="#010120" />

                    {/* Data grid dots */}
                    <rect x="42" y="10" width="8" height="8" fill="#010120" />
                    <rect x="54" y="15" width="6" height="6" fill="#010120" />
                    <rect x="42" y="24" width="6" height="12" fill="#010120" />
                    <rect x="52" y="30" width="8" height="6" fill="#010120" />

                    <rect x="10" y="45" width="12" height="8" fill="#010120" />
                    <rect x="26" y="42" width="8" height="14" fill="#010120" />
                    <rect x="40" y="45" width="20" height="20" rx="2" fill="#0e7490" />
                    <circle cx="50" cy="55" r="4" fill="#c8f6f9" />

                    <rect x="68" y="42" width="10" height="8" fill="#010120" />
                    <rect x="82" y="45" width="8" height="12" fill="#010120" />
                    <rect x="68" y="56" width="18" height="6" fill="#010120" />

                    <rect x="42" y="70" width="14" height="8" fill="#010120" />
                    <rect x="60" y="68" width="8" height="10" fill="#010120" />
                    <rect x="72" y="74" width="14" height="12" fill="#010120" />
                    <rect x="46" y="82" width="12" height="8" fill="#010120" />
                  </svg>
                </div>

                <p className="text-[12px] text-[#999999] max-w-xs leading-normal">
                  Point your Android camera at the QR code to begin the direct APK download.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHA-256 Integrity Box */}
      <section className="py-10 bg-[#f8fafc] border-y border-[#ebebeb]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#71717a] block">
                BINARY INTEGRITY (SHA-256)
              </span>
              <code className="font-mono text-[12px] text-[#010120] bg-white px-2 py-1 rounded border border-[#ebebeb] mt-1 inline-block select-all">
                {sha256Checksum}
              </code>
            </div>
            <div className="text-[12px] text-[#71717a]">
              Built deterministically via GitHub Actions CNG
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Sideload Installation Guide */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#71717a]">
            INSTALLATION GUIDE
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-[#010120] mt-2">
            How to install the APK on Android
          </h2>
          <p className="text-[15px] text-[#71717a] mt-2">
            Because this app is distributed directly to avoid 3rd-party store tracking, follow these 3 quick steps:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-[8px] border border-[#ebebeb] shadow-sm relative">
            <div className="w-10 h-10 rounded-[4px] bg-[#c8f6f9] text-[#010120] font-mono font-bold flex items-center justify-center text-[16px] mb-6">
              01
            </div>
            <h3 className="font-bold text-[18px] text-[#010120] mb-2">Download APK</h3>
            <p className="text-[14px] text-[#71717a] leading-relaxed">
              Tap the download button above or scan the QR code to save <code className="text-[12px] bg-[#f1f5f9] px-1 py-0.5 rounded">analytics-latest.apk</code> to your device.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-8 rounded-[8px] border border-[#ebebeb] shadow-sm relative">
            <div className="w-10 h-10 rounded-[4px] bg-[#bdbbff] text-[#010120] font-mono font-bold flex items-center justify-center text-[16px] mb-6">
              02
            </div>
            <h3 className="font-bold text-[18px] text-[#010120] mb-2">Allow Unknown Apps</h3>
            <p className="text-[14px] text-[#71717a] leading-relaxed">
              If Android displays a security prompt, tap <strong>Settings</strong> and toggle on <strong>"Allow from this source"</strong> for Chrome or Files.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-8 rounded-[8px] border border-[#ebebeb] shadow-sm relative">
            <div className="w-10 h-10 rounded-[4px] bg-[#010120] text-white font-mono font-bold flex items-center justify-center text-[16px] mb-6">
              03
            </div>
            <h3 className="font-bold text-[18px] text-[#010120] mb-2">Install & Enjoy</h3>
            <p className="text-[14px] text-[#71717a] leading-relaxed">
              Tap <strong>Install</strong>. Open the app and log in with your email and password. Future updates will install in-place automatically!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ebebeb] py-12 px-6 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-[13px] text-[#71717a]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#c8f6f9] rounded-full" />
            <span className="font-medium text-[#010120]">Analytics by Sufyaan Studio</span>
          </div>
          <div>Distributed with $0 egress via Cloudflare R2</div>
        </div>
      </footer>
    </div>
  );
}
