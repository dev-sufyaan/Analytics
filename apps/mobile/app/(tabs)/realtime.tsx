// apps/mobile/app/(tabs)/realtime.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSites, useRealtime } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { LiveDot } from '../../src/components/LiveDot';
import { PanelCard } from '../../src/components/PanelCard';
import { DataTableRow } from '../../src/components/DataTableRow';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { formatNumber } from '@analytics/ui/format';
import { Play, Pause, RefreshCw, Radio, Users, Zap } from 'lucide-react-native';

export default function RealtimeScreen() {
  const { data: sites = [] } = useSites();
  const activeSite = sites.length > 0 ? sites[0] : undefined;
  const activeSiteId = activeSite?.id;

  const [isLive, setIsLive] = useState(true);

  // Radar Pulse Animation
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(0.6)).current;
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    if (!isLive) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(radarScale, {
            toValue: 2.3,
            duration: 1800,
            useNativeDriver: isNative,
          }),
          Animated.timing(radarOpacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: isNative,
          }),
        ]),
        Animated.parallel([
          Animated.timing(radarScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: isNative,
          }),
          Animated.timing(radarOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: isNative,
          }),
        ]),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [isLive, radarScale, radarOpacity, isNative]);

  const {
    data: realtimeData,
    isLoading,
    isRefetching,
    refetch,
  } = useRealtime(activeSiteId, isLive);

  const activeVisitors = realtimeData?.active_visitors ?? 0;
  const activePages = realtimeData?.active_pages ?? [];

  const maxPageCount = useMemo(
    () => (activePages.length ? Math.max(...activePages.map((p) => p.count)) : 1),
    [activePages]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Radio size={18} color={tokens.colors.accentMint} />
          <Text style={styles.headerTitle}>REALTIME VISITORS</Text>
        </View>
        <Text style={styles.siteName} numberOfLines={1}>
          {activeSite?.name || activeSite?.domain || 'Active Site'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={tokens.colors.ink}
          />
        }
      >
        {/* Giant Live Radar Hero Card (Deep Canvas Dark) */}
        <View style={styles.heroCard}>
          {/* Header Controls inside Hero */}
          <View style={styles.heroStatusRow}>
            <View style={styles.liveBadge}>
              <LiveDot size={8} color={isLive ? tokens.colors.accentMint : tokens.colors.bodyMuted} />
              <Text style={[styles.liveText, !isLive && { color: tokens.colors.bodyMuted }]}>
                {isLive ? 'LIVE (TRAILING 5 MIN)' : 'PAUSED'}
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => setIsLive(!isLive)}
                activeOpacity={0.7}
              >
                {isLive ? (
                  <>
                    <Pause size={11} color="#ffffff" />
                    <Text style={styles.actionPillText}>PAUSE</Text>
                  </>
                ) : (
                  <>
                    <Play size={11} color={tokens.colors.accentMint} />
                    <Text style={[styles.actionPillText, { color: tokens.colors.accentMint }]}>
                      RESUME
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => refetch()}
                activeOpacity={0.7}
              >
                <RefreshCw
                  size={14}
                  color={isRefetching ? tokens.colors.accentMint : '#ffffff'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Living Radar Ring Visualizer */}
          <View style={styles.radarContainer}>
            {isLive && (
              <Animated.View
                style={[
                  styles.radarPulseRing,
                  {
                    transform: [{ scale: radarScale }],
                    opacity: radarOpacity,
                  },
                ]}
              />
            )}
            <View style={styles.radarCoreCircle}>
              <Text style={styles.counterNumber}>{activeVisitors}</Text>
            </View>
          </View>

          <Text style={styles.counterSubtitle}>CURRENT ACTIVE VISITORS</Text>
          <Text style={styles.counterWindowText}>Live concurrent visitors on site</Text>
        </View>

        {/* Realtime Active Pages List */}
        <PanelCard
          title="ACTIVE PAGES STREAM"
          icon={<Zap size={13} color={tokens.colors.body} />}
          totalCount={activePages.length}
        >
          {isLoading && !realtimeData ? (
            <SkeletonRows count={3} />
          ) : activePages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={28} color={tokens.colors.bodyMuted} />
              <Text style={styles.emptyTitle}>No active visitors right now</Text>
              <Text style={styles.emptySub}>
                Visitors browsing your pages will appear here dynamically in real-time.
              </Text>
            </View>
          ) : (
            activePages.map((page, idx) => (
              <DataTableRow
                key={`page-${idx}`}
                rank={idx + 1}
                label={page.url_path}
                value={formatNumber(page.count)}
                secondaryValue={`${page.count === 1 ? '1 visitor' : `${page.count} visitors`}`}
                percentage={(page.count / maxPageCount) * 100}
                barColor="rgba(200, 246, 249, 0.45)"
              />
            ))
          )}
        </PanelCard>
      </ScrollView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  siteName: {
    color: tokens.colors.bodyDark,
    fontSize: 12,
    maxWidth: 160,
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  scrollContainer: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing['3xl'],
  },
  heroCard: {
    backgroundColor: tokens.colors.canvasDark,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.surfaceDarkSoft,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    ...tokens.shadows.cardElevated,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: tokens.spacing.lg,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.colors.surfaceDarkSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.full,
  },
  liveText: {
    color: tokens.colors.accentMint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokens.colors.surfaceDarkSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.xs,
  },
  actionPillText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: tokens.radii.xs,
    backgroundColor: tokens.colors.surfaceDarkSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  radarPulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: tokens.colors.accentMint,
    backgroundColor: 'rgba(200, 246, 249, 0.05)',
  },
  radarCoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: tokens.colors.surfaceDarkFill,
    borderWidth: 2,
    borderColor: 'rgba(200, 246, 249, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  counterSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.accentMint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  counterWindowText: {
    fontSize: 11,
    color: tokens.colors.bodyDark,
    marginTop: 3,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  emptySub: {
    fontSize: 11,
    color: tokens.colors.body,
    textAlign: 'center',
    maxWidth: 240,
  },
});
