// apps/mobile/app/(auth)/login.tsx — Light Silicon Valley premium auth
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { tokens } from '../../src/theme/tokens';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Sparkles, BarChart3 } from 'lucide-react-native';

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Decorative soft orbs - light */}
          <View pointerEvents="none" style={styles.decorOrbMint} />
          <View pointerEvents="none" style={styles.decorOrbPeri} />

          {/* Brand Hero - light, logo centered, no LiveDot */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>analytics</Text>
            <Text style={styles.brandStudio}>BY SUFYAAN STUDIO</Text>

            <View style={styles.heroTextBlock}>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrow}>PRIVACY-FIRST ANALYTICS PLATFORM</Text>
              </View>
              <Text style={styles.heroTitle}>{isSignUp ? 'Create your account' : 'Sign in to your workspace'}</Text>
              <Text style={styles.heroSubtitle}>
                Fast, privacy-friendly website analytics and real-time telemetry. No cookies, no fingerprinting.
              </Text>
            </View>

            {/* Trust row */}
            <View style={styles.trustRow}>
              <View style={styles.trustPill}>
                <ShieldCheck size={12} color={tokens.colors.trendPositive} />
                <Text style={styles.trustText}>GDPR ready</Text>
              </View>
              <View style={styles.trustPill}>
                <BarChart3 size={12} color={tokens.colors.accentPeriwinkleDark} />
                <Text style={styles.trustText}>Real-time</Text>
              </View>
              <View style={styles.trustPill}>
                <Sparkles size={12} color={tokens.colors.accentOrangeDark} />
                <Text style={styles.trustText}>1.5kB tracker</Text>
              </View>
            </View>
          </View>

          {/* Auth Card - white elevated */}
          <View style={styles.card}>
            <View style={styles.cardHeaderMini}>
              <Text style={styles.cardHeaderTitle}>{isSignUp ? 'Get started in seconds' : 'Welcome back'}</Text>
              <Text style={styles.cardHeaderSub}>{isSignUp ? 'Free forever — upgrade anytime' : 'Enter your credentials to continue'}</Text>
            </View>

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
                <Text style={[styles.tabBtnText, !isSignUp && styles.tabBtnTextActive]}>Sign In</Text>
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
                <Text style={[styles.tabBtnText, isSignUp && styles.tabBtnTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={tokens.colors.trendNegative} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View style={styles.successBox}>
                <ShieldCheck size={15} color={tokens.colors.trendPositive} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color={tokens.colors.bodyMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="you@company.com"
                  placeholderTextColor={tokens.colors.bodyMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

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
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} activeOpacity={0.7}>
                  {showPassword ? <EyeOff size={16} color={tokens.colors.bodyMuted} /> : <Eye size={16} color={tokens.colors.bodyMuted} />}
                </TouchableOpacity>
              </View>
              {!isSignUp && <Text style={styles.helperLink}>Secure Supabase Auth · Encrypted at rest</Text>}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading} activeOpacity={0.88}>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>{isSignUp ? 'Create Free Account' : 'Sign In to Dashboard'}</Text>
                  <ArrowRight size={15} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.cardFooterRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Zero tracking SDKs</Text>
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.legalText}>
              By continuing you agree to our privacy-friendly terms. No cookies are used during authentication.
            </Text>
          </View>

          {/* Bottom footer - light */}
          <View style={styles.securityFooter}>
            <Text style={styles.securityText}>Direct Supabase PostgREST · Edge ingest via Cloudflare Workers · SOC2 ready infra</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: '#ffffff',
  },
  decorOrbMint: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(200, 246, 249, 0.45)',
    opacity: 0.9,
  },
  decorOrbPeri: {
    position: 'absolute',
    top: 140,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(189, 187, 255, 0.35)',
    opacity: 0.85,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    } as any),
  },
  logoImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1,
    marginTop: 10,
  },
  brandStudio: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  heroTextBlock: {
    alignItems: 'center',
    marginTop: 18,
    maxWidth: 360,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0891b2',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: '#475569',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 320,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 24,
      elevation: 6,
    } as any),
  },
  cardHeaderMini: {
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  cardHeaderSub: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 3,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#000000',
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    } as any),
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
  },
  eyeBtn: {
    padding: 6,
  },
  helperLink: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    height: 46,
    borderRadius: 8,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  legalText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15,
  },
  securityFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  securityText: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 15,
  },
});
