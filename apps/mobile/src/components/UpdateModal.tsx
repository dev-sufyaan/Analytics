// apps/mobile/src/components/UpdateModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '../theme/tokens';
import { downloadAndInstallApk, UpdateManifest } from '../lib/updater';
import { Download, Sparkles, X, AlertCircle } from 'lucide-react-native';

interface UpdateModalProps {
  manifest: UpdateManifest | null;
  visible: boolean;
  onClose: () => void;
}

export function UpdateModal({ manifest, visible, onClose }: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!manifest) return null;

  const handleInstall = async () => {
    setDownloading(true);
    setErrorMsg(null);
    setProgress(0);

    try {
      await downloadAndInstallApk(manifest, (p) => {
        setProgress(p);
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download or install update.');
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!downloading) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Sparkles size={17} color={tokens.colors.ink} />
              <Text style={styles.title}>UPDATE AVAILABLE</Text>
            </View>
            {!downloading && (
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <X size={18} color={tokens.colors.body} />
              </TouchableOpacity>
            )}
          </View>

          {/* Version Pill & Info */}
          <View style={styles.versionRow}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{manifest.version}</Text>
            </View>
            {manifest.fileSize && (
              <Text style={styles.fileSizeText}>~{manifest.fileSize}</Text>
            )}
          </View>

          {/* Changelog */}
          <View style={styles.changelogBox}>
            <Text style={styles.changelogLabel}>RELEASE HIGHLIGHTS</Text>
            <Text style={styles.changelogText}>
              {manifest.changelog ||
                'Modernized Studio White UI/UX, real-time analytics enhancements, and performance optimizations.'}
            </Text>
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color={tokens.colors.trendNegative} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Download Progress Bar */}
          {downloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>DOWNLOADING APK...</Text>
                <Text style={styles.progressPct}>{(progress * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(progress * 100, 5)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {!downloading ? (
              <>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.installBtn}
                  onPress={handleInstall}
                  activeOpacity={0.8}
                >
                  <Download size={14} color="#ffffff" />
                  <Text style={styles.installBtnText}>Update Now</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.downloadingRow}>
                <ActivityIndicator size="small" color={tokens.colors.ink} />
                <Text style={styles.downloadingText}>Downloading update package...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  dialog: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    width: '100%',
    maxWidth: 380,
    ...tokens.shadows.cardElevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: tokens.spacing.md,
  },
  versionBadge: {
    backgroundColor: tokens.colors.accentMint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radii.xs,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  fileSizeText: {
    fontSize: 12,
    color: tokens.colors.bodyMuted,
  },
  changelogBox: {
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  changelogLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.bodyMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  changelogText: {
    fontSize: 12,
    color: tokens.colors.ink,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.trendNegativeBg,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.xs,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.trendNegativeBorder,
  },
  errorText: {
    fontSize: 11,
    color: tokens.colors.trendNegative,
    flex: 1,
  },
  progressSection: {
    marginBottom: tokens.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.5,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: tokens.radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: tokens.spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.body,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: tokens.radii.xs,
  },
  installBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  downloadingText: {
    fontSize: 12,
    color: tokens.colors.body,
  },
});
