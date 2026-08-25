// apps/mobile/app/(tabs)/index.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSites, useOverview } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { StatsCard } from '../../src/components/StatsCard';
import { ChartCard } from '../../src/components/ChartCard';
import { PanelCard } from '../../src/components/PanelCard';
import { DataTableRow } from '../../src/components/DataTableRow';
import { RangePills } from '../../src/components/RangePills';
import { LiveDot } from '../../src/components/LiveDot';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { Toast } from '../../src/components/Toast';
import { formatNumber, formatDuration, percentDelta } from '@analytics/ui/format';
import { AI_SOURCE_LABELS } from '@analytics/db/constants';
import type { DashboardRange, DashboardFilter, Website } from '@analytics/db/types';
import {
  ChevronDown,
  RefreshCw,
  X,
  Sparkles,
  Users,
  Eye,
  Activity,
  Clock,
  Check,
  Search,
  Globe,
  Compass,
  Monitor,
  Zap,
  Filter,
} from 'lucide-react-native';

export default function OverviewScreen() {
  const router = useRouter();
  const { data: sites = [], isLoading: sitesLoading, refetch: refetchSites } = useSites();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [filter, setFilter] = useState<DashboardFilter | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  
  // Breakdown tabs
  const [acqTab, setAcqTab] = useState<'referrer' | 'channel' | 'ai'>('referrer');
  const [deviceTab, setDeviceTab] = useState<'browsers' | 'os' | 'devices'>('browsers');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active website
  const activeSite: Website | undefined = useMemo(() => {
    if (!sites.length) return undefined;
    if (selectedSiteId) {
      const found = sites.find((s) => s.id === selectedSiteId);
      if (found) return found;
    }
    return sites[0];
  }, [sites, selectedSiteId]);

  const activeSiteId = activeSite?.id;

  const {
    data: overview,
    isLoading: overviewLoading,
    isRefetching,
    refetch: refetchOverview,
  } = useOverview(activeSiteId, range, filter);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchSites(), refetchOverview()]);
  }, [refetchSites, refetchOverview]);

  const handleFilter = (type: 'path' | 'referrer' | 'country', value: string) => {
    if (filter?.type === type && filter.value === value) {
      setFilter(null);
      setToastMsg('Filter cleared');
    } else {
      setFilter({ type, value });
      setToastMsg(`Filtered by ${type}: ${value}`);
    }
  };

  const stats = overview?.stats;
  const prevStats = overview?.prev_stats;
  const pages = overview?.pages || [];
  const referrers = overview?.referrers || [];
  const channels = overview?.channels || [];
  const aiSources = overview?.ai_sources || [];
  const countries = overview?.countries || [];
  const devices = overview?.devices || { browsers: [], os: [], devices: [] };
  const events = overview?.events || [];

  const maxPageViews = useMemo(
    () => (pages.length ? Math.max(...pages.map((p) => Number(p.pageviews))) : 1),
    [pages]
  );
  const maxReferrerViews = useMemo(
    () => (referrers.length ? Math.max(...referrers.map((r) => Number(r.pageviews))) : 1),
    [referrers]
  );
  const maxChannelViews = useMemo(
    () => (channels.length ? Math.max(...channels.map((c) => Number(c.pageviews))) : 1),
    [channels]
  );
  const maxAiViews = useMemo(
    () => (aiSources.length ? Math.max(...aiSources.map((a) => Number(a.pageviews))) : 1),
    [aiSources]
  );
  const maxCountryVisitors = useMemo(
    () => (countries.length ? Math.max(...countries.map((c) => Number(c.visitors))) : 1),
    [countries]
  );
  const maxDeviceCount = useMemo(() => {
    const list = devices[deviceTab] || [];
    return list.length ? Math.max(...list.map((d) => Number(d.count))) : 1;
  }, [devices, deviceTab]);
  const maxEventCount = useMemo(
    () => (events.length ? Math.max(...events.map((e) => Number(e.total_events))) : 1),
    [events]
  );

  const visitorsDelta = useMemo(
    () =>
      stats && prevStats
        ? percentDelta(stats.visitors, prevStats.visitors)
        : null,
    [stats, prevStats]
  );

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return sites;
    const q = siteSearch.toLowerCase();
    return sites.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.domain?.toLowerCase().includes(q)
    );
  }, [sites, siteSearch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top App Header (Signature Web Dark Chrome) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.siteSelector}
          onPress={() => {
            setSiteSearch('');
            setSitePickerOpen(true);
          }}
          activeOpacity={0.8}
        >
          <LiveDot size={7} color={tokens.colors.accentMint} />
          <View style={styles.siteInfo}>
            <Text style={styles.siteDomain} numberOfLines={1}>
              {activeSite?.name || activeSite?.domain || 'Select Website'}
            </Text>
            <Text style={styles.siteSub} numberOfLines={1}>
              {activeSite?.domain || 'No site selected'}
            </Text>
          </View>
          <ChevronDown size={14} color={tokens.colors.bodyMuted} />
        </TouchableOpacity>

        {/* Sync / Refresh Button */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw
            size={16}
            color={isRefetching ? tokens.colors.accentMint : '#ffffff'}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content Area (Studio White Canvas) */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={tokens.colors.ink}
          />
        }
      >
        {/* Controls Bar: Range Pills + Active Filter Chip */}
        <View style={styles.controlsBar}>
          <RangePills selected={range} onSelect={setRange} />
          {filter && (
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => {
                setFilter(null);
                setToastMsg('Filter cleared');
              }}
              activeOpacity={0.7}
            >
              <Filter size={11} color={tokens.colors.ink} />
              <Text style={styles.filterPillText} numberOfLines={1}>
                {filter.type}: {filter.value}
              </Text>
              <X size={12} color={tokens.colors.body} />
            </TouchableOpacity>
          )}
        </View>

        {!sitesLoading && sites.length === 0 ? (
          <View style={styles.emptySiteCard}>
            <Sparkles size={32} color={tokens.colors.accentOrange} />
            <Text style={styles.emptySiteTitle}>NO WEBSITES CONFIGURED</Text>
            <Text style={styles.emptySiteSub}>
              You haven't added any websites yet. Register a domain on the web dashboard to start tracking visitors and views.
            </Text>
            <TouchableOpacity style={styles.emptySiteBtn} onPress={onRefresh} activeOpacity={0.8}>
              <RefreshCw size={14} color="#ffffff" />
              <Text style={styles.emptySiteBtnText}>Sync Websites</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 2x2 KPI Stats Grid (Tinted Mint & Periwinkle matching Web) */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <StatsCard
                  label="VISITORS"
                  value={formatNumber(stats?.visitors)}
                  delta={visitorsDelta}
                  variant="mint"
                  loading={overviewLoading && !overview}
                  icon={<Users size={14} color="#000000" />}
                />
                <StatsCard
                  label="PAGEVIEWS"
                  value={formatNumber(stats?.pageviews)}
                  variant="periwinkle"
                  loading={overviewLoading && !overview}
                  icon={<Eye size={14} color="#000000" />}
                />
              </View>

              <View style={styles.kpiRow}>
                <StatsCard
                  label="BOUNCE RATE"
                  value={`${stats?.bounce_rate ?? 0}%`}
                  variant="plain"
                  loading={overviewLoading && !overview}
                  icon={<Activity size={14} color={tokens.colors.body} />}
                />
                <StatsCard
                  label="AVG DURATION"
                  value={formatDuration(stats?.avg_duration_seconds)}
                  variant="plain"
                  loading={overviewLoading && !overview}
                  icon={<Clock size={14} color={tokens.colors.body} />}
                />
              </View>
            </View>

            {/* Activity Timeseries Chart */}
            <ChartCard
              timeseries={overview?.timeseries || []}
              interval={range === '24h' ? 'hour' : 'day'}
              loading={overviewLoading}
            />

            {/* Breakdown Hub */}
            {overviewLoading && !overview ? (
              <SkeletonRows count={6} />
            ) : (
              <>
                {/* Panel 1: Top Pages & Paths */}
                <PanelCard
                  title="TOP PAGES & PATHS"
                  icon={<Globe size={13} color={tokens.colors.body} />}
                  totalCount={pages.length}
                  actionText="VIEW ALL"
                  onAction={() =>
                    router.push({
                      pathname: '/site/[panel]',
                      params: {
                        panel: 'pages',
                        siteId: activeSiteId || '',
                        siteName: activeSite?.name || '',
                      },
                    })
                  }
                >
                  {pages.length === 0 ? (
                    <Text style={styles.emptyText}>No page views recorded in this period</Text>
                  ) : (
                    pages.slice(0, 5).map((p, idx) => (
                      <DataTableRow
                        key={`page-${idx}`}
                        rank={idx + 1}
                        label={p.url_path}
                        value={formatNumber(p.pageviews)}
                        secondaryValue={`${formatNumber(p.visitors)} u`}
                        percentage={(Number(p.pageviews) / maxPageViews) * 100}
                        barColor="rgba(200, 246, 249, 0.45)"
                        onPress={() => handleFilter('path', p.url_path)}
                      />
                    ))
                  )}
                </PanelCard>

                {/* Panel 2: Traffic Acquisition */}
                <PanelCard
                  title="TRAFFIC ACQUISITION"
                  icon={<Compass size={13} color={tokens.colors.body} />}
                  totalCount={
                    acqTab === 'referrer'
                      ? referrers.length
                      : acqTab === 'channel'
                      ? channels.length
                      : aiSources.length
                  }
                  tabs={[
                    { id: 'referrer', label: 'REFERRERS', count: referrers.length },
                    { id: 'channel', label: 'UTM CHANNELS', count: channels.length },
                    { id: 'ai', label: 'AI SEARCH', count: aiSources.length },
                  ]}
                  activeTab={acqTab}
                  onTabChange={setAcqTab}
                  actionText="VIEW ALL"
                  onAction={() =>
                    router.push({
                      pathname: '/site/[panel]',
                      params: {
                        panel:
                          acqTab === 'referrer'
                            ? 'referrers'
                            : acqTab === 'channel'
                            ? 'channels'
                            : 'referrers',
                        siteId: activeSiteId || '',
                        siteName: activeSite?.name || '',
                      },
                    })
                  }
                >
                  {acqTab === 'referrer' ? (
                    referrers.length === 0 ? (
                      <Text style={styles.emptyText}>Direct traffic / No external referrers</Text>
                    ) : (
                      referrers.slice(0, 5).map((r, idx) => (
                        <DataTableRow
                          key={`ref-${idx}`}
                          rank={idx + 1}
                          label={r.referrer_domain || 'Direct / None'}
                          value={formatNumber(r.pageviews)}
                          secondaryValue={`${formatNumber(r.visitors)} u`}
                          percentage={(Number(r.pageviews) / maxReferrerViews) * 100}
                          barColor="rgba(189, 187, 255, 0.35)"
                          onPress={() =>
                            handleFilter('referrer', r.referrer_domain || '')
                          }
                        />
                      ))
                    )
                  ) : acqTab === 'channel' ? (
                    channels.length === 0 ? (
                      <Text style={styles.emptyText}>No UTM campaign parameters detected</Text>
                    ) : (
                      channels.slice(0, 5).map((c, idx) => (
                        <DataTableRow
                          key={`chan-${idx}`}
                          rank={idx + 1}
                          label={c.utm_source || 'Unknown'}
                          value={formatNumber(c.pageviews)}
                          secondaryValue={`${formatNumber(c.visitors)} u`}
                          percentage={(Number(c.pageviews) / maxChannelViews) * 100}
                          barColor="rgba(189, 187, 255, 0.35)"
                        />
                      ))
                    )
                  ) : (
                    aiSources.length === 0 ? (
                      <Text style={styles.emptyText}>No AI search engine referral traffic</Text>
                    ) : (
                      aiSources.slice(0, 5).map((a, idx) => (
                        <DataTableRow
                          key={`ai-${idx}`}
                          rank={idx + 1}
                          label={AI_SOURCE_LABELS[a.source] || a.source}
                          value={formatNumber(a.pageviews)}
                          secondaryValue={`${formatNumber(a.visitors)} u`}
                          percentage={(Number(a.pageviews) / maxAiViews) * 100}
                          barColor="rgba(252, 76, 2, 0.2)"
                        />
                      ))
                    )
                  )}
                </PanelCard>

                {/* Panel 3: Geographic Distribution */}
                <PanelCard
                  title="GEOGRAPHIC DISTRIBUTION"
                  icon={<Globe size={13} color={tokens.colors.body} />}
                  totalCount={countries.length}
                  actionText="VIEW ALL"
                  onAction={() =>
                    router.push({
                      pathname: '/site/[panel]',
                      params: {
                        panel: 'countries',
                        siteId: activeSiteId || '',
                        siteName: activeSite?.name || '',
                      },
                    })
                  }
                >
                  {countries.length === 0 ? (
                    <Text style={styles.emptyText}>No country telemetry recorded</Text>
                  ) : (
                    countries.slice(0, 5).map((c, idx) => (
                      <DataTableRow
                        key={`country-${idx}`}
                        rank={idx + 1}
                        label={c.country || 'Unknown'}
                        value={formatNumber(c.visitors)}
                        secondaryValue={`${c.sessions} sessions`}
                        percentage={(Number(c.visitors) / maxCountryVisitors) * 100}
                        barColor="rgba(200, 246, 249, 0.45)"
                        onPress={() => handleFilter('country', c.country || '')}
                      />
                    ))
                  )}
                </PanelCard>

                {/* Panel 4: Devices & Platforms */}
                <PanelCard
                  title="DEVICES & BROWSERS"
                  icon={<Monitor size={13} color={tokens.colors.body} />}
                  totalCount={(devices[deviceTab] || []).length}
                  tabs={[
                    { id: 'browsers', label: 'BROWSERS' },
                    { id: 'os', label: 'OPERATING SYSTEMS' },
                    { id: 'devices', label: 'DEVICES' },
                  ]}
                  activeTab={deviceTab}
                  onTabChange={setDeviceTab}
                  actionText="VIEW ALL"
                  onAction={() =>
                    router.push({
                      pathname: '/site/[panel]',
                      params: {
                        panel: 'devices',
                        siteId: activeSiteId || '',
                        siteName: activeSite?.name || '',
                      },
                    })
                  }
                >
                  {(devices[deviceTab] || []).length === 0 ? (
                    <Text style={styles.emptyText}>No device metrics recorded</Text>
                  ) : (
                    (devices[deviceTab] || []).slice(0, 5).map((d, idx) => (
                      <DataTableRow
                        key={`dev-${idx}`}
                        rank={idx + 1}
                        label={d.name || 'Unknown'}
                        value={formatNumber(d.count)}
                        percentage={(Number(d.count) / maxDeviceCount) * 100}
                        barColor="rgba(189, 187, 255, 0.35)"
                      />
                    ))
                  )}
                </PanelCard>

                {/* Panel 5: Custom Conversion Events */}
                {events.length > 0 && (
                  <PanelCard
                    title="CUSTOM EVENTS"
                    icon={<Zap size={13} color={tokens.colors.body} />}
                    totalCount={events.length}
                    actionText="VIEW ALL"
                    onAction={() =>
                      router.push({
                        pathname: '/site/[panel]',
                        params: {
                          panel: 'events',
                          siteId: activeSiteId || '',
                          siteName: activeSite?.name || '',
                        },
                      })
                    }
                  >
                    {events.slice(0, 5).map((e, idx) => (
                      <DataTableRow
                        key={`evt-${idx}`}
                        rank={idx + 1}
                        label={e.event_name}
                        value={formatNumber(e.total_events)}
                        secondaryValue={`${formatNumber(e.unique_visitors)} u`}
                        percentage={(Number(e.total_events) / maxEventCount) * 100}
                        barColor="rgba(252, 76, 2, 0.2)"
                      />
                    ))}
                  </PanelCard>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Site Selector Modal */}
      <Modal
        visible={sitePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSitePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSitePickerOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={16} color={tokens.colors.ink} />
                <Text style={styles.modalTitle}>SELECT ACTIVE WEBSITE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSitePickerOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>

            {/* Search Input for Sites */}
            <View style={styles.modalSearchWrapper}>
              <Search size={14} color={tokens.colors.bodyMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search websites..."
                placeholderTextColor={tokens.colors.bodyMuted}
                value={siteSearch}
                onChangeText={setSiteSearch}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredSites}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isSelected = item.id === activeSiteId;
                return (
                  <TouchableOpacity
                    style={[styles.siteOption, isSelected && styles.siteOptionSelected]}
                    onPress={() => {
                      setSelectedSiteId(item.id);
                      setSitePickerOpen(false);
                      setToastMsg(`Switched to ${item.name || item.domain}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.siteOptionLeft}>
                      <LiveDot
                        size={6}
                        color={isSelected ? tokens.colors.accentMintDark : tokens.colors.bodyMuted}
                      />
                      <View>
                        <Text style={[styles.siteOptionName, isSelected && { fontWeight: '700' }]}>
                          {item.name || item.domain}
                        </Text>
                        <Text style={styles.siteOptionDomain}>{item.domain}</Text>
                      </View>
                    </View>
                    {isSelected && <Check size={16} color={tokens.colors.ink} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <Toast
          message={toastMsg}
          onDismiss={() => setToastMsg(null)}
          duration={2500}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.canvasDark,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.canvasDark,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surfaceDarkSoft,
  },
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  siteInfo: {
    flexShrink: 1,
  },
  siteDomain: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  siteSub: {
    color: tokens.colors.bodyDark,
    fontSize: 11,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radii.xs,
    backgroundColor: tokens.colors.surfaceDarkSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  scrollContainer: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing['3xl'],
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.full,
    ...tokens.shadows.card,
  },
  filterPillText: {
    color: tokens.colors.ink,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 160,
  },
  emptySiteCard: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    alignItems: 'center',
    gap: 12,
    marginVertical: tokens.spacing.xl,
    ...tokens.shadows.card,
  },
  emptySiteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
    letterSpacing: 0.8,
  },
  emptySiteSub: {
    fontSize: 12,
    color: tokens.colors.body,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptySiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radii.xs,
    marginTop: 6,
  },
  emptySiteBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiGrid: {
    gap: 10,
    marginBottom: tokens.spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyText: {
    color: tokens.colors.textMuted,
    fontSize: 12,
    paddingVertical: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.surfaceCard,
    borderTopLeftRadius: tokens.radii.lg,
    borderTopRightRadius: tokens.radii.lg,
    padding: tokens.spacing.lg,
    maxHeight: '80%',
    ...tokens.shadows.cardElevated,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    borderRadius: tokens.radii.xs,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
    marginBottom: tokens.spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 13,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: tokens.radii.xs,
    marginVertical: 2,
  },
  siteOptionSelected: {
    backgroundColor: tokens.colors.surfaceSubtle,
  },
  siteOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  siteOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  siteOptionDomain: {
    fontSize: 11,
    color: tokens.colors.body,
    marginTop: 1,
  },
});
