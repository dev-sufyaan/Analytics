// apps/mobile/app/(tabs)/realtime.tsx — Light premium realtime with project selector
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSites, useRealtime } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { LiveDot } from '../../src/components/LiveDot';
import { PanelCard } from '../../src/components/PanelCard';
import { DataTableRow } from '../../src/components/DataTableRow';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { formatNumber } from '@analytics/ui/format';
import { Play, Pause, RefreshCw, Radio, Users, Zap, ChevronDown, Search, Check, Globe } from 'lucide-react-native';

export default function RealtimeScreen() {
  const { data: sites = [] } = useSites();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [isLive, setIsLive] = useState(true);

  // Select active site with picker support — mirrors Overview logic for parity
  const activeSite = useMemo(() => {
    if (!sites.length) return undefined;
    if (selectedSiteId) {
      const found = sites.find((s) => s.id === selectedSiteId);
      if (found) return found;
    }
    return sites[0];
  }, [sites, selectedSiteId]);
  const activeSiteId = activeSite?.id;

  // Radar animation
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.5)).current;
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    if (!isLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(radarScale, { toValue: 2.2, duration: 1800, useNativeDriver: isNative }),
          Animated.timing(radarOpacity, { toValue: 0, duration: 1800, useNativeDriver: isNative }),
        ]),
        Animated.parallel([
          Animated.timing(radarScale, { toValue: 1, duration: 0, useNativeDriver: isNative }),
          Animated.timing(radarOpacity, { toValue: 0.5, duration: 0, useNativeDriver: isNative }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive, radarScale, radarOpacity, isNative]);

  const { data: realtimeData, isLoading, isRefetching, refetch } = useRealtime(activeSiteId, isLive);

  const activeVisitors = realtimeData?.active_visitors ?? 0;
  const activePages = realtimeData?.active_pages ?? [];
  const maxPageCount = useMemo(() => (activePages.length ? Math.max(...activePages.map((p) => p.count)) : 1), [activePages]);

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return sites;
    const q = siteSearch.toLowerCase();
    return sites.filter((s) => s.name?.toLowerCase().includes(q) || s.domain?.toLowerCase().includes(q));
  }, [sites, siteSearch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Light Header with Project Selector */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.siteSelector}
          onPress={() => {
            setSiteSearch('');
            setSitePickerOpen(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.siteIconWrap}>
            <Globe size={14} color={tokens.colors.ink} />
          </View>
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

        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()} activeOpacity={0.7}>
          <RefreshCw size={16} color={isRefetching ? tokens.colors.accentMintDark : tokens.colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={tokens.colors.ink} />}
      >
        {/* Light Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroStatusRow}>
            <View style={[styles.liveBadge, !isLive && styles.liveBadgePaused]}>
              <LiveDot size={7} color={isLive ? '#059669' : tokens.colors.bodyMuted} />
              <Text style={[styles.liveText, !isLive && { color: tokens.colors.bodyMuted }]}>
                {isLive ? 'LIVE (TRAILING 5 MIN)' : 'PAUSED'}
              </Text>
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.actionPill} onPress={() => setIsLive(!isLive)} activeOpacity={0.7}>
                {isLive ? (
                  <>
                    <Pause size={11} color={tokens.colors.ink} />
                    <Text style={styles.actionPillText}>PAUSE</Text>
                  </>
                ) : (
                  <>
                    <Play size={11} color={tokens.colors.trendPositive} />
                    <Text style={[styles.actionPillText, { color: tokens.colors.trendPositive }]}>RESUME</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.refreshBtnSmall} onPress={() => refetch()} activeOpacity={0.7}>
                <RefreshCw size={14} color={isRefetching ? tokens.colors.accentMintDark : tokens.colors.ink} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.radarContainer}>
            {isLive && <Animated.View style={[styles.radarPulseRing, { transform: [{ scale: radarScale }], opacity: radarOpacity }]} />}
            <View style={styles.radarCoreCircle}>
              <Text style={styles.counterNumber}>{activeVisitors}</Text>
            </View>
          </View>

          <Text style={styles.counterSubtitle}>CURRENT ACTIVE VISITORS</Text>
          <Text style={styles.counterWindowText}>Live concurrent visitors on site</Text>
          <View style={styles.heroFootnote}>
            <Radio size={10} color={tokens.colors.accentMintDark} />
            <Text style={styles.heroFootnoteText}>Updates every 15s · Matches web /app/[id]/realtime parity</Text>
          </View>
        </View>

        {/* Active pages stream */}
        <PanelCard title="ACTIVE PAGES STREAM" icon={<Zap size={13} color={tokens.colors.body} />} totalCount={activePages.length}>
          {isLoading && !realtimeData ? (
            <SkeletonRows count={3} />
          ) : activePages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={28} color={tokens.colors.bodyMuted} />
              <Text style={styles.emptyTitle}>No active visitors right now</Text>
              <Text style={styles.emptySub}>Visitors browsing your pages will appear here dynamically in real-time.</Text>
            </View>
          ) : (
            activePages.map((page, idx) => (
              <DataTableRow
                key={`page-${idx}`}
                rank={idx + 1}
                label={page.url_path}
                value={formatNumber(page.count)}
                // page.count is the count of DISTINCT active sessions on this
                // path (Umami-style Set semantics), so "active" is the
                // truthful label. "1 visitor" / "N visitors" would imply the
                // raw event count.
                secondaryValue={page.count === 1 ? '1 active' : `${page.count} active`}
                percentage={(page.count / maxPageCount) * 100}
                barColor="rgba(200, 246, 249, 0.55)"
              />
            ))
          )}
        </PanelCard>

        {/* Hint card for accuracy */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How realtime is counted</Text>
          <Text style={styles.infoText}>Active visitors = distinct sessions in the last 5 minutes (get_realtime_visitors RPC). Page counts = distinct active sessions on that path. Same source the web dashboard uses, so mobile and web stay perfectly in sync.</Text>
        </View>
      </ScrollView>

      {/* Project Picker Modal */}
      <Modal visible={sitePickerOpen} transparent animationType="fade" onRequestClose={() => setSitePickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSitePickerOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={16} color={tokens.colors.ink} />
                <Text style={styles.modalTitle}>SELECT ACTIVE WEBSITE</Text>
              </View>
              <TouchableOpacity onPress={() => setSitePickerOpen(false)} activeOpacity={0.7}>
                <Text style={{ fontSize: 18, color: tokens.colors.body, lineHeight: 18 }}>×</Text>
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
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isSelected = item.id === activeSiteId;
                return (
                  <TouchableOpacity
                    style={[styles.siteOption, isSelected && styles.siteOptionSelected]}
                    onPress={() => {
                      setSelectedSiteId(item.id);
                      setSitePickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.siteOptionLeft}>
                      <LiveDot size={6} color={isSelected ? tokens.colors.trendPositive : tokens.colors.bodyMuted} />
                      <View>
                        <Text style={[styles.siteOptionName, isSelected && { fontWeight: '700' }]}>{item.name || item.domain}</Text>
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
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
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
  siteDomain: { color: '#0f172a', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  siteSub: { color: '#64748b', fontSize: 11, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { padding: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveBadgePaused: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  liveText: { color: '#059669', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillText: { color: '#0f172a', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  refreshBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 8 },
  radarPulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6,182,214,0.06)',
  },
  radarCoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  counterNumber: { fontSize: 52, fontWeight: '900', color: '#0f172a', letterSpacing: -1.5 },
  counterSubtitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 8 },
  counterWindowText: { fontSize: 11, color: '#64748b', marginTop: 3 },
  heroFootnote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  heroFootnoteText: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  emptyContainer: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 11, color: '#64748b', textAlign: 'center', maxWidth: 240, lineHeight: 16 },
  infoCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  infoTitle: { fontSize: 11, fontWeight: '700', color: '#334155', letterSpacing: 0.6, textTransform: 'uppercase' },
  infoText: { fontSize: 11.5, color: '#64748b', marginTop: 4, lineHeight: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
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
    height: 38,
    gap: 8,
    marginBottom: 8,
  },
  modalSearchInput: { flex: 1, color: '#0f172a', fontSize: 13 },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  siteOptionSelected: { backgroundColor: '#f8fafc' },
  siteOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteOptionName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  siteOptionDomain: { fontSize: 11, color: '#64748b', marginTop: 1 },
});
