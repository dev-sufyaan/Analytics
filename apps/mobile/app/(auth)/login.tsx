// apps/mobile/app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { tokens } from '../../src/theme/tokens';
import { LiveDot } from '../../src/components/LiveDot';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react-native';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.session) {
          // Auto signed in
        } else {
          setSuccessMsg('Verification email dispatched. Please verify your account before logging in.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Hero Header */}
          <View style={styles.brandContainer}>
            <View style={styles.brandBadge}>
              <LiveDot size={8} color={tokens.colors.accentMintDark} />
              <Text style={styles.brandTitle}>analytics</Text>
            </View>
            <Text style={styles.brandStudio}>by Sufyaan Studio</Text>
            <Text style={styles.brandSubtitle}>
              Fast, privacy-friendly website analytics and real-time telemetry.
            </Text>
          </View>

          {/* Studio White Auth Card */}
          <View style={styles.card}>
            {/* Tab Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabBtn, !isSignUp && styles.tabBtnActive]}
                onPress={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, !isSignUp && styles.tabBtnTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, isSignUp && styles.tabBtnActive]}
                onPress={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, isSignUp && styles.tabBtnTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Notification */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={tokens.colors.trendNegative} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Success Notification */}
            {successMsg && (
              <View style={styles.successBox}>
                <ShieldCheck size={15} color={tokens.colors.trendPositive} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color={tokens.colors.bodyMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor={tokens.colors.bodyMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color={tokens.colors.bodyMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor={tokens.colors.bodyMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={tokens.colors.bodyMuted} />
                  ) : (
                    <Eye size={16} color={tokens.colors.bodyMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {isSignUp ? 'Create Free Account' : 'Sign In to Dashboard'}
                  </Text>
                  <ArrowRight size={15} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Security Footer */}
          <View style={styles.securityFooter}>
            <Sparkles size={13} color={tokens.colors.bodyMuted} />
            <Text style={styles.securityText}>
              Direct Supabase PostgREST Connection · Zero Tracking SDKs
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing['2xl'],
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: tokens.spacing['2xl'],
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: tokens.colors.ink,
    letterSpacing: -1,
  },
  brandStudio: {
    fontSize: 11.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 13,
    color: tokens.colors.body,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 18,
  },
  card: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    ...tokens.shadows.cardElevated,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    padding: 2.5,
    marginBottom: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: tokens.radii.xs,
  },
  tabBtnActive: {
    backgroundColor: tokens.colors.ink,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.body,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.colors.trendNegativeBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.xs,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.trendNegativeBorder,
  },
  errorText: {
    fontSize: 12,
    color: tokens.colors.trendNegative,
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.colors.trendPositiveBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radii.xs,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.trendPositiveBorder,
  },
  successText: {
    fontSize: 12,
    color: tokens.colors.trendPositive,
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: tokens.spacing.lg,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: tokens.colors.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tokens.colors.ink,
    height: 44,
    borderRadius: tokens.radii.xs,
    marginTop: tokens.spacing.sm,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.spacing['2xl'],
  },
  securityText: {
    fontSize: 11,
    color: tokens.colors.bodyMuted,
  },
});
