// apps/mobile/app/(tabs)/events.tsx — Dedicated Events view (web parity)
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSites, useOverview, useEventStats } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { DataTableRow } from '../../src/components/DataTableRow';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { Toast } from '../../src/components/Toast';
import { formatNumber } from '@analytics/ui/format';
import { Zap, Search, X, Clock, Users, BarChart3, TrendingUp } from 'lucide-react-native';
import type { DashboardRange } from '@analytics/db/types';
import { RangePills } from '../../src/components/RangePills';
import { ChevronDown, Globe } from 'lucide-react-native';
import { Modal, FlatList } from 'react-native';
import { LiveDot } from '../../src/components/LiveDot';
import { Check } from 'lucide-react-native';

export default function EventsScreen() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>('30d');
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeSite = useMemo(() => {
    if (!sites.length) return undefined;
    if (selectedSiteId) {
      const f = sites.find((s) => s.id === selectedSiteId);
      if (f) return f;
    }
    return sites[0];
  }, [sites, selectedSiteId]);

  const activeSiteId = activeSite?.id;

  const { data: overview, isLoading, isRefetching, refetch } = useOverview(activeSiteId, range);
  // Aggregate KPIs come from the dedicated RPC — not from a sum over the
  // per-event list (which double-counts the same visitor across event names).
  const { data: eventStats } = useEventStats(activeSiteId, range);

  const events = overview?.events || [];
  const totalTriggers = eventStats?.events ?? 0;
  const uniqueVisitors = eventStats?.visitors ?? 0;
  const uniqueEventNames = eventStats?.unique_events ?? events.length;

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter((e) => e.event_name.toLowerCase().includes(q));
  }, [events, search]);

  const maxCount = useMemo(() => (filtered.length ? Math.max(...filtered.map((e) => Number(e.total_events))) : 1), [filtered]);

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return sites;
    const q = siteSearch.toLowerCase();
    return sites.filter((s) => s.name?.toLowerCase().includes(q) || s.domain?.toLowerCase().includes(q));
  }, [sites, siteSearch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.siteSelector} onPress={() => { setSiteSearch(''); setPickerOpen(true); }} activeOpacity={0.8}>
          <View style={styles.siteIconWrap}>
            <Globe size={14} color={tokens.colors.ink} />
          </View>
          <View style={styles.siteInfo}>
            <Text style={styles.siteDomain} numberOfLines={1}>
              {activeSite?.name || activeSite?.domain || 'Select Website'}
            </Text>
            <Text style={styles.siteSub} numberOfLines={1}>
              {activeSite?.domain || 'No site selected'} · {range.toUpperCase()}
            </Text>
          </View>
          <ChevronDown size={14} color={tokens.colors.bodyMuted} />
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{filtered.length} EVENTS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={tokens.colors.ink} />}
      >
        {/* Controls */}
        <View style={styles.controlsBar}>
          <RangePills selected={range} onSelect={setRange} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={14} color={tokens.colors.bodyMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search custom events..."
            placeholderTextColor={tokens.colors.bodyMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <X size={16} color={tokens.colors.bodyMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* KPI Mini row — sourced from the dedicated aggregate RPC, not from
            summing per-event fields (which double-counts the same visitor). */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrap}><Zap size={14} color="#0f172a" /></View>
            <Text style={styles.kpiLabel}>TOTAL TRIGGERS</Text>
            <Text style={styles.kpiValue}>{formatNumber(totalTriggers)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrap}><Users size={14} color="#0f172a" /></View>
            <Text style={styles.kpiLabel}>UNIQUE VISITORS</Text>
            <Text style={styles.kpiValue}>{formatNumber(uniqueVisitors)}</Text>
          </View>
        </View>

        {/* Events list */}
        <View style={styles.panelCard}>
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleRow}>
              <Zap size={13} color={tokens.colors.body} />
              <Text style={styles.panelTitle}>CUSTOM EVENTS</Text>
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{filtered.length}</Text></View>
            </View>
            <Text style={styles.panelSub}>Tracked via analytics.track(event)</Text>
          </View>

          {isLoading && !overview ? (
            <SkeletonRows count={5} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BarChart3 size={28} color={tokens.colors.bodyMuted} />
              <Text style={styles.emptyTitle}>{search ? 'No matching events' : 'No custom events yet'}</Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'Try a different search term.'
                  : 'Instrument analytics.track(\"purchase\", { value: 42 }) — events appear here in ~15s.'}
              </Text>
            </View>
          ) : (
            filtered.map((ev, idx) => (
              <DataTableRow
                key={`evt-${idx}`}
                rank={idx + 1}
                label={ev.event_name}
                value={formatNumber(ev.total_events)}
                secondaryValue={`${formatNumber(ev.unique_visitors)} visitors`}
                percentage={(Number(ev.total_events) / maxCount) * 100}
                barColor="rgba(189, 187, 255, 0.35)"
              />
            ))
          )}
        </View>

        {/* Info footer */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <TrendingUp size={12} color="#059669" />
            <Text style={styles.infoTitle}>Web parity</Text>
          </View>
          <Text style={styles.infoText}>Same get_dashboard_overview source as /app/[id]/events on web. Daily rollups retained forever; raw events per retention window.</Text>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={16} color={tokens.colors.ink} />
                <Text style={styles.modalTitle}>SELECT WEBSITE</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)} activeOpacity={0.7}>
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>
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
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const sel = item.id === activeSiteId;
                return (
                  <TouchableOpacity
                    style={[styles.siteOption, sel && styles.siteOptionSel]}
                    onPress={() => {
                      setSelectedSiteId(item.id);
                      setPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.siteOptionLeft}>
                      <LiveDot size={6} color={sel ? '#059669' : tokens.colors.bodyMuted} />
                      <View>
                        <Text style={[styles.siteOptionName, sel && { fontWeight: '700' }]}>{item.name || item.domain}</Text>
                        <Text style={styles.siteOptionDomain}>{item.domain}</Text>
                      </View>
                    </View>
                    {sel && <Check size={16} color={tokens.colors.ink} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {toastMsg && <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} duration={2200} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  siteSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 12 },
  siteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteInfo: { flexShrink: 1 },
  siteDomain: { color: '#0f172a', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  siteSub: { color: '#64748b', fontSize: 11, marginTop: 1 },
  headerBadge: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  headerBadgeText: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { padding: 16, paddingBottom: 32 },
  controlsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiIconWrap: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.6 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2, letterSpacing: -0.4 },
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  panelHeader: { marginBottom: 10 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelTitle: { fontSize: 10.5, fontWeight: '700', color: '#475569', letterSpacing: 0.7 },
  countBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  countBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  panelSub: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  emptyContainer: { paddingVertical: 36, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 11.5, color: '#64748b', textAlign: 'center', maxWidth: 280, lineHeight: 16 },
  infoCard: { marginTop: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12 },
  infoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTitle: { fontSize: 11, fontWeight: '700', color: '#334155', letterSpacing: 0.6, textTransform: 'uppercase' },
  infoText: { fontSize: 11.5, color: '#64748b', marginTop: 4, lineHeight: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 12, fontWeight: '700', color: '#475569', letterSpacing: 0.7 },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
    marginBottom: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  siteOptionSel: { backgroundColor: '#f8fafc' },
  siteOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteOptionName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  siteOptionDomain: { fontSize: 11, color: '#64748b', marginTop: 1 },
});
