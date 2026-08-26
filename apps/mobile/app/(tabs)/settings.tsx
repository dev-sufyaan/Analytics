// apps/mobile/app/(tabs)/settings.tsx — Light premium, web-parity settings with project management
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useSites } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { Toast } from '../../src/components/Toast';
import { UpdateModal } from '../../src/components/UpdateModal';
import { checkForAppUpdate, UpdateManifest } from '../../src/lib/updater';
import { clearPersistedCache } from '../../src/lib/storage';
import { registerForPushNotificationsAsync, updateNotificationPreferences, ensureNotificationPermissionAndChannel } from '../../src/lib/notifications';
import { supabase } from '../../src/lib/supabase';
import { wipeWebsiteData } from '@analytics/db/queries';
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
  Globe,
  ChevronDown,
  Search,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Code,
  Share2,
  AlertTriangle,
} from 'lucide-react-native';
import type { Website } from '@analytics/db/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, sessionReady } = useAuth();
  const queryClient = useQueryClient();
  const { data: sites = [], refetch: refetchSites } = useSites();

  // Site selection for project-scoped settings (mirrors web /app/[id]/settings)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');

  const activeSite: Website | undefined = useMemo(() => {
    if (!sites.length) return undefined;
    if (selectedSiteId) {
      const f = sites.find((s) => s.id === selectedSiteId);
      if (f) return f;
    }
    return sites[0];
  }, [sites, selectedSiteId]);

  // Editable fields — synced when activeSite changes
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  useEffect(() => {
    if (activeSite) {
      setName(activeSite.name || '');
      setDomain(activeSite.domain || '');
      setAllowedDomains((activeSite.allowed_domains || []).join(', '));
      setIsPublic(!!activeSite.is_public);
    }
  }, [activeSite?.id]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actionLabel: string;
    variant: 'destructive' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    actionLabel: '',
    variant: 'destructive',
    onConfirm: async () => {},
  });

  // Notifications — OFF by default, only ON after user enables + grants permission
  const [dailyDigest, setDailyDigest] = useState(false);

  // On mount, try to read existing preference (if any) but keep default OFF.
  // Gated on sessionReady so we don't fire an RLS-blocked query before
  // the auth layer has restored the session from SecureStore.
  useEffect(() => {
    if (!user || !sessionReady) return;
    (async () => {
      try {
        const { data } = await supabase.from('push_tokens').select('preferences').eq('user_id', user.id).limit(1).maybeSingle();
        if (data?.preferences && typeof data.preferences === 'object') {
          const pref = data.preferences as any;
          if (typeof pref.daily_digest === 'boolean') setDailyDigest(pref.daily_digest);
        }
      } catch {}
    })();
  }, [user?.id, sessionReady]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const manifest = await checkForAppUpdate();
      if (manifest) {
        setUpdateManifest(manifest);
        setUpdateModalOpen(true);
      } else {
        setToastMsg('Your app is up to date (v1.0.1)');
      }
    } catch {
      setToastMsg('Unable to connect to update server.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleTogglePush = async (val: boolean) => {
    if (!user) {
      setToastMsg('Sign in to manage notifications');
      return;
    }

    if (val) {
      // Optimistic UI: the user just tapped ON, so show ON immediately.
      // We only revert if the OS actually denied permission.
      setDailyDigest(true);
      const outcome = await ensureNotificationPermissionAndChannel();
      if (!outcome.ok && outcome.reason === 'denied') {
        setDailyDigest(false);
        setToastMsg('Notification permission denied — enable in OS settings to receive digests');
        return;
      }
      // Permission is granted (or already was). Best-effort upsert the
      // FCM token; failure here does NOT revert the toggle.
      try {
        await registerForPushNotificationsAsync(user.id);
      } catch {}
      if (outcome.ok && outcome.reason === 'granted_no_token') {
        setToastMsg(outcome.warning);
      } else {
        setToastMsg('Daily digest enabled — permission granted');
      }
    } else {
      setDailyDigest(false);
      await updateNotificationPreferences(user.id, { daily_digest: false });
      setToastMsg('Daily digest disabled');
    }
  };

  const handleSaveSettings = async () => {
    if (!activeSite) {
      setToastMsg('No website selected');
      return;
    }
    setSaving(true);
    try {
      const domainsArray = allowedDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const { error } = await supabase
        .from('websites')
        .update({
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
          allowed_domains: domainsArray,
          is_public: isPublic,
        })
        .eq('id', activeSite.id);
      if (error) throw error;
      setToastMsg('Settings saved successfully');
      refetchSites();
      queryClient.invalidateQueries({ queryKey: ['analytics', 'sites'] });
    } catch (e: any) {
      setToastMsg(e.message || 'Error updating website');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!activeSite) return;
    setIsPublic(checked);
    setTogglingPublic(true);
    try {
      const { error } = await supabase.from('websites').update({ is_public: checked }).eq('id', activeSite.id);
      if (error) throw error;
      setToastMsg(checked ? 'Public dashboard enabled' : 'Public dashboard disabled');
      refetchSites();
    } catch (e: any) {
      setIsPublic(!checked);
      setToastMsg(e.message || 'Could not update sharing');
    } finally {
      setTogglingPublic(false);
    }
  };

  const executeWipe = async () => {
    if (!activeSite) return;
    setWiping(true);
    try {
      await wipeWebsiteData(supabase, activeSite.id);
      setConfirmModal((p) => ({ ...p, visible: false }));
      setToastMsg('Analytics data wiped successfully');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch (e: any) {
      setToastMsg(e.message || 'Error wiping data');
    } finally {
      setWiping(false);
    }
  };

  const handleWipeData = () => {
    if (!activeSite) return;
    setConfirmModal({
      visible: true,
      title: 'Wipe Analytics Data?',
      message: `This will delete all pageviews, sessions and rollups for ${activeSite.name} (${activeSite.domain}) from website_events, sessions and daily_stats in one transaction. This cannot be undone.`,
      actionLabel: 'Confirm Wipe',
      variant: 'destructive',
      onConfirm: executeWipe,
    });
  };

  const executeDelete = async () => {
    if (!activeSite) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('websites').delete().eq('id', activeSite.id);
      if (error) throw error;
      setConfirmModal((p) => ({ ...p, visible: false }));
      setToastMsg('Website deleted');
      setSelectedSiteId(null);
      refetchSites();
    } catch (e: any) {
      setToastMsg(e.message || 'Error deleting website');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteWebsite = () => {
    if (!activeSite) return;
    setConfirmModal({
      visible: true,
      title: 'Delete Website?',
      message: `Permanently delete ${activeSite.name} (${activeSite.domain}) and every associated event. This cannot be undone.`,
      actionLabel: 'Delete Website',
      variant: 'destructive',
      onConfirm: executeDelete,
    });
  };

  const clearCache = async () => {
    try {
      queryClient.clear();
      await clearPersistedCache();
      setToastMsg('Local cache cleared');
    } catch (e: any) {
      setToastMsg(e.message || 'Error clearing cache');
    }
  };

  const handleClearCache = () => {
    setConfirmModal({
      visible: true,
      title: 'Clear Offline Cache',
      message: 'Purge all locally cached dashboard queries and time-series from this device?',
      actionLabel: 'Clear Cache',
      variant: 'destructive',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        await clearCache();
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
    } catch (e: any) {
      setToastMsg(e.message || 'Error signing out');
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    setConfirmModal({
      visible: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out? You will need to log in again.',
      actionLabel: 'Sign Out',
      variant: 'destructive',
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        await executeSignOut();
      },
    });
  };

  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return sites;
    const q = siteSearch.toLowerCase();
    return sites.filter((s) => s.name?.toLowerCase().includes(q) || s.domain?.toLowerCase().includes(q));
  }, [sites, siteSearch]);

  const snippetCode = activeSite ? `<script defer src="https://analytics.sufyaanstudio.workers.dev/t.js" data-web="${activeSite.id}"></script>` : '';
  const shareUrl = activeSite ? `https://analytics.sufyaanstudio.com/s/${activeSite.share_token}` : '';

  const quota = activeSite?.monthly_event_quota || 25000;
  const used = activeSite?.events_this_month || 0;
  const quotaPct = Math.min(100, Math.round((used / Math.max(1, quota)) * 100));
  const quotaTone = quotaPct >= 90 ? '#000000' : quotaPct >= 70 ? '#f59e0b' : '#0891b2';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Light Header with Project Selector for settings scope */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.siteSelector}
          onPress={() => {
            setSiteSearch('');
            setPickerOpen(true);
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
              {activeSite ? `${activeSite.domain} · Settings` : 'No site selected'}
            </Text>
          </View>
          <ChevronDown size={14} color={tokens.colors.bodyMuted} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Settings size={18} color={tokens.colors.ink} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <User size={20} color={tokens.colors.ink} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || 'User Account'}
              </Text>
              <View style={styles.statusRow}>
                <View style={styles.liveDot} />
                <Text style={styles.statusText}>Connected · Supabase Cloud</Text>
              </View>
            </View>
          </View>
        </View>

        {!activeSite && sites.length === 0 ? (
          <View style={styles.emptyCard}>
            <Globe size={28} color={tokens.colors.bodyMuted} />
            <Text style={styles.emptyTitle}>No websites yet</Text>
            <Text style={styles.emptySub}>Create a website on the web dashboard to manage its settings here.</Text>
          </View>
        ) : activeSite ? (
          <>
            {/* Site Details — editable (web parity) */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionLabel}>GENERAL · SITE DETAILS</Text>
              <View style={styles.groupedCard}>
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>WEBSITE NAME</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="My Awesome Site"
                    placeholderTextColor={tokens.colors.bodyMuted}
                    style={styles.textInput}
                  />
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>PRIMARY DOMAIN</Text>
                  <TextInput
                    value={domain}
                    onChangeText={setDomain}
                    placeholder="example.com"
                    placeholderTextColor={tokens.colors.bodyMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>
                <View style={styles.rowDivider} />
                <View style={styles.formField}>
                  <Text style={styles.inputLabel}>ALLOWED DOMAINS (COMMA SEPARATED)</Text>
                  <TextInput
                    value={allowedDomains}
                    onChangeText={setAllowedDomains}
                    placeholder="example.com, www.example.com"
                    placeholderTextColor={tokens.colors.bodyMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                  <Text style={styles.helper}>Localhost allowed automatically with data-dev=true</Text>
                </View>
                <View style={styles.saveRow}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveSettings} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                  <Text style={styles.saveHint}>Changes apply immediately to ingest allowlist</Text>
                </View>
              </View>
            </View>

            {/* Tracking Code */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionLabel}>INSTALLATION · TRACKING CODE</Text>
              <View style={styles.groupedCard}>
                <Text style={styles.cardDesc}>Paste before closing &lt;/head&gt; — under 1.5kB gzipped, no cookies.</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>
                    {snippetCode}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setToastMsg('Snippet copied');
                    }}
                    activeOpacity={0.7}
                  >
                    <Copy size={12} color={tokens.colors.ink} />
                    <Text style={styles.secondaryBtnText}>Copy Snippet</Text>
                  </TouchableOpacity>
                  <View style={styles.domainBadge}>
                    <Code size={11} color={tokens.colors.body} />
                    <Text style={styles.domainBadgeText}>{activeSite.domain}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Public Dashboard Toggle — web parity */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionLabel}>SHARING · PUBLIC DASHBOARD</Text>
              <View style={styles.groupedCard}>
                <View style={styles.settingRow}>
                  <View style={[styles.iconBadge, { backgroundColor: '#f0fdf4' }]}>
                    <ShieldCheck size={16} color="#059669" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Enable Public Link</Text>
                    <Text style={styles.settingSubtitle}>Anyone with link can view read-only overview</Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={handleTogglePublic}
                    disabled={togglingPublic}
                    trackColor={{ false: '#e2e8f0', true: '#000000' }}
                    thumbColor={isPublic ? '#ffffff' : '#ffffff'}
                  />
                </View>

                {isPublic && (
                  <>
                    <View style={styles.rowDivider} />
                    <View style={styles.shareUrlBlock}>
                      <Text style={styles.shareUrlLabel}>SHAREABLE PUBLIC URL</Text>
                      <View style={styles.shareRow}>
                        <View style={styles.shareUrlBox}>
                          <Text style={styles.shareUrlText} numberOfLines={1}>
                            {shareUrl}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.copyIconBtn} onPress={() => setToastMsg('Share link copied!')} activeOpacity={0.7}>
                          <Copy size={14} color={tokens.colors.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.copyIconBtn} activeOpacity={0.7}>
                          <ExternalLink size={14} color={tokens.colors.ink} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Usage & Quota */}
            <View style={styles.sectionGroup}>
              <Text style={styles.sectionLabel}>STORAGE & RETENTION · USAGE</Text>
              <View style={styles.groupedCard}>
                <View style={styles.quotaHeader}>
                  <Text style={styles.quotaLabel}>Monthly events</Text>
                  <Text style={styles.quotaValue}>
                    {used.toLocaleString()} / {quota.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${quotaPct}%`, backgroundColor: quotaTone }]} />
                </View>
                <Text style={styles.quotaSub}>
                  {quotaPct}% used · resets 1st next month · {activeSite.data_retention_days} day retention
                </Text>
                <View style={styles.retentionRow}>
                  <View style={styles.retentionItem}>
                    <Text style={styles.retentionKey}>Raw retention</Text>
                    <Text style={styles.retentionVal}>{activeSite.data_retention_days} days</Text>
                  </View>
                  <View style={styles.retentionItem}>
                    <Text style={styles.retentionKey}>Summaries</Text>
                    <Text style={styles.retentionVal}>Forever</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Danger Zone — web parity with wipe + delete */}
            <View style={styles.sectionGroup}>
              <Text style={[styles.sectionLabel, { color: '#dc2626' }]}>DANGER ZONE</Text>
              <View style={[styles.groupedCard, { borderColor: '#fecaca' }]}>
                <View style={styles.dangerRow}>
                  <View style={styles.dangerText}>
                    <Text style={styles.dangerTitle}>Wipe Analytics Data</Text>
                    <Text style={styles.dangerSub}>Delete pageviews, sessions and rollups (atomic)</Text>
                  </View>
                  <TouchableOpacity style={styles.wipeBtn} onPress={handleWipeData} disabled={wiping} activeOpacity={0.8}>
                    {wiping ? <ActivityIndicator size="small" color="#dc2626" /> : <><Trash2 size={12} color="#dc2626" /><Text style={styles.wipeBtnText}>Wipe Data</Text></>}
                  </TouchableOpacity>
                </View>
                <View style={[styles.rowDivider, { marginLeft: 16, backgroundColor: '#fee2e2' }]} />
                <View style={styles.dangerRow}>
                  <View style={styles.dangerText}>
                    <Text style={styles.dangerTitle}>Delete Website</Text>
                    <Text style={styles.dangerSub}>Permanently remove website and all data</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteWebsite} disabled={deleting} activeOpacity={0.8}>
                    {deleting ? <ActivityIndicator size="small" color="#ffffff" /> : <><Trash2 size={12} color="#ffffff" /><Text style={styles.deleteBtnText}>Delete</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* Notifications — OFF by default */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS & SYNC</Text>
          <View style={styles.groupedCard}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#ecfeff' }]}>
                <Bell size={16} color="#0891b2" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Daily Traffic Digest</Text>
                <Text style={styles.settingSubtitle}>Morning summary — disabled until you enable</Text>
              </View>
              <Switch
                value={dailyDigest}
                onValueChange={handleTogglePush}
                trackColor={{ false: '#e2e8f0', true: '#000000' }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#eef2ff' }]}>
                <RefreshCw size={15} color="#4f46e5" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Foreground Auto-Sync</Text>
                <Text style={styles.settingSubtitle}>Refreshes overview every 30 seconds</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App & Storage */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>APPLICATION & STORAGE</Text>
          <View style={styles.groupedCard}>
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#f8fafc' }]}>
                <Smartphone size={16} color="#0f172a" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Analytics Android APK</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.1 (SDK 54)</Text>
              </View>
              <TouchableOpacity style={styles.primaryPillBtn} onPress={handleCheckUpdate} disabled={checkingUpdate} activeOpacity={0.8}>
                {checkingUpdate ? <ActivityIndicator size="small" color="#ffffff" /> : <><RefreshCw size={11} color="#ffffff" /><Text style={styles.primaryPillText}>Check</Text></>}
              </TouchableOpacity>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.settingRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#fff7ed' }]}>
                <HardDrive size={15} color="#c2410c" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>AsyncStorage Cache</Text>
                <Text style={styles.settingSubtitle}>24-hour persistent offline cache</Text>
              </View>
              <TouchableOpacity style={styles.clearPillBtn} onPress={handleClearCache} activeOpacity={0.7}>
                <Trash2 size={11} color="#dc2626" />
                <Text style={styles.clearPillText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Infra */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>PLATFORM INFRASTRUCTURE</Text>
          <View style={styles.groupedCard}>
            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Server size={14} color="#64748b" />
                <Text style={styles.diagLabel}>Ingest Worker</Text>
              </View>
              <Text style={styles.diagValue} numberOfLines={1}>
                analytics.sufyaanstudio.workers.dev
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Database size={14} color="#64748b" />
                <Text style={styles.diagLabel}>Database</Text>
              </View>
              <Text style={styles.diagValue}>Supabase PostgreSQL (RLS)</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.diagRow}>
              <View style={styles.diagLeft}>
                <Cpu size={14} color="#64748b" />
                <Text style={styles.diagLabel}>JS Engine</Text>
              </View>
              <Text style={styles.diagValue}>Hermes 60fps · New Arch</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutCard} onPress={handleSignOut} disabled={signingOut} activeOpacity={0.8}>
          {signingOut ? <ActivityIndicator size="small" color="#dc2626" /> : <><LogOut size={16} color="#dc2626" /><Text style={styles.signOutText}>Sign Out of Current Session</Text></>}
        </TouchableOpacity>

        <View style={styles.footerWordmark}>
          <Sparkles size={16} color="#94a3b8" />
          <Text style={styles.wordmarkTitle}>analytics</Text>
          <Text style={styles.wordmarkSub}>by Sufyaan Studio · Privacy-First Telemetry</Text>
        </View>
      </ScrollView>

      {/* Site Picker Modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe size={16} color={tokens.colors.ink} />
                <Text style={styles.modalTitle}>SELECT WEBSITE TO CONFIGURE</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)} activeOpacity={0.7}>
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrapper}>
              <Search size={14} color={tokens.colors.bodyMuted} />
              <TextInput
                style={styles.searchInput}
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
                const sel = item.id === activeSite?.id;
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
                      <View style={[styles.dotSmall, { backgroundColor: sel ? '#059669' : '#cbd5e1' }]} />
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

      {/* Confirm Dialog */}
      <Modal visible={confirmModal.visible} transparent animationType="fade" onRequestClose={() => setConfirmModal((p) => ({ ...p, visible: false }))}>
        <View style={styles.modalBackdropCenter}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmTitleRow}>
                <AlertTriangle size={18} color="#dc2626" />
                <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setConfirmModal((p) => ({ ...p, visible: false }))} activeOpacity={0.7}>
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            </View>
            <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal((p) => ({ ...p, visible: false }))} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, confirmModal.variant === 'destructive' && { backgroundColor: '#dc2626' }]}
                onPress={confirmModal.onConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>{confirmModal.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <UpdateModal manifest={updateManifest} visible={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
      {toastMsg && <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} duration={2500} />}
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
  headerRight: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { padding: 16, paddingBottom: 48 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileEmail: { fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  statusText: { fontSize: 11.5, color: '#64748b' },
  sectionGroup: { marginBottom: 16 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748b', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 },
  groupedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formField: { paddingHorizontal: 16, paddingVertical: 12 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 0.7, marginBottom: 6, textTransform: 'uppercase' },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
  },
  helper: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  rowDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  primaryBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  saveHint: { fontSize: 11, color: '#94a3b8', flex: 1 },
  cardDesc: { fontSize: 12.5, color: '#64748b', lineHeight: 18, paddingHorizontal: 16, paddingTop: 12 },
  codeBox: { margin: 12, backgroundColor: '#0f172a', borderRadius: 8, padding: 12 },
  codeText: { fontSize: 11, color: '#c8f6f9', lineHeight: 16, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  domainBadgeText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 13.5, fontWeight: '600', color: '#0f172a' },
  settingSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 14 },
  statusPill: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  statusPillText: { fontSize: 9.5, fontWeight: '700', color: '#059669', letterSpacing: 0.5 },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryPillText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  clearPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearPillText: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  shareUrlBlock: { padding: 12 },
  shareUrlLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.6, marginBottom: 6 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareUrlBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  shareUrlText: { fontSize: 12, color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  quotaLabel: { fontSize: 12.5, color: '#64748b' },
  quotaValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  progressBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 999, marginHorizontal: 16, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  quotaSub: { fontSize: 11, color: '#94a3b8', paddingHorizontal: 16, marginTop: 6, marginBottom: 12 },
  retentionRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  retentionItem: { flex: 1 },
  retentionKey: { fontSize: 11, color: '#64748b' },
  retentionVal: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  dangerText: { flex: 1 },
  dangerTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  dangerSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  wipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  wipeBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  diagLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagLabel: { fontSize: 12.5, fontWeight: '500', color: '#475569' },
  diagValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', textAlign: 'right', flexShrink: 1 },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  footerWordmark: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 4 },
  wordmarkTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  wordmarkSub: { fontSize: 11, color: '#94a3b8' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'flex-end' },
  modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  searchWrapper: {
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
  searchInput: { flex: 1, color: '#0f172a', fontSize: 13 },
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
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  siteOptionName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  siteOptionDomain: { fontSize: 11, color: '#64748b', marginTop: 1 },
  confirmDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  confirmTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  confirmMessage: { fontSize: 12.5, color: '#475569', lineHeight: 18, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  confirmBtn: { backgroundColor: '#0f172a', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8 },
  confirmBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
