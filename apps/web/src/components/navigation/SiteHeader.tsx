'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Sparkles, Layers, Shield, Wrench, Code, BookOpen } from 'lucide-react';
import { ButtonSecondaryMint } from '@analytics/ui';

interface SiteHeaderProps {
  forceDark?: boolean;
  forceLight?: boolean;
}

export function SiteHeader({ forceDark = false, forceLight = false }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (forceLight) {
      setIsScrolled(true);
      return;
    }
    if (forceDark) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceDark, forceLight]);

  // Auto-close menu when navigating to a new route
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [mobileMenuOpen]);

  // Determine dark or light mode for the bar
  const isDark = forceDark || (!isScrolled && !forceLight && pathname === '/') || mobileMenuOpen;

  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Alternatives', href: '/alternatives' },
    { name: 'Integrations', href: '/integrations' },
    { name: 'Tools', href: '/tools' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
  ];

  return (
    <header
      className={`w-full sticky top-0 z-[100] transition-colors duration-300 border-b ${
        isDark
          ? 'bg-[#010120] text-white border-[#26263a]'
          : 'bg-white text-black border-[#ebebeb]'
      }`}
    >
      {/* Top Navbar Row */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between relative z-[101]">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-[20px] font-medium tracking-tight"
        >
          <img src="/logo.png" alt="Analytics by Sufyaan Studio Logo" className="w-6 h-6 rounded-[4px] object-contain shrink-0" />
          <span className={isDark ? 'text-white' : 'text-black'}>analytics</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 font-display text-[15px]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isDark
                    ? isActive
                      ? 'text-white font-medium'
                      : 'text-[#999999] hover:text-white'
                    : isActive
                    ? 'text-black font-medium'
                    : 'text-[#71717a] hover:text-black'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <span
              className={`font-display text-[14px] font-medium transition-colors ${
                isDark ? 'text-white hover:text-white/80' : 'text-black hover:text-black/70'
              }`}
            >
              Sign in
            </span>
          </Link>
          <Link href="/login">
            <button className="h-9 px-4 rounded-[4px] font-mono text-[12px] uppercase font-medium bg-[#c8f6f9] text-black hover:bg-[#b0f0f4] transition-colors cursor-pointer">
              GET STARTED
            </button>
          </Link>
        </div>

        {/* Mobile Header Actions (Sign in + Animated Hamburger) */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/login">
            <span
              className={`font-display text-[13px] font-medium ${
                isDark ? 'text-white/90' : 'text-black/90'
              }`}
            >
              Sign in
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className={`w-9 h-9 flex flex-col items-center justify-center rounded-[4px] transition-colors focus:outline-none cursor-pointer ${
              isDark
                ? 'text-white hover:bg-[#26263a]'
                : 'text-black hover:bg-[#f0f0f0]'
            }`}
          >
            {/* Animated 3-line / 2-line Hamburger to X */}
            <span
              className={`block w-5 h-0.5 rounded-full transition-all duration-300 ease-in-out ${
                isDark ? 'bg-white' : 'bg-black'
              } ${mobileMenuOpen ? 'rotate-45 translate-y-[3px]' : '-translate-y-1'}`}
            />
            <span
              className={`block w-5 h-0.5 rounded-full transition-all duration-300 ease-in-out ${
                isDark ? 'bg-white' : 'bg-black'
              } ${mobileMenuOpen ? '-rotate-45 -translate-y-[3px]' : 'translate-y-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Fluid Animated Mobile Navigation Drawer */}
      <div
        className={`md:hidden grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden bg-[#010120] text-white border-t border-[#26263a] shadow-2xl">
          <div className="max-h-[calc(100dvh-64px)] overflow-y-auto px-5 py-6 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#26263a]">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#999999]">
                  NAVIGATION
                </span>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[2px] bg-[#26263a] text-[#c8f6f9] font-medium">
                  100% COOKIE FREE
                </span>
              </div>

              {/* Main Nav Links */}
              <nav className="flex flex-col space-y-1.5">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-[4px] font-display text-[16px] transition-colors ${
                        isActive
                          ? 'bg-[#26263a] text-white font-medium'
                          : 'text-zinc-300 hover:bg-[#1a1a30] hover:text-white'
                      }`}
                    >
                      <span>{link.name}</span>
                      <ArrowRight className="w-4 h-4 opacity-40" />
                    </Link>
                  );
                })}
              </nav>

              {/* Quick Tools & Guides Grid */}
              <div className="pt-4 border-t border-[#26263a] space-y-2.5">
                <span className="font-mono text-[11px] uppercase text-[#71717a] block mb-2 font-medium">
                  DEVELOPER TOOLS & GUIDES
                </span>
                <div className="grid grid-cols-2 gap-2 font-display text-[13px]">
                  <Link
                    href="/tools/ga4-speed-calculator"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 bg-[#151538] border border-[#26263a] rounded-[4px] text-zinc-300 hover:text-white transition-colors"
                  >
                    GA4 Calculator
                  </Link>
                  <Link
                    href="/tools/utm-campaign-builder"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 bg-[#151538] border border-[#26263a] rounded-[4px] text-zinc-300 hover:text-white transition-colors"
                  >
                    UTM Builder
                  </Link>
                  <Link
                    href="/privacy-first-analytics"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 bg-[#151538] border border-[#26263a] rounded-[4px] text-zinc-300 hover:text-white transition-colors"
                  >
                    Privacy Pillar
                  </Link>
                  <Link
                    href="/how-to"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 bg-[#151538] border border-[#26263a] rounded-[4px] text-zinc-300 hover:text-white transition-colors"
                  >
                    How-To Guides
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#26263a] space-y-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                <ButtonSecondaryMint className="w-full justify-center h-11 text-[13px]">
                  GET STARTED FREE ($0)
                </ButtonSecondaryMint>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2.5 text-center font-display text-[14px] text-zinc-400 hover:text-white transition-colors"
              >
                Already have an account? Sign in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
