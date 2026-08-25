// apps/mobile/app/(tabs)/sites.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSites } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { Toast } from '../../src/components/Toast';
import { LiveDot } from '../../src/components/LiveDot';
import { formatNumber } from '@analytics/ui/format';
import type { Website } from '@analytics/db/types';
import {
  Globe,
  ArrowUpRight,
  Share2,
  Shield,
  BarChart3,
  Code,
  Copy,
  X,
} from 'lucide-react-native';

export default function SitesScreen() {
  const router = useRouter();
  const { data: sites = [], isLoading, isRefetching, refetch } = useSites();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [snippetModalSite, setSnippetModalSite] = useState<Website | null>(null);

  const handleShare = (site: Website) => {
    if (site.is_public && site.share_token) {
      setToastMsg(`Public URL: /s/${site.share_token}`);
    } else {
      setToastMsg('Enable public dashboard in web settings to share.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Globe size={18} color={tokens.colors.accentMint} />
          <Text style={styles.headerTitle}>WEBSITES & QUOTAS</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{sites.length} SITES</Text>
        </View>
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
        {isLoading && sites.length === 0 ? (
          <SkeletonRows count={4} />
        ) : sites.length === 0 ? (
          <View style={styles.emptyState}>
            <Globe size={36} color={tokens.colors.bodyMuted} />
            <Text style={styles.emptyTitle}>No websites registered</Text>
            <Text style={styles.emptySub}>
              Register your domain on the web dashboard to start tracking visitors and events.
            </Text>
          </View>
        ) : (
          sites.map((site) => {
            const quota = site.monthly_event_quota || 25000;
            const used = site.events_this_month || 0;
            const quotaPct = Math.min((used / quota) * 100, 100);
            const isExceeded = used >= quota;
            const isNearLimit = quotaPct >= 80;

            return (
              <View key={site.id} style={styles.siteCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleArea}>
                    <View style={styles.titleWithBeacon}>
                      <LiveDot size={6} color={tokens.colors.accentMintDark} />
                      <Text style={styles.siteName}>{site.name || site.domain}</Text>
                    </View>
                    <Text style={styles.siteDomain}>{site.domain}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.openDashboardBtn}
                    onPress={() => {
                      router.replace('/(tabs)');
                    }}
                    activeOpacity={0.7}
                  >
                    <BarChart3 size={13} color="#ffffff" />
                    <Text style={styles.openDashboardText}>Overview</Text>
                    <ArrowUpRight size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Quota Progress Bar */}
                <View style={styles.quotaSection}>
                  <View style={styles.quotaLabels}>
                    <Text style={styles.quotaTitle}>MONTHLY EVENT CONSUMPTION</Text>
                    <Text
                      style={[
                        styles.quotaValue,
                        isExceeded
                          ? styles.quotaExceeded
                          : isNearLimit
                          ? styles.quotaNear
                          : null,
                      ]}
                    >
                      {formatNumber(used)} / {formatNumber(quota)} ({quotaPct.toFixed(0)}%)
                    </Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(quotaPct, 2)}%`,
                          backgroundColor: isExceeded
                            ? tokens.colors.trendNegative
                            : isNearLimit
                            ? tokens.colors.warning
                            : tokens.colors.ink,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Footer Metadata & Actions */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerItem}>
                    <Shield size={12} color={tokens.colors.bodyMuted} />
                    <Text style={styles.footerText}>
                      {site.data_retention_days || 30}-day retention
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.snippetBtn}
                      onPress={() => setSnippetModalSite(site)}
                      activeOpacity={0.7}
                    >
                      <Code size={12} color={tokens.colors.body} />
                      <Text style={styles.snippetBtnText}>Snippet</Text>
                    </TouchableOpacity>

                    {site.is_public && (
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleShare(site)}
                        activeOpacity={0.7}
                      >
                        <Share2 size={12} color={tokens.colors.trendPositive} />
                        <Text style={styles.shareBtnText}>Share</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Tracker Snippet Modal */}
      <Modal
        visible={!!snippetModalSite}
        transparent
        animationType="fade"
        onRequestClose={() => setSnippetModalSite(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.snippetModalDialog}>
            <View style={styles.snippetModalHeader}>
              <View style={styles.snippetTitleRow}>
                <Code size={16} color={tokens.colors.ink} />
                <Text style={styles.snippetModalTitle}>TRACKER CODE SNIPPET</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSnippetModalSite(null)}
                activeOpacity={0.7}
              >
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>

            <Text style={styles.snippetDomainDesc}>
              Embed this script before the closing &lt;/head&gt; tag on{' '}
              <Text style={{ color: tokens.colors.ink, fontWeight: '700' }}>
                {snippetModalSite?.domain}
              </Text>
              :
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                {`<script defer src="https://analytics.sufyaanstudio.workers.dev/t.js" data-web="${
                  snippetModalSite?.id || ''
                }"></script>`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.copySnippetBtn}
              onPress={() => {
                setToastMsg('Tracker script copied to clipboard!');
                setSnippetModalSite(null);
              }}
              activeOpacity={0.8}
            >
              <Copy size={14} color="#ffffff" />
              <Text style={styles.copySnippetBtnText}>Copy Snippet</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  badgeCount: {
    backgroundColor: tokens.colors.surfaceDarkSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.full,
  },
  badgeCountText: {
    color: tokens.colors.accentMint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  scrollContainer: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing['3xl'],
  },
  siteCard: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  titleArea: {
    flex: 1,
  },
  titleWithBeacon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteName: {
    color: tokens.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  siteDomain: {
    color: tokens.colors.body,
    fontSize: 12,
    marginTop: 2,
  },
  openDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.xs,
  },
  openDashboardText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  quotaSection: {
    backgroundColor: tokens.colors.surfaceSubtle,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.xs,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  quotaLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quotaTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.6,
  },
  quotaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  quotaNear: {
    color: tokens.colors.warning,
  },
  quotaExceeded: {
    color: tokens.colors.trendNegative,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: tokens.radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: tokens.radii.full,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 11,
    color: tokens.colors.bodyMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radii.xs,
  },
  snippetBtnText: {
    color: tokens.colors.body,
    fontSize: 11,
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.trendPositiveBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radii.xs,
  },
  shareBtnText: {
    color: tokens.colors.trendPositive,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptySub: {
    fontSize: 12,
    color: tokens.colors.body,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  snippetModalDialog: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    ...tokens.shadows.cardElevated,
  },
  snippetModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  snippetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snippetModalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
  },
  snippetDomainDesc: {
    fontSize: 12,
    color: tokens.colors.body,
    marginBottom: tokens.spacing.md,
    lineHeight: 18,
  },
  codeBox: {
    backgroundColor: tokens.colors.canvasDark,
    borderRadius: tokens.radii.xs,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  codeText: {
    fontFamily: 'System',
    fontSize: 11,
    color: tokens.colors.accentMint,
    lineHeight: 18,
  },
  copySnippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: tokens.colors.ink,
    paddingVertical: 10,
    borderRadius: tokens.radii.xs,
  },
  copySnippetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
