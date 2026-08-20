'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@aether/db/client';
import { Website } from '@aether/db/types';
import {
  AppSidebar,
  AppSidebarRow,
} from '@aether/ui';
import {
  BarChart3,
  FileText,
  Compass,
  Globe,
  Smartphone,
  Zap,
  Radio,
  Settings,
  Plus,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

export default function AppShellClient({
  userEmail,
  websites,
  children,
}: {
  userEmail: string;
  websites: Website[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const supabase = createBrowserClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);

  // Extract current website ID from URL if inside /app/[id]/*
  const currentWebsiteId = (params?.id as string) || (websites.length > 0 ? websites[0].id : null);
  const currentSite = websites.find((w) => w.id === currentWebsiteId) || websites[0];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = currentWebsiteId
    ? [
        { label: 'Overview', href: `/app/${currentWebsiteId}`, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Pages', href: `/app/${currentWebsiteId}/pages`, icon: <FileText className="w-4 h-4" /> },
        { label: 'Referrers', href: `/app/${currentWebsiteId}/referrers`, icon: <Compass className="w-4 h-4" /> },
        { label: 'Countries', href: `/app/${currentWebsiteId}/countries`, icon: <Globe className="w-4 h-4" /> },
        { label: 'Devices', href: `/app/${currentWebsiteId}/devices`, icon: <Smartphone className="w-4 h-4" /> },
        { label: 'Events', href: `/app/${currentWebsiteId}/events`, icon: <Zap className="w-4 h-4" /> },
        { label: 'Realtime', href: `/app/${currentWebsiteId}/realtime`, icon: <Radio className="w-4 h-4" /> },
        { label: 'Settings', href: `/app/${currentWebsiteId}/settings`, icon: <Settings className="w-4 h-4" /> },
      ]
    : [];

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Top Mobile Header */}
      <div className="md:hidden bg-[#010120] text-white px-4 h-14 flex items-center justify-between border-b border-[#26263a] sticky top-0 z-50">
        <Link href="/app" className="flex items-center gap-2 font-display text-[18px] font-medium">
          <span className="w-2 h-2 bg-[#c8f6f9] rounded-full" />
          <span>aether</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white hover:bg-[#26263a] rounded-[4px] cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sticky Sidebar (Pinned permanently on desktop) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:sticky md:top-0 md:h-screen md:shrink-0 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <AppSidebar className="h-full overflow-y-auto dark-scrollbar">
          <div>
            {/* Top Brand & Site Switcher */}
            <div className="pb-4 mb-4 border-b border-[#26263a]">
              <Link href="/app" className="flex items-center gap-2 text-white font-display text-[20px] font-medium tracking-tight mb-4 px-2">
                <span className="w-2.5 h-2.5 bg-[#c8f6f9] rounded-full" />
                <span>aether</span>
              </Link>

              {websites.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSiteMenuOpen(!siteMenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#26263a] hover:bg-[#313641] text-white rounded-[4px] transition-colors text-left cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-[10px] uppercase text-[#999999] block">WEBSITE</span>
                      <span className="font-display text-[14px] font-medium text-white truncate block">
                        {currentSite?.name || 'Select website'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#999999] shrink-0" />
                  </button>

                  {siteMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#131332] border border-[#26263a] rounded-[4px] shadow-xl z-50 py-1 max-h-60 overflow-y-auto dark-scrollbar">
                      {websites.map((site) => (
                        <Link
                          key={site.id}
                          href={`/app/${site.id}`}
                          onClick={() => setSiteMenuOpen(false)}
                          className={`block px-3 py-2 text-[13px] transition-colors ${
                            site.id === currentWebsiteId
                              ? 'bg-[#313641] text-white font-medium'
                              : 'text-[#999999] hover:text-white hover:bg-[#26263a]'
                          }`}
                        >
                          <div className="font-medium text-white truncate">{site.name}</div>
                          <div className="font-mono text-[11px] text-[#71717a] truncate">{site.domain}</div>
                        </Link>
                      ))}
                      <div className="pt-1 mt-1 border-t border-[#26263a]">
                        <Link
                          href="/app/sites/new"
                          onClick={() => setSiteMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase text-[#bdbbff] hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD WEBSITE</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Links (Sentence case labels per Together AI specs) */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <AppSidebarRow
                    key={item.href}
                    href={item.href}
                    active={isActive}
                    icon={item.icon}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </AppSidebarRow>
                );
              })}
            </nav>
          </div>

          {/* Bottom Profile & Actions */}
          <div className="pt-4 border-t border-[#26263a]">
            {websites.length === 0 && (
              <Link
                href="/app/sites/new"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#26263a] hover:bg-[#313641] text-white rounded-[4px] font-mono text-[12px] uppercase mb-3 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>ADD WEBSITE</span>
              </Link>
            )}

            <div className="flex items-center justify-between px-2 py-1.5 text-[#999999]">
              <div className="flex items-center gap-2.5 truncate pr-2">
                <div className="w-8 h-8 rounded-[4px] bg-[#26263a] text-white font-mono text-[13px] font-medium flex items-center justify-center shrink-0 border border-[#313641]">
                  {userInitial}
                </div>
                <div className="truncate">
                  <span className="font-mono text-[10px] uppercase text-[#999999] block">LOGGED IN</span>
                  <span className="font-display text-[12px] text-white truncate block">{userEmail}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 hover:text-white hover:bg-[#26263a] rounded-[4px] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </AppSidebar>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Work Surface (Scrolls independently while sidebar stays pinned) */}
      <main className="flex-1 min-w-0 bg-white min-h-screen">
        {children}
      </main>
    </div>
  );
}
