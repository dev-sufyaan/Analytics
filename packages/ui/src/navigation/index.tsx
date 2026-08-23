'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// 1. Marketing NavBar
export interface NavBarProps {
  children?: React.ReactNode;
  isScrolled?: boolean;
  className?: string;
}

export function NavBar({ children, isScrolled, className }: NavBarProps) {
  return (
    <header
      className={cn(
        'w-full sticky top-0 z-40 transition-colors duration-200 border-b',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md text-black border-[#ebebeb]'
          : 'bg-[#010120] text-white border-[#26263a]',
        className
      )}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {children}
      </div>
    </header>
  );
}

// 2. NavLink
export interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  onDark?: boolean;
}

export function NavLink({ active, onDark, children, className, ...props }: NavLinkProps) {
  return (
    <a
      className={cn(
        'font-display text-[15px] font-normal transition-colors cursor-pointer',
        onDark
          ? active
            ? 'text-white font-medium'
            : 'text-[#999999] hover:text-white'
          : active
          ? 'text-black font-medium'
          : 'text-[#71717a] hover:text-black',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// 3. AppSidebar (240px canvas-dark, pinned on desktop)
export interface AppSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AppSidebar({ children, className, ...props }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'w-60 min-w-[240px] bg-[#010120] text-white border-r border-[#26263a] flex flex-col justify-between p-4 h-full shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

// 4. AppSidebarRow
export interface AppSidebarRowProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppSidebarRow({ active, icon, children, className, ...props }: AppSidebarRowProps) {
  return (
    <a
      className={cn(
        'flex items-center gap-3 px-3.5 py-2.5 rounded-[4px] font-display text-[14px] transition-all cursor-pointer relative select-none',
        active
          ? 'bg-[#313641] text-white font-medium before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-white before:rounded-r'
          : 'text-[#999999] hover:text-white hover:bg-[#26263a]/50',
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center text-current">{icon}</span>}
      <span className="truncate">{children}</span>
    </a>
  );
}

// 5. Footer (4-col, mono eyebrows, body links)
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('w-full bg-white border-t border-[#ebebeb] py-16 md:py-20', className)}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div>
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] block mb-4">
              PRODUCT
            </span>
            <ul className="space-y-2.5 font-display text-[14px] text-[#71717a]">
              <li><a href="/" className="hover:text-black transition-colors">Overview</a></li>
              <li><a href="/pricing" className="hover:text-black transition-colors">Pricing</a></li>
              <li><a href="/docs" className="hover:text-black transition-colors">Documentation</a></li>
              <li><a href="/design" className="hover:text-black transition-colors">Design System</a></li>
            </ul>
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] block mb-4">
              INTEGRATIONS
            </span>
            <ul className="space-y-2.5 font-display text-[14px] text-[#71717a]">
              <li><a href="/docs#nextjs" className="hover:text-black transition-colors">Next.js</a></li>
              <li><a href="/docs#react" className="hover:text-black transition-colors">React / Vite</a></li>
              <li><a href="/docs#vue" className="hover:text-black transition-colors">Vue / Nuxt</a></li>
              <li><a href="/docs#svelte" className="hover:text-black transition-colors">SvelteKit</a></li>
              <li><a href="/docs#astro" className="hover:text-black transition-colors">Astro</a></li>
              <li><a href="/docs#wordpress" className="hover:text-black transition-colors">WordPress / CMS</a></li>
            </ul>
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] block mb-4">
              PRIVACY
            </span>
            <ul className="space-y-2.5 font-display text-[14px] text-[#71717a]">
              <li><span className="text-[#71717a]">No Cookies</span></li>
              <li><span className="text-[#71717a]">No IP Storage</span></li>
              <li><span className="text-[#71717a]">Daily Salted Hashes</span></li>
              <li><span className="text-[#71717a]">GDPR / CCPA Compliant</span></li>
            </ul>
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] block mb-4">
              PROJECT
            </span>
            <ul className="space-y-2.5 font-display text-[14px] text-[#71717a]">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">GitHub</a></li>
              <li><a href="/login" className="hover:text-black transition-colors">Sign In</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#ebebeb] flex flex-col md:flex-row items-center justify-between text-[#71717a] font-display text-[13px] gap-4">
          <p>© {new Date().getFullYear()} Analytics by Sufyaan Studio. Privacy-first, open architecture.</p>
          <div className="flex items-center gap-6">
            <a href="/docs" className="hover:text-black transition-colors">Docs</a>
            <a href="/pricing" className="hover:text-black transition-colors">Pricing</a>
            <a href="/login" className="hover:text-black transition-colors">Login</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// 6. FooterWordmarkBanner (giant lowercase product name)
export function FooterWordmarkBanner({ name = 'analytics' }: { name?: string }) {
  return (
    <div className="w-full bg-[#010120] text-[#131338] select-none pointer-events-none overflow-hidden py-6 text-center border-t border-[#26263a]">
      <span className="font-display text-[72px] md:text-[140px] lg:text-[180px] font-medium leading-none tracking-[-0.04em] lowercase block text-[#15153c]">
        {name}
      </span>
    </div>
  );
}
