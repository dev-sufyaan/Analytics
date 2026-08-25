// apps/mobile/app/(tabs)/settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { Toast } from '../../src/components/Toast';
import { UpdateModal } from '../../src/components/UpdateModal';
import { checkForAppUpdate, UpdateManifest } from '../../src/lib/updater';
import { clearPersistedCache } from '../../src/lib/storage';
import {
  registerForPushNotificationsAsync,
  updateNotificationPreferences,
} from '../../src/lib/notifications';
import {
  Settings,
  User,
  LogOut,
  Bell,
  RefreshCw,
  Sparkles,
  Smartphone,
  Trash2,
  HardDrive,
  Server,
  Database,
  Cpu,
  AlertCircle,
  X,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Updates state
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Confirmation dialog modal state (works 100% reliably on Web, iOS, Android)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionType: 'destructive' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    actionLabel: '',
    actionType: 'destructive',
    onConfirm: async () => {},
  });

  // Push notification state
  const [dailyDigest, setDailyDigest] = useState(true);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const manifest = await checkForAppUpdate();
      if (manifest) {
        setUpdateManifest(manifest);
        setUpdateModalOpen(true);
      } else {
        setToastMsg('Your app is up to date (v1.0.0)');
      }
    } catch {
      setToastMsg('Unable to connect to update server.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleTogglePush = async (val: boolean) => {
    setDailyDigest(val);
    if (!user) return;
    if (val) {
      const token = await registerForPushNotificationsAsync(user.id);
      if (token) {
        setToastMsg('Daily summary digest push enabled');
      } else {
        setToastMsg('Push notification permissions required in OS settings');
        setDailyDigest(false);
      }
    } else {
      await updateNotificationPreferences(user.id, { daily_digest: false });
      setToastMsg('Daily digest disabled');
    }
  };

  const executeClearCache = async () => {
    try {
      queryClient.clear();
      await clearPersistedCache();
      setToastMsg('Local offline storage cleared successfully');
    } catch (err: any) {
      setToastMsg(err.message || 'Error clearing cache.');
    }
  };

  const handleClearCache = () => {
    setConfirmModal({
      visible: true,
      title: 'Clear Offline Cache',
      message:
        'Are you sure you want to purge all locally cached dashboard queries, time-series, and breakdown metrics from this device?',
      actionLabel: 'Clear Cache',
      actionType: 'destructive',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        await executeClearCache();
      },
    });
  };

  const executeSignOut = async () => {
    setSigningOut(true);
    try {
      queryClient.clear();
      await clearPersistedCache();
      await signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      console.error('Sign out error:', err);
      setToastMsg(err.message || 'Error signing out.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    setConfirmModal({
      visible: true,
      title: 'Sign Out',
      message:
        'Are you sure you want to sign out of your account? You will need to log in again with your Supabase credentials.',
      actionLabel: 'Sign Out',
      actionType: 'destructive',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        await executeSignOut();
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Settings size={18} color={tokens.colors.accentMint} />
          <Text style={styles.headerTitle}>SETTINGS & PREFERENCES</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <User size={22} color="#000000" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || 'User Account'}
              </Text>
              <View style={styles.statusRow}>
                <View style={styles.liveDot} />
                <Text style={styles.statusText}>Connected to Supabase Cloud</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Group 1: Notifications & Sync */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionHeaderLabel}>NOTIFICATIONS & SYNC</Text>
          <View style={styles.groupedCard}>
            {/* Row 1: Daily Digest */}
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(200, 246, 249, 0.45)' }]}>
                <Bell size={16} color="#0891b2" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Daily Traffic Digest</Text>
                <Text style={styles.settingSubtitle}>
                  Receive morning summary of views & visitors
                </Text>
              </View>
              <Switch
                value={dailyDigest}
                onValueChange={handleTogglePush}
                trackColor={{ false: '#e2e8f0', true: '#000000' }}
                thumbColor={dailyDigest ? '#ffffff' : '#f8fafc'}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Row 2: Auto-Sync */}
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(189, 187, 255, 0.45)' }]}>
                <RefreshCw size={15} color="#4f46e5" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Foreground Auto-Sync</Text>
                <Text style={styles.settingSubtitle}>
                  Refreshes overview data every 30 seconds
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Group 2: App Updates & Offline Storage */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionHeaderLabel}>APPLICATION & STORAGE</Text>
          <View style={styles.groupedCard}>
            {/* Row 1: In-App Updates */}
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#f1f5f9' }]}>
                <Smartphone size={16} color="#0f172a" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Analytics Android APK</Text>
                <Text style={styles.settingSubtitle}>
                  Version 1.0.0 (Release · SDK 54)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={handleCheckUpdate}
                disabled={checkingUpdate}
                activeOpacity={0.8}
              >
                {checkingUpdate ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <RefreshCw size={11} color="#ffffff" />
                    <Text style={styles.actionPillBtnText}>Update</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 2: Offline Cache */}
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(252, 76, 2, 0.12)' }]}>
                <HardDrive size={15} color="#c2410c" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>AsyncStorage Cache</Text>
                <Text style={styles.settingSubtitle}>
                  24-hour persistent offline cache
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearPillBtn}
                onPress={handleClearCache}
                activeOpacity={0.7}
              >
                <Trash2 size={11} color={tokens.colors.trendNegative} />
                <Text style={styles.clearPillBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Group 3: Diagnostics & Infrastructure */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionHeaderLabel}>PLATFORM INFRASTRUCTURE</Text>
          <View style={styles.groupedCard}>
            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Server size={14} color={tokens.colors.body} />
                <Text style={styles.diagLabel}>Ingest Worker</Text>
              </View>
              <Text style={styles.diagValue} numberOfLines={1}>
                analytics.sufyaanstudio.workers.dev
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Database size={14} color={tokens.colors.body} />
                <Text style={styles.diagLabel}>Database</Text>
              </View>
              <Text style={styles.diagValue}>Supabase PostgreSQL (RLS)</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Cpu size={14} color={tokens.colors.body} />
                <Text style={styles.diagLabel}>JS Engine</Text>
              </View>
              <Text style={styles.diagValue}>Hermes 60fps (New Architecture)</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity
          style={styles.signOutCard}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={tokens.colors.trendNegative} />
          ) : (
            <>
              <LogOut size={16} color={tokens.colors.trendNegative} />
              <Text style={styles.signOutCardText}>Sign Out of Current Session</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Wordmark Footer */}
        <View style={styles.footerWordmark}>
          <Sparkles size={16} color={tokens.colors.bodyMuted} />
          <Text style={styles.wordmarkTitle}>analytics</Text>
          <Text style={styles.wordmarkSub}>by Sufyaan Studio · Privacy-First Telemetry</Text>
        </View>
      </ScrollView>

      {/* Universal Confirmation Dialog (Works 100% on Web & Mobile) */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmTitleRow}>
                <AlertCircle size={18} color={tokens.colors.trendNegative} />
                <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmMessage}>{confirmModal.message}</Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmActionBtn}
                onPress={() => confirmModal.onConfirm()}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmActionBtnText}>{confirmModal.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-App Update Dialog */}
      <UpdateModal
        manifest={updateManifest}
        visible={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
      />

      {/* Floating Toast */}
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
  content: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  scrollContainer: {
    padding: tokens.spacing.lg,
    paddingBottom: 48,
  },
  profileCard: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.card,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(189, 187, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.ink,
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.trendPositive,
  },
  statusText: {
    fontSize: 11.5,
    color: tokens.colors.body,
  },
  sectionGroup: {
    marginBottom: tokens.spacing.lg,
  },
  sectionHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupedCard: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    overflow: 'hidden',
    ...tokens.shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: tokens.radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  settingSubtitle: {
    fontSize: 11,
    color: tokens.colors.body,
    marginTop: 2,
    lineHeight: 15,
  },
  rowDivider: {
    height: 1,
    backgroundColor: tokens.colors.hairlineSubtle,
    marginLeft: 56,
  },
  statusPill: {
    backgroundColor: tokens.colors.trendPositiveBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.xs,
    borderWidth: 1,
    borderColor: tokens.colors.trendPositiveBorder,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.trendPositive,
    letterSpacing: 0.5,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.xs,
  },
  actionPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  clearPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.trendNegativeBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.xs,
    borderWidth: 1,
    borderColor: tokens.colors.trendNegativeBorder,
  },
  clearPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.trendNegative,
  },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  diagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diagLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: tokens.colors.body,
  },
  diagValue: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.ink,
    textAlign: 'right',
    flexShrink: 1,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tokens.colors.trendNegativeBg,
    paddingVertical: 14,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.trendNegativeBorder,
    marginBottom: tokens.spacing.lg,
  },
  signOutCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.trendNegative,
  },
  footerWordmark: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xl,
    gap: 4,
  },
  wordmarkTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: tokens.colors.ink,
    letterSpacing: -0.5,
  },
  wordmarkSub: {
    fontSize: 11,
    color: tokens.colors.bodyMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  confirmDialog: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    width: '100%',
    maxWidth: 380,
    ...tokens.shadows.cardElevated,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  confirmTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  confirmMessage: {
    fontSize: 12.5,
    color: tokens.colors.body,
    lineHeight: 18,
    marginBottom: tokens.spacing.xl,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.body,
  },
  confirmActionBtn: {
    backgroundColor: tokens.colors.trendNegative,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radii.xs,
  },
  confirmActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
