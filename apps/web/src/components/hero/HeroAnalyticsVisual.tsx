'use client';

import React from 'react';
import { ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export function HeroAnalyticsVisual() {
  return (
    <div className="w-full max-w-[440px] relative select-none">
      {/* Subtle Ambient Backlight Glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-[#c8f6f9]/10 via-[#bdbbff]/5 to-transparent blur-2xl pointer-events-none" />

      {/* Minimal High-Class Card Surface */}
      <div className="relative rounded-xl bg-[#0a0a1a] border border-[#222238] p-6 shadow-2xl">
        
        {/* Card Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#1c1c2e]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Analytics"
              className="w-5 h-5 rounded-[4px] object-contain shrink-0"
            />
            <span className="font-display text-[15px] font-medium text-white tracking-tight">
              Realtime Overview
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#999999] bg-[#141426] px-2.5 py-1 rounded-[4px] border border-[#222238]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f6f9]" />
            <span>Live Feed</span>
          </div>
        </div>

        {/* Primary Metric Showcase */}
        <div className="pt-5 pb-2">
          <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
            Unique Visitors • 30 Days
          </div>
          <div className="flex items-baseline gap-3 mt-1.5">
            <span className="font-display text-[36px] font-medium text-white tracking-tight">
              48,290
            </span>
            <span className="inline-flex items-center gap-0.5 font-mono text-[12px] font-medium text-[#c8f6f9]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +14.8%
            </span>
          </div>
        </div>

        {/* Minimal High-Resolution SVG Area Chart */}
        <div className="w-full h-36 relative my-3">
          <svg
            viewBox="0 0 380 140"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Soft Gradient Fill */}
              <linearGradient id="minimalChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8f6f9" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#bdbbff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0" />
              </linearGradient>

              {/* Stroke Gradient */}
              <linearGradient id="minimalLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fc4c02" />
                <stop offset="40%" stopColor="#ef2cc1" />
                <stop offset="85%" stopColor="#bdbbff" />
                <stop offset="100%" stopColor="#c8f6f9" />
              </linearGradient>
            </defs>

            {/* Subtle Horizontal Reference Grid Lines */}
            <line x1="0" y1="30" x2="380" y2="30" stroke="#1c1c2e" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="75" x2="380" y2="75" stroke="#1c1c2e" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="380" y2="120" stroke="#1c1c2e" strokeWidth="1" />

            {/* Smooth Spline Area */}
            <path
              d="M 0,110 C 45,95 80,105 120,70 C 160,35 200,85 240,45 C 280,15 320,50 380,20 L 380,140 L 0,140 Z"
              fill="url(#minimalChartGrad)"
            />

            {/* Crisp Top Stroke Line */}
            <path
              d="M 0,110 C 45,95 80,105 120,70 C 160,35 200,85 240,45 C 280,15 320,50 380,20"
              fill="none"
              stroke="url(#minimalLineGrad)"
              strokeWidth="2"
            />

            {/* Focused Endpoint Marker */}
            <circle cx="380" cy="20" r="3.5" fill="#c8f6f9" />
            <circle cx="380" cy="20" r="7" fill="#c8f6f9" opacity="0.25" />
          </svg>
        </div>

        {/* Bottom Key Metric Strips */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1c1c2e]">
          <div className="bg-[#121224] border border-[#202034] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#71717a] font-mono text-[10px] uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-[#c8f6f9]" />
              <span>Cookies Used</span>
            </div>
            <div className="font-display text-[15px] font-medium text-white mt-1">
              0 (100% Exempt)
            </div>
          </div>

          <div className="bg-[#121224] border border-[#202034] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#71717a] font-mono text-[10px] uppercase tracking-wider">
              <Zap className="w-3 h-3 text-[#bdbbff]" />
              <span>Script Footprint</span>
            </div>
            <div className="font-display text-[15px] font-medium text-white mt-1">
              1.15 KB Gzipped
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
