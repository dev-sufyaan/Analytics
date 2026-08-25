# Mobile App Plan — Android APK for "Analytics by Sufyaan Studio"

> **Status:** Architecture & Implementation Plan (Audited & Production-Ready)  
> **Date:** 2026-08-25  
> **Target Platform:** Android (Universal Signed `.apk` distributed directly via website download)  
> **Cost Target:** **$0.00** Development, CI/CD, Hosting, and Maintenance  
> **Goal:** A fast, reliable, 60fps Android application that mirrors the web dashboard's tracking results with instant cold start, intelligent auto-sync and refresh, email/password authentication, zero-cost push notifications (daily digest & milestones), seamless in-app self-updating, and a responsive UI optimized for all Android form factors.

---

## Table of Contents

1. [Part I — Current System Deep-Dive](#part-i--current-system-deep-dive)
   - 1.1 [Architecture Overview](#11-architecture-overview)
   - 1.2 [Frontend Architecture (`apps/web` & `packages/ui`)](#12-frontend-architecture-appsweb--packagesui)
   - 1.3 [Backend Architecture (`apps/collect` & Worker Infrastructure)](#13-backend-architecture-appscollect--worker-infrastructure)
   - 1.4 [Database & Security (`Supabase Postgres` & RLS)](#14-database--security-supabase-postgres--rls)
   - 1.5 [Authentication System](#15-authentication-system)
   - 1.6 [Design System & Visual Tokens](#16-design-system--visual-tokens)
   - 1.7 [Data Lifecycle & Synchronization](#17-data-lifecycle--synchronization)
   - 1.8 [Key Architectural Directives for Mobile](#18-key-architectural-directives-for-mobile)
2. [Part II — $0 Cost & Feasibility Verification](#part-ii--0-cost--feasibility-verification)
   - 2.1 [Free Tier Quota & Consumption Matrix](#21-free-tier-quota--consumption-matrix)
   - 2.2 [Evaluation of Architectural Alternatives](#22-evaluation-of-architectural-alternatives)
3. [Part III — Mobile App Technical Architecture](#part-iii--mobile-app-technical-architecture)
   - 3.1 [Core Stack & Technology Pinned Choices](#31-core-stack--technology-pinned-choices)
   - 3.2 [Monorepo Structure & Code Sharing Strategy](#32-monorepo-structure--code-sharing-strategy)
   - 3.3 [Data Layer & Realtime Auto-Sync Architecture](#33-data-layer--realtime-auto-sync-architecture)
   - 3.4 [Authentication Lifecycle](#34-authentication-lifecycle)
   - 3.5 [Screen Inventory & UX Specifications](#35-screen-inventory--ux-specifications)
   - 3.6 [Multi-Screen Responsive Design Matrix](#36-multi-screen-responsive-design-matrix)
   - 3.7 [Design System Port (React Native / NativeWind v4)](#37-design-system-port-react-native--nativewind-v4)
   - 3.8 [Push Notification Subsystem ($0 Topic/Chunked FCM via Worker Cron)](#38-push-notification-subsystem-0-topicchunked-fcm-via-worker-cron)
   - 3.9 [Android Sideloading, Distribution & In-App APK Self-Updater](#39-android-sideloading-distribution--in-app-apk-self-updater)
   - 3.10 [Website Download Page (`/download`) & Marketing SEO Surface](#310-website-download-page-download--marketing-seo-surface)
   - 3.11 [Backend & Database Additions Summary](#311-backend--database-additions-summary)
   - 3.12 [Performance, Battery & Reliability Budgets](#312-performance-battery--reliability-budgets)
   - 3.13 [Security, Cryptography & Privacy Policy](#313-security-cryptography--privacy-policy)
   - 3.14 [Testing & Quality Assurance Strategy](#314-testing--quality-assurance-strategy)
   - 3.15 [Automated CI/CD Pipeline (GitHub Actions Release Workflow)](#315-automated-cicd-pipeline-github-actions-release-workflow)
   - 3.16 [Delivery Milestones & Work Estimates](#316-delivery-milestones--work-estimates)
   - 3.17 [Risk Management & Mitigation Runbook](#317-risk-management--mitigation-runbook)
4. [Appendices](#appendices)
   - [Appendix A: Pinned SDK 54 `package.json` Dependencies](#appendix-a-pinned-sdk-54-packagejson-dependencies)
   - [Appendix B: Proposed Mobile Project Directory Tree](#appendix-b-proposed-mobile-project-directory-tree)
   - [Appendix C: React Query Hook → Supabase RPC Contract Map](#appendix-c-react-query-hook--supabase-rpc-contract-map)
   - [Appendix D: Production-Grade In-App APK Updater (`updater.ts`)](#appendix-d-production-grade-in-app-apk-updater-updaterts)

---

# Part I — Current System Deep-Dive

## 1.1 Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │             Website Visitors                 │
                        │   <script defer src="…/t.js" data-web="…">   │
                        └───────────────┬──────────────────────────────┘
                                        │ POST /c (navigator.sendBeacon)
                                        ▼
                 ┌────────────────────────────────────────────────────────┐
                 │  apps/collect — Cloudflare Worker (Edge Ingest & R2)   │
                 │  • Preflight guards (bot filter, IP hash, geo header)  │
                 │  • Body cap ≤ 16 KB (LIMITS.MAX_BODY_BYTES = 16384)    │
                 │  • KV site cache (5-min TTL) & origin allowlist check   │
                 │  • Single-pass batched ingest_events RPC call          │
                 │  • GET /download/* serves R2 APKs & latest.json        │
                 │  • Cron 00:15 UTC -> await run_daily_rollup -> Push    │
                 │  • GET /t.js (serves high-perf tracker bundle)         │
                 └───────────────┬────────────────────────────────────────┘
                                 │ service_role REST (PostgREST)
                                 ▼
         ┌────────────────────────────────────────────────────────────────┐
         │  Supabase (PostgreSQL 15 + Auth + RLS + PostgREST)             │
         │  Tables: websites · sessions · website_events · daily_stats    │
         │  RPCs:   get_dashboard_overview, get_realtime_visitors,        │
         │          wipe_website_data, get_public_dashboard_overview …    │
         └───────────────┬────────────────────────────────┬───────────────┘
                         │                                │
        anon key + JWT   │ RLS                            │ anon key + JWT, RLS
                         ▼                                ▼
 ┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
 │  apps/web — Next.js 15 (App Router)       │   │  apps/mobile — React Native / Expo        │
 │  Cloudflare Workers (OpenNext)            │   │  Android (.apk via website download)      │
 │  • Marketing, Docs & SEO surfaces         │   │  • Native 60fps UI & Safe Areas           │
 │  • /app/[id] Client Dashboard             │   │  • Persistent offline SWR cache           │
 │  • /s/[share_token] Public Dashboards     │   │  • Foreground auto-refresh (30s/15s)      │
 │  • /download APK Landing Page             │   │  • In-app self-updater & FCM Push         │
 └───────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

The core architectural strength of this platform is that **the web dashboard is already a client-driven SPA operating directly over Supabase PostgREST RPCs**. `DashboardClient.tsx` authenticates with Supabase Auth and executes `get_dashboard_overview` directly from the client browser.

**Result for Mobile:** No custom API proxy, Node.js backend server, or REST adapter needs to be created. The mobile app connects to the exact same PostgREST endpoints using `supabase-js`, returning byte-identical results with full RLS multi-tenant protection.

---

## 1.2 Frontend Architecture (`apps/web` & `packages/ui`)

- **Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, uPlot charts, Lucide React icons, deployed via `@opennextjs/cloudflare` on Cloudflare Workers.
- **Surface Breakdown:**
  - **Marketing & SEO:** `/`, `/features/*`, `/pricing`, `/vs/*`, `/tools/*`, `/how-to/*`, `/privacy-first-analytics`.
  - **Auth:** `/login`, `/auth/callback`.
  - **Authenticated Dashboard:** `/app` (shell), `/app/[id]` (main overview), sub-routes `/pages`, `/referrers`, `/countries`, `/devices`, `/events`, `/realtime`, `/settings`.
  - **Public Dashboard:** `/s/[share_token]`.
  - **Agentic / Machine Interface:** `/api/mcp`, `/api/openapi.json`, `/api/markdown`, `/llms.txt`.
- **Dashboard Data Mechanics (`DashboardClient.tsx`, 1,046 lines):**
  - **Single Combined RPC (`get_dashboard_overview`):** Retrieves all KPI metrics, previous period comparison metrics, timeseries points, top 100 pages, referrers, countries, devices (browsers, OS, device types), custom events, UTM channels, and AI-traffic sources in **one network round-trip**.
  - **SWR Client-Side Store (`packages/db/src/overview-store.ts`):** 30-second fresh TTL with in-flight deduplication. Sub-pages slice the pre-fetched overview payload rather than triggering new network calls.
  - **Granular Filtering:** Selecting any path, referrer domain, or country sets a dashboard-wide filter (`p_filter_type`, `p_filter_value`).
  - **Realtime Screen (`/realtime`):** 15-second polling of `get_realtime_visitors` (active visitors in trailing 5 minutes + active pages), gated by `document.visibilityState === 'visible'`.

---

## 1.3 Backend Architecture (`apps/collect` & Worker Infrastructure)

- **Ingest Worker (`apps/collect/src/index.ts`):**
  - Handles `POST /c` beacon ingestion with preflight guards (bot blocklist, body size cap **$\le 16\text{ KB}$** via `LIMITS.MAX_BODY_BYTES = 16384`, JSON validation, single-website batching).
  - Caches website metadata in Cloudflare KV (`site:{id}`, 5-minute TTL) to validate origin/referrer against `domain` and `allowed_domains`.
  - Maps incoming beacons into batched `ingest_events` PostgREST RPC calls using the `service_role` key.
  - Failure-only KV health counters (`ingest_health`) exposed at secret-gated `GET /internal/stats`.
  - Returns silent `204 No Content` for invalid beacons (zero existence leakage, zero client 5xx).
  - Serves static tracker bundle `GET /t.js` with long-cache headers.
  - Scheduled Cron `15 0 * * *` executes `await runRollup(env)` for aggregate rollups and data retention cleanup, followed by the daily push digest dispatch.

---

## 1.4 Database & Security (`Supabase Postgres` & RLS)

- **Database Engine:** Supabase PostgreSQL 15 with 9 migrations (`0001` through `0009`).
- **Core Entities:**
  - `websites`: `id`, `user_id`, `name`, `domain`, `allowed_domains[]`, `share_token`, `is_public`, `timezone`, `data_retention_days` (30), `monthly_event_quota` (25,000), `events_this_month`, `quota_month`.
  - `sessions`: `visitor_hash` (daily-salted SHA-256), `hostname`, `browser`, `os`, `device`, `screen`, `language`, `country`, `entry_path`, `first_seen`, `last_seen`, `pageview_count`, `event_count`, `total_duration_seconds`.
  - `website_events`: `url_path`, `url_query`, `title`, `referrer_domain`, `referrer_source` (ChatGPT, Perplexity, Claude, Gemini, Copilot via migration `0009`), UTM tags, ad click IDs (`gclid`, `fbclid`, etc.), `event_name`, `event_data` ($\le 2\text{ KB}$ JSON).
  - `daily_stats`: Aggregate daily summary table (`website_id`, `day`, `pageviews`, `unique_visitors`, `sessions`, `bounces`, `total_duration_seconds`).
- **Security & RLS:**
  - Row Level Security is active on all tables.
  - All user-facing RPC functions (`get_dashboard_overview`, `get_realtime_visitors`, `wipe_website_data`) are declared `SECURITY DEFINER` and explicitly check `auth.uid() = user_id`.
  - Mobile client requires only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`—the exact same public credentials used by the web client.

---

## 1.5 Authentication System

- Supabase Auth with JWT and refresh token exchange.
- Web uses `@supabase/ssr` with HTTP-only cookies and automatic middleware refresh.
- Mobile uses `@supabase/supabase-js` configured with `AsyncStorage` and hardware-backed encrypted token storage (`expo-secure-store`).

---

## 1.6 Design System & Visual Tokens

Defined in `packages/ui/tokens.css` and shared across Tailwind CSS:

| Token Category | Token Variable | Value | Semantic Usage |
|---|---|---|---|
| **Canvas Dark** | `--color-canvas-dark` | `#010120` | App top bar, sidebar, bottom tab bar |
| **Dark Soft Surface** | `--color-surface-dark-soft`| `#26263a` | Dark borders, active item containers |
| **Dark Fill** | `--color-surface-dark-fill`| `#313641` | Dark card backgrounds |
| **Canvas Light** | `--color-canvas` | `#ffffff` | Primary content canvas |
| **Hairline Border** | `--color-hairline` | `#ebebeb` | Standard card and table dividers |
| **Primary Ink** | `--color-ink` | `#000000` | Primary headlines, active pills |
| **Body Text** | `--color-body` | `#71717a` | Secondary text, table sub-values |
| **Muted Text** | `--color-body-muted` | `#999999` | Timestamps, table column labels |
| **Accent Mint** | `--color-accent-mint` | `#c8f6f9` | Visitors KPI card, live status pulse |
| **Accent Periwinkle** | `--color-accent-periwinkle`| `#bdbbff` | Pageviews KPI card, active accents |
| **Brand Gradient** | `--brand-gradient` | `90deg, #fc4c02 -> #ef2cc1 -> #bdbbff` | App branding, hero accents |
| **Radius** | `--radius-sm` | `4px` (`rounded-[4px]`) | Universal element border radius |
| **Display Font** | `--font-display` | `Geist Sans` | Main headlines, body typography |
| **Mono Font** | `--font-mono` | `Geist Mono` | Uppercase micro-labels (11px, `0.055em` spacing) |

---

## 1.7 Data Lifecycle & Synchronization

1. **Date Range Windows:** Standardized via `rangeWindow(range)` in `packages/db/src/range.ts`:
   - `24h` (hour intervals), `7d`, `30d`, `90d` (day intervals).
   - Generates exact historical `prevStart` and `prevEnd` windows for honest delta calculation.
2. **Formatting Library:** Pure TypeScript helpers in `packages/ui/src/format.ts` (`formatNumber`, `formatDuration`, `percentDelta`, `formatBucketLabel`, `formatBucketFull`) are 100% platform-independent.

---

## 1.8 Key Architectural Directives for Mobile

1. **Zero New Backend Services:** The Supabase RPCs already provide all required endpoints.
2. **Direct Monorepo Code Reuse:** TypeScript types, date range math, formatters, and query wrappers are shared verbatim.
3. **Optimized SWR Polling:** TanStack Query replaces `overview-store.ts` on mobile, maintaining a 30s fresh TTL with foreground-only polling.
4. **Strict $0 Cost:** GitHub Actions CI builds universal APKs; Cloudflare R2 (served via the Collect Worker) hosts releases with $0 egress fees; Firebase Cloud Messaging handles push notifications for free; Google Play listing fees are bypassed via website download.

---

# Part II — $0 Cost & Feasibility Verification

## 2.1 Free Tier Quota & Consumption Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 $0 OPERATIONAL BUDGET                                  │
├───────────────────────┬──────────────────────────────┬──────────────────┬──────────────┤
│ Resource              │ Free Tier Allocation         │ App Consumption  │ Net Monthly  │
├───────────────────────┼──────────────────────────────┼──────────────────┼──────────────┤
│ GitHub Actions Linux  │ 2,000 build min / month      │ 8–15 min / build │ $0.00        │
│ Cloudflare R2 Storage │ 10 GB storage, 10M reads/mo  │ ~25 MB / release │ $0.00        │
│ Cloudflare R2 Egress  │ UNLIMITED ($0 Egress)        │ 50 GB bandwidth  │ $0.00        │
│ Supabase Postgres     │ 500 MB DB, 50k Auth MAU      │ Shared with Web  │ $0.00        │
│ Firebase FCM v1       │ UNLIMITED Push Messages      │ Unlimited        │ $0.00        │
│ PostHog (Optional)    │ 1,000,000 events / month     │ < 10,000 events  │ $0.00        │
│ Google Play Developer │ $25.00 one-time fee          │ BYPASSED (APK)   │ $0.00        │
├───────────────────────┴──────────────────────────────┴──────────────────┼──────────────┤
│ TOTAL MONTHLY & SETUP COST                                              │ $0.00        │
└─────────────────────────────────────────────────────────────────────────┴──────────────┘
```

---

## 2.2 Evaluation of Architectural Alternatives

| Consideration | React Native + Expo (Selected) | Progressive Web App (PWA) / TWA | Flutter | Native Kotlin |
|---|---|---|---|---|
| **Code Reuse** | **90%** (Shared DB types, formatting, queries) | 100% (Wrapped web view) | 0% (Rewritten in Dart) | 0% (Rewritten in Kotlin) |
| **Performance** | **Native 60 fps** (Smooth gestures, SVG charts) | Clunky (Mobile browser feel) | Native 60 fps | Native 60–120 fps |
| **Offline Cache** | **Instant Cold Start** (AsyncStorage persister) | Flaky ServiceWorker cache | SQLite / Hive | Room / SQLite |
| **Sideload Updating** | **In-App Package Installer + Native Hash Verification**| Standard web refresh | In-App Package Installer | In-App Package Installer |
| **Push Reliability** | **High** (Direct FCM v1 SDK) | Poor on Android web | High (FCM SDK) | High (FCM SDK) |
| **Maintenance Cost** | **$0 / Single Monorepo** | $0 | Doubles maintenance | Doubles maintenance |

---

# Part III — Mobile App Technical Architecture

## 3.1 Core Stack & Technology Pinned Choices

| Layer | Selection | Version Pin | Technical Justification |
|---|---|---|---|
| **Framework** | Expo (Managed CNG) | SDK 54+ (`react-native ~0.81.x`, `react 19.x`) | Single monorepo language, reproducible CNG prebuilds |
| **Navigation** | Expo Router | `~6.x` | File-based routing matching Next.js App Router mental model |
| **Styling** | NativeWind | `^4.1.x` (`tailwindcss ^3.4.x`) | Identical class names and design tokens as `apps/web` |
| **Data Layer** | `@tanstack/react-query` | `^5.67.x` | SWR caching, automatic deduplication, AppState refetching |
| **Persistence** | `@tanstack/query-async-storage-persister` | `^5.67.x` | Instant cold start hydration from local storage |
| **Database SDK** | `@supabase/supabase-js` | `^2.49.x` | Direct RPC execution with `react-native-url-polyfill` |
| **Secure Storage**| `expo-secure-store` | `~15.x` | Hardware-backed encrypted storage for Supabase JWTs |
| **Native Hashing**| `react-native-blob-util` | `^0.21.x` | Streaming native C++/Java SHA-256 calculation for APK verification |
| **Charts** | `react-native-gifted-charts` + `react-native-svg` | Latest | Lightweight SVG area & line charts matching uPlot styling |
| **Icons** | `lucide-react-native` | `^0.477.x` | 1:1 icon match with web (`BarChart3`, `Globe`, `Radio`, etc.) |
| **Typography** | `expo-font` | `~14.x` | Bundled Geist Sans and Geist Mono `.ttf` font files |
| **Push** | `expo-notifications` | `~0.31.x` | FCM v1 integration with foreground/background handling (Notifee fallback) |
| **Installer** | `expo-file-system` + `expo-intent-launcher` | `~19.x` / `~12.x` | Android APK download and package installer invocation |

> **Dependency Scaffolding Rule:** Always scaffold dependencies via `npx expo install <package>` within `apps/mobile` to automatically resolve SDK-matched peer versions.

---

## 3.2 Monorepo Structure & Code Sharing Strategy

Add `apps/mobile` to `pnpm-workspace.yaml`. Shared modules are consumed directly:

```
apps/mobile/
├── package.json
├── tsconfig.json
├── metro.config.js               # Symlink & monorepo workspace resolver
├── tailwind.config.js            # Extends packages/ui tokens
├── app.json                      # Expo application manifest & permissions
└── src/
```

### Shared Module Dependency Matrix

```
┌───────────────────────────┐
│     apps/mobile (Expo)    │
└─────────────┬─────────────┘
              │
              ├──► @analytics/db (types.ts, range.ts, queries.ts)
              ├──► @analytics/ui (format.ts)
              └──► Shared Constants (AI_SOURCE_LABELS, quota calculations)
```

---

## 3.3 Data Layer & Realtime Auto-Sync Architecture

### 3.3.1 Supabase Client Initialization (`src/lib/supabase.ts`)

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// Auto-refresh token on foreground resume
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

---

### 3.3.2 Query Configuration & Auto-Sync Engine

TanStack Query manages data fetching with background polling and offline persistence:

```typescript
import { QueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// Connect TanStack Query to AppState for foreground-only polling
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 seconds fresh window (matches web overview-store)
      gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection for offline viewing
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: 'always',
    },
  },
});
```

### Auto-Sync Matrix

| User Context | Synchronization Mechanism | Frequency | Resource Impact |
|---|---|---|---|
| **App Cold Start** | Hydrate from AsyncStorage $\rightarrow$ Silent background RPC fetch | Immediate (< 50ms) | Negligible |
| **App Foregrounded** | `AppState === 'active'` triggers automatic query invalidation | Immediate | 1 RPC call |
| **Overview Screen** | TanStack Query interval poll | Every 30 seconds | ~15 KB payload |
| **Realtime Screen** | Dedicated polling hook | Every 15 seconds | ~1 KB payload |
| **App Backgrounded** | FocusManager marks unfocused; **all timers suspended** | 0 requests | Zero battery / quota use |
| **Pull-to-Refresh** | `RefreshControl` $\rightarrow$ `queryClient.invalidateQueries()` | User-driven | Immediate refresh |

---

## 3.4 Authentication Lifecycle

1. **Sign-In Flow:**
   - User inputs email and password $\rightarrow$ `supabase.auth.signInWithPassword()`.
   - JWT tokens saved to Android Keystore via `expo-secure-store`.
   - Expo Router `_layout.tsx` detects session change and transitions to `(tabs)/index.tsx`.
2. **Sign-Up Flow:**
   - User registers $\rightarrow$ `supabase.auth.signUp()`.
   - Confirmation email sent with link to web callback (`https://analytics.sufyaanstudio.workers.dev/auth/callback`).
   - Upon web verification, user logs into mobile app.
3. **Sign-Out:**
   - Settings tab $\rightarrow$ Sign Out $\rightarrow$ Clears SecureStore and resets TanStack Query cache.

---

## 3.5 Screen Inventory & UX Specifications

```
┌──────────────────────────────────────────────────────────┐
│  (tabs)/_layout.tsx (Dark Chrome #010120)               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. OVERVIEW TAB (index.tsx)                             │
│     ├── Top Bar: Brand Wordmark + Site Picker Dropdown   │
│     ├── Status Eyebrow: Domain, Last Updated & Live Dot  │
│     ├── Time Range Selector Pills: [24H] [7D] [30D] [90D]│
│     ├── Active Filter Pill (e.g. "path: /pricing [✕]")   │
│     ├── 2-Column KPI Grid:                               │
│     │   ├── Mint Tinted: Unique Visitors (Delta % vs Prev│
│     │   ├── Periwinkle Tinted: Total Pageviews           │
│     │   ├── Plain: Bounce Rate                           │
│     │   └── Plain: Average Visit Duration                │
│     ├── ChartCard: Interactive SVG Area/Line Chart       │
│     │   └── Metric Toggle: [ALL] [VIEWS] [VISITORS]      │
│     ├── PanelCard: Top Pages (Bar-percent background)    │
│     ├── PanelCard: Referrers & UTM Acquisition Channels  │
│     ├── PanelCard: Geography (Country flags & counts)    │
│     ├── PanelCard: Hardware (Browser / OS / Device type) │
│     ├── PanelCard: AI Traffic (ChatGPT, Claude, etc.)    │
│     └── PanelCard: Custom Events Summary                 │
│                                                          │
│  2. REALTIME TAB (realtime.tsx)                          │
│     ├── Giant Live Counter: Active Visitors (Last 5 Min) │
│     ├── Live Status Indicator (Flashing Mint LiveDot)    │
│     ├── Action Controls: [PAUSE] [RESUME] [REFRESH]      │
│     └── Realtime Active Pages List with Bar Progress     │
│                                                          │
│  3. SITES TAB (sites.tsx)                                │
│     ├── Website Card List (Name, Domain, Created Date)   │
│     ├── Monthly Event Quota Usage Progress Bar           │
│     └── Active Site Selector                             │
│                                                          │
│  4. SETTINGS TAB (settings.tsx)                          │
│     ├── User Account Information (Email, User ID)        │
│     ├── Active Website Share Link Copy Button            │
│     ├── Push Notification Preferences (Daily Digest)     │
│     ├── Cache Management (Storage Size & Clear Cache)    │
│     ├── App Version & [CHECK FOR UPDATE] Action          │
│     └── Sign Out Button                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3.6 Multi-Screen Responsive Design Matrix

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Small Phones (≤ 360dp)  │ Standard (375 - 430dp)  │ Tablets / Fold (≥ 600dp)│
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • 2-Column compact KPIs │ • 2-Column standard KPIs│ • 4-Column inline KPIs  │
│ • Collapsible panels    │ • Full panel cards      │ • Side-by-side panels   │
│ • Horizontal table scroll│ • Standard data tables  │ • Dual-pane master/detail│
│ • 13pt body typography  │ • 14pt body typography  │ • 16pt body typography  │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

- **Edge-to-Edge Support:** Wrapped in `SafeAreaProvider` from `react-native-safe-area-context` to correctly inset navigation headers and bottom tab bars on Android 10 through Android 15.
- **Font Scaling:** Set `maxFontSizeMultiplier={1.2}` on body text and `maxFontSizeMultiplier={1.0}` on uppercase mono labels to prevent layout breakage on enlarged accessibility settings.

---

## 3.7 Design System Port (React Native / NativeWind v4)

### Color Palette (`src/theme/tokens.ts`)

```typescript
export const tokens = {
  colors: {
    canvasDark: '#010120',
    surfaceDarkSoft: '#26263a',
    surfaceDarkFill: '#313641',
    canvas: '#ffffff',
    hairline: '#ebebeb',
    ink: '#000000',
    body: '#71717a',
    bodyMuted: '#999999',
    accentMint: '#c8f6f9',
    accentPeriwinkle: '#bdbbff',
    accentOrange: '#fc4c02',
    accentMagenta: '#ef2cc1',
  },
  radii: {
    sm: 4,
    md: 8,
    full: 9999,
  },
  typography: {
    monoEyebrow: {
      fontFamily: 'GeistMono',
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
    },
    displayHero: {
      fontFamily: 'GeistSans',
      fontSize: 32,
      fontWeight: '600' as const,
    },
  },
};
```

---

## 3.8 Push Notification Subsystem ($0 Topic/Chunked FCM via Worker Cron)

### Architectural Flow & Scaling Strategy

```
┌─────────────────────────────────────────┐
│ Cloudflare Ingest Cron                  │ 00:15 UTC
│ apps/collect/src/index.ts               │
│ 1. await runRollup(env) [Finalize Data] │
│ 2. dispatchPushDigest(env)              │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Supabase PostgreSQL                     │
│ Query daily_stats directly              │ (service_role bypasses table RLS;
│ (or get_daily_digest_stats RPC)         │ does NOT call user-scoped overview RPC)
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Firebase Cloud Messaging (FCM v1)       │
│ • v1.0: Topic "daily_digest" (1 subreq) │ (Workers free plan limit: 50 subrequests)
│ • v1.1: Token loop in chunks of 25      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Android Devices (FCM Client)            │
│ "Yesterday: 1,204 visitors (+12%)"      │
└─────────────────────────────────────────┘
```

1. **Database Migration (`supabase/migrations/0010_push_tokens.sql`):**
   ```sql
   create table public.push_tokens (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     device_id text not null,
     fcm_token text not null,
     preferences jsonb not null default '{"daily_digest": true, "milestones": false}'::jsonb,
     created_at timestamptz not null default now(),
     last_seen timestamptz not null default now(),
     unique (user_id, device_id)
   );

   alter table public.push_tokens enable row level security;
   create policy push_tokens_user on public.push_tokens
     for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Dedicated service-role helper for Worker push digest
   create or replace function public.get_yesterday_user_digests()
   returns table (user_id uuid, fcm_token text, total_views bigint, total_visitors bigint)
   security definer
   language sql as $$
     select pt.user_id, pt.fcm_token,
            coalesce(sum(ds.pageviews), 0)::bigint as total_views,
            coalesce(sum(ds.unique_visitors), 0)::bigint as total_visitors
     from public.push_tokens pt
     join public.websites w on w.user_id = pt.user_id
     left join public.daily_stats ds on ds.website_id = w.id and ds.day = (current_date - 1)
     where (pt.preferences->>'daily_digest')::boolean = true
     group by pt.user_id, pt.fcm_token;
   $$;
   grant execute on function public.get_yesterday_user_digests() to service_role;
   ```
2. **Worker Cron Sequencing:** In `apps/collect/src/index.ts`:
   ```typescript
   async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
     ctx.waitUntil((async () => {
       // 1. Await rollup so yesterday's numbers are finalized
       await runRollup(env);
       // 2. Dispatch push digests via FCM HTTP v1 using WebCrypto RS256 JWT
       await sendPushDigests(env);
     })());
   }
   ```
3. **Subrequest Limit Safety:** FCM v1 sends are batched or topic-dispatched to strictly stay below Cloudflare Free Workers' 50 subrequests/invocation cap.

---

## 3.9 Android Sideloading, Distribution & In-App APK Self-Updater

Because the app is distributed directly as an APK from your website rather than through the Google Play Store, **an in-app update mechanism is required**.

### Sideload Update Flow

```
1. App Cold Start (silent) or Settings > [CHECK FOR UPDATE]
   │
   ▼
2. Fetch https://analytics.sufyaanstudio.workers.dev/download/latest.json
   │
   ├── manifest.versionCode <= Application.nativeBuildVersion: "Up to date"
   │
   └── manifest.versionCode > Application.nativeBuildVersion:
       │
       ▼
3. Display Update Dialog (New Version, File Size, Changelog)
       │
       ▼ [User taps "Download & Install"]
4. Download APK to FileSystem.cacheDirectory with Progress Callback
       │
       ▼
5. Native SHA-256 Hash Verification (react-native-blob-util fs.hash)
       │
       ├── Hash Mismatch: Delete corrupted file & alert user
       │
       └── Hash Valid:
           │
           ▼
6. Verify Android REQUEST_INSTALL_PACKAGES permission
       │
       ├── Not granted: Open Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES
       │
       └── Granted:
           │
           ▼
7. Launch Intent: ACTION_VIEW -> application/vnd.android.package-archive
   (FileProvider content:// URI with FLAG_GRANT_READ_URI_PERMISSION)
       │
       ▼
8. Android System Package Installer updates the app in-place!
```

---

## 3.10 Website Download Page (`/download`) & Marketing SEO Surface

Create `apps/web/src/app/download/page.tsx` on the website:
- **Hero Display:** Gradient headline, app mockup, live version tag, and file size.
- **Direct Download Button:** Points directly to `https://analytics.sufyaanstudio.workers.dev/download/analytics-latest.apk`.
- **Desktop QR Code:** Scannable directly with an Android camera for immediate APK download.
- **Verification Metadata:** Displays SHA-256 checksum and release date.
- **Installation Guide:** 3-step visual guide explaining how to allow "Install unknown apps" in Android settings.

---

## 3.11 Backend & Database Additions Summary

| Component | Target Location | Scope |
|---|---|---|
| **Constants Extraction** | `packages/db/src/constants.ts` | Shared `AI_SOURCE_LABELS`, quota thresholds |
| **R2 Download Handler** | `apps/collect/src/index.ts` | Serves `GET /download/latest.json` & `.apk` from R2 binding |
| **Download Landing Page** | `apps/web/src/app/download/page.tsx` | Marketing, QR Code, direct APK link |
| **Push Token Table** | `supabase/migrations/0010_push_tokens.sql` | User token registry & `get_yesterday_user_digests` RPC |
| **Push Cron Dispatch** | `apps/collect/src/index.ts` | Scheduled daily digest push via FCM HTTP v1 |
| **CI Build Workflow** | `.github/workflows/mobile-release.yml` | Automated signed Gradle release compilation |

---

## 3.12 Performance, Battery & Reliability Budgets

| Metric | Budget Target | Implementation Strategy |
|---|---|---|
| **Cold Start (Cached)** | $< 1.5\text{ seconds}$ | AsyncStorage cache hydration + lightweight splash screen |
| **Cold Start (Network)**| $< 3.0\text{ seconds}$ | Single-pass `get_dashboard_overview` round-trip |
| **APK Binary Size** | $< 25\text{ MB}$ | Hermes JavaScript engine, ProGuard / R8 code shrinking |
| **JS Bundle Size** | $< 3.0\text{ MB}$ | Native SVG charts, zero bloated external dependencies |
| **Frame Rate** | Constant $60\text{ fps}$ | Memoized table rows, SVG rendering for $\le 90$ data points |
| **Battery Drain** | $\approx 0\text{ mAh background}$ | Complete polling suspension on `AppState === 'background'` |

---

## 3.13 Security, Cryptography & Privacy Policy

1. **Identical Trust Model to Web:** The public Supabase Anon Key is embedded in the APK. All data isolation is enforced at the database level by Row Level Security.
2. **Encrypted Token Storage:** JWT access tokens and refresh tokens are stored in `expo-secure-store` (Android Keystore hardware encryption).
3. **Binary Integrity Verification:** In-app updater computes SHA-256 hash natively before handing the APK to the system installer.
4. **Privacy-First Brand Standard:** No third-party ad networks, no telemetry trackers, and zero invasive Android permissions.

---

## 3.14 Testing & Quality Assurance Strategy

- **Unit Testing (Jest):** Verifies `rangeWindow()` date calculations, `formatNumber()`, and `percentDelta()` against web snapshots.
- **Contract Testing (`rpc.test.mjs`):** Extends current backend tests to verify mobile queries output identical shapes.
- **E2E UI Testing (Maestro):**
  ```yaml
  appId: com.sufyaanstudio.analytics
  ---
  - launchApp
  - assertVisible: "AUTHENTICATION"
  - inputText:
      id: "email_input"
      text: "test@sufyaanstudio.com"
  - inputText:
      id: "password_input"
      text: "password123"
  - tapOn: "SIGN IN"
  - assertVisible: "UNIQUE VISITORS"
  - tapOn: "7D"
  - assertVisible: "TOP PAGES & PATHS"
  ```

---

## 3.15 Automated CI/CD Pipeline (GitHub Actions Release Workflow)

Create `.github/workflows/mobile-release.yml`:

```yaml
name: Build & Release Android APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js & pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Gradle Cache
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Expo Prebuild
        run: |
          cd apps/mobile
          npx expo prebuild --platform android --no-install

      - name: Configure Keystore & Gradle Signing
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 -d > apps/mobile/android/app/release.keystore
          cat <<EOF > apps/mobile/android/gradle.properties
          RELEASE_STORE_FILE=release.keystore
          RELEASE_STORE_PASSWORD=$KEYSTORE_PASSWORD
          RELEASE_KEY_ALIAS=$KEY_ALIAS
          RELEASE_KEY_PASSWORD=$KEY_PASSWORD
          EOF

      - name: Build Release APK
        env:
          VERSION_CODE: ${{ github.run_number }}
        run: |
          cd apps/mobile/android
          ./gradlew assembleRelease -PversionCode=$VERSION_CODE

      - name: Compute SHA-256 & Generate Manifest
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          VERSION_CODE=${{ github.run_number }}
          APK_PATH="apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
          SHA256=$(sha256sum $APK_PATH | awk '{print $1}')
          
          echo "{\"version\":\"$VERSION\",\"versionCode\":$VERSION_CODE,\"apkUrl\":\"https://analytics.sufyaanstudio.workers.dev/download/analytics-latest.apk\",\"sha256\":\"$SHA256\"}" > latest.json
          
          # Create both versioned and latest copies
          cp $APK_PATH analytics-$VERSION.apk
          cp $APK_PATH analytics-latest.apk

      - name: Upload Manifest to R2
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: r2 object put analytics-releases/latest.json --file=latest.json

      - name: Upload Versioned APK to R2
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: r2 object put analytics-releases/analytics-${{ github.ref_name }}.apk --file=analytics-${{ github.ref_name }}.apk

      - name: Upload Latest APK to R2
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: r2 object put analytics-releases/analytics-latest.apk --file=analytics-latest.apk

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            analytics-*.apk
            latest.json
```

---

## 3.16 Delivery Milestones & Work Estimates

| Phase | Scope | Deliverable | Est. Duration |
|---|---|---|---|
| **Phase 0: Setup** | Monorepo Expo app, NativeWind tokens, Geist fonts, tab layout | App skeleton with mock data | 2 Days |
| **Phase 1: Parity**| Supabase client, auth screens, dashboard, chart, breakdowns | Internal working APK (v0.5) | 6 Days |
| **Phase 2: Sync**  | TanStack cache persistence, foreground sync, realtime poll | Release Candidate APK (v0.9) | 4 Days |
| **Phase 3: Release**| GitHub Actions CI, R2 hosting, in-app updater, `/download` web page | **Public Live Release (v1.0)** | 3 Days |
| **Phase 4: Push**  | Push token schema, Worker cron digest, notification settings | Push-enabled Update (v1.1) | 3 Days |

---

## 3.17 Risk Management & Mitigation Runbook

| Identified Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Metro pnpm Resolution** | Medium | Use `metro.config.js` with `node-linker=hoisted` or Metro workspace symlink config. |
| **Keystore Loss** | High | Back up keystore and passwords in two separate encrypted offline password managers on Day 1. |
| **Android Sideload Warning** | Medium | Create a clean, step-by-step visual installation guide on the website `/download` page. |
| **Supabase Free Connection Limit**| Low | Enforce foreground-only polling and disconnect Realtime WebSockets when the app is in the background. |

---

# Appendices

## Appendix A: Pinned SDK 54 `package.json` Dependencies

```json
{
  "name": "@analytics/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "build:apk": "expo prebuild -p android && cd android && ./gradlew assembleRelease",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@analytics/db": "workspace:*",
    "@analytics/ui": "workspace:*",
    "@react-native-async-storage/async-storage": "^2.1.2",
    "@supabase/supabase-js": "^2.49.1",
    "@tanstack/query-async-storage-persister": "^5.67.2",
    "@tanstack/react-query": "^5.67.2",
    "expo": "~54.0.0",
    "expo-application": "~7.0.0",
    "expo-constants": "~18.0.0",
    "expo-file-system": "~19.0.0",
    "expo-font": "~14.0.0",
    "expo-intent-launcher": "~12.0.0",
    "expo-notifications": "~0.31.0",
    "expo-router": "~6.0.0",
    "expo-secure-store": "~15.0.0",
    "expo-status-bar": "~3.0.0",
    "expo-updates": "~1.0.0",
    "lucide-react-native": "^0.477.0",
    "nativewind": "^4.1.23",
    "react": "19.0.0",
    "react-native": "0.81.0",
    "react-native-blob-util": "^0.21.0",
    "react-native-gifted-charts": "^1.4.55",
    "react-native-safe-area-context": "^5.2.0",
    "react-native-screens": "~4.7.0",
    "react-native-svg": "^15.11.2",
    "react-native-url-polyfill": "^2.0.0",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@types/react": "~19.0.10",
    "typescript": "^5.7.3"
  }
}
```

---

## Appendix B: Proposed Mobile Project Directory Tree

```
apps/mobile/
├── app.json
├── index.ts
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── assets/
│   ├── fonts/
│   │   ├── Geist-Regular.ttf
│   │   ├── Geist-Medium.ttf
│   │   ├── Geist-SemiBold.ttf
│   │   └── GeistMono-Regular.ttf
│   ├── icon.png
│   ├── adaptive-icon.png
│   └── splash.png
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── realtime.tsx
│   │   ├── sites.tsx
│   │   └── settings.tsx
│   └── site/
│       └── [panel].tsx
└── src/
    ├── lib/
    │   ├── supabase.ts
    │   ├── queries.ts
    │   ├── updater.ts
    │   └── notifications.ts
    ├── data/
    │   ├── keys.ts
    │   └── hooks.ts
    ├── theme/
    │   └── tokens.ts
    └── components/
        ├── StatsCard.tsx
        ├── ChartCard.tsx
        ├── PanelCard.tsx
        ├── DataTableRow.tsx
        ├── RangePills.tsx
        ├── LiveDot.tsx
        ├── SkeletonRows.tsx
        └── Toast.tsx
```

---

## Appendix C: React Query Hook → Supabase RPC Contract Map

| Custom Mobile Hook | Query Key | Target Supabase RPC / Table | Purpose |
|---|---|---|---|
| `useSites()` | `['sites']` | `supabase.from('websites').select('*')` | List all user websites & quotas |
| `useOverview(siteId, range, filter)` | `['overview', siteId, range, filter]` | `rpc('get_dashboard_overview', ...)` | Whole dashboard data payload |
| `useRealtime(siteId)` | `['realtime', siteId]` | `rpc('get_realtime_visitors', ...)` | 5-minute active visitors & pages |
| `useWipeSite(siteId)` | Mutation | `rpc('wipe_website_data', ...)` | Clear website analytics data |
| `useCheckUpdate()` | `['app_version']` | `GET /download/latest.json` | Sideload update check |
| `useRegisterPush()` | Mutation | `supabase.from('push_tokens').upsert(...)` | Register device for FCM daily digest |

---

## Appendix D: Production-Grade In-App APK Updater (`updater.ts`)

```typescript
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import ReactNativeBlobUtil from 'react-native-blob-util';

export interface UpdateManifest {
  version: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  changelog?: string;
}

/**
 * Checks for a newer application build by comparing integer versionCodes.
 * Avoids string comparison bugs and downgrade false-positives.
 */
export async function checkForAppUpdate(manifestUrl: string): Promise<UpdateManifest | null> {
  const res = await fetch(`${manifestUrl}?t=${Date.now()}`);
  if (!res.ok) return null;
  const manifest: UpdateManifest = await res.json();
  
  const currentVersionCode = Number(Application.nativeBuildVersion) || 1;
  if (manifest.versionCode > currentVersionCode) {
    return manifest;
  }
  return null;
}

/**
 * Downloads the APK, computes SHA-256 natively in C++/Java (streaming),
 * and launches the Android Package Installer via FileProvider.
 */
export async function downloadAndInstallApk(
  manifest: UpdateManifest,
  onProgress?: (progress: number) => void
): Promise<void> {
  const targetPath = `${FileSystem.cacheDirectory}analytics-update.apk`;

  // Clean up any stale partial download
  const info = await FileSystem.getInfoAsync(targetPath);
  if (info.exists) {
    await FileSystem.deleteAsync(targetPath, { idempotent: true });
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    manifest.apkUrl,
    targetPath,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      if (onProgress) onProgress(progress);
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || result.status !== 200) throw new Error('Failed to download APK update.');

  // Native streaming SHA-256 hash calculation (milliseconds, zero JS-heap overhead)
  const normalizedPath = result.uri.replace('file://', '');
  const computedHash = await ReactNativeBlobUtil.fs.hash(normalizedPath, 'sha256');

  if (computedHash.toLowerCase() !== manifest.sha256.toLowerCase()) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error('Integrity check failed: Checksum mismatch. Download was rejected.');
  }

  // Generate content:// URI via FileProvider
  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  // Invoke system package installer with grant read permission
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
```
