// apps/mobile/app/_layout.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useEffect, Component, ErrorInfo, useCallback, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AppState, AppStateStatus, Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { asyncStoragePersister, CACHE_MAX_AGE, CACHE_BUSTER } from '../src/lib/storage';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useAuth } from '../src/data/hooks';
import { tokens } from '../src/theme/tokens';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import '../global.css';

// Keep splash visible while JS bundle loads / fonts prepare — SDK 54 requires explicit hide
SplashScreen.preventAutoHideAsync().catch(() => {});

// Global JS error handler that logs to console and prevents silent blank screen (expo-updates issue #41543)
if (typeof ErrorUtils !== 'undefined' && (ErrorUtils as any).setGlobalHandler) {
  const prev = (ErrorUtils as any).getGlobalHandler?.();
  (ErrorUtils as any).setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('[Global JS Error]', error, { isFatal });
    // Still call previous handler so expo-updates / Sentry can capture, but also log
    if (prev) prev(error, isFatal);
  });
}

// Defensive web polyfill for Touchable.Mixin to protect any legacy SVG mixins
if (Platform.OS === 'web') {
  try {
    const RN = require('react-native');
    if (RN.Touchable && !RN.Touchable.Mixin) {
      RN.Touchable.Mixin = {
        touchableHandleStartShouldSetResponder: () => true,
        touchableHandleResponderTerminationRequest: () => true,
        touchableHandleResponderGrant: () => {},
        touchableHandleResponderMove: () => {},
        touchableHandleResponderRelease: () => {},
        touchableHandleResponderTerminate: () => {},
        touchableGetInitialState: () => ({}),
      };
    }
  } catch {}
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours offline garbage collection
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: 'always',
    },
  },
});

// Link AppState to React Query focus manager for foreground-only auto-sync
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.card}>
            <AlertCircle size={32} color={tokens.colors.trendNegative} />
            <Text style={errorStyles.title}>APPLICATION RECOVERY</Text>
            <Text style={errorStyles.subtitle}>
              An unexpected render issue occurred. Your data is safe.
            </Text>
            {this.state.error?.message && (
              <Text style={errorStyles.errorMessage} numberOfLines={5}>
                {this.state.error.message}
              </Text>
            )}
            {this.state.error?.stack && (
              <Text style={errorStyles.stack} numberOfLines={4}>
                {this.state.error.stack.slice(0, 400)}
              </Text>
            )}
            <TouchableOpacity
              style={errorStyles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={tokens.colors.canvasDark} />
              <Text style={errorStyles.buttonText}>Reload View</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing['2xl'],
    alignItems: 'center',
    gap: 12,
    maxWidth: 380,
    width: '100%',
    ...tokens.shadows.card,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.ink,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    color: tokens.colors.body,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorMessage: {
    fontSize: 11,
    color: '#fca5a5',
    backgroundColor: tokens.colors.trendNegativeBg,
    padding: 8,
    borderRadius: tokens.radii.xs,
    width: '100%',
    textAlign: 'center',
  },
  stack: {
    fontSize: 9,
    color: '#999',
    width: '100%',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.colors.accentMint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: tokens.radii.xs,
    marginTop: 8,
    ...tokens.shadows.glowMint,
  },
  buttonText: {
    color: tokens.colors.canvasDark,
    fontSize: 13,
    fontWeight: '700',
  },
});

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, sessionReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootState = useRootNavigationState();

  useEffect(() => {
    if (loading || !sessionReady) return; // wait until session is restored
    if (!rootState?.key) return; // navigation not ready yet — prevents blank redirect before router mounted

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // User is not signed in and trying to access app screens -> redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // User is signed in and on login screen -> redirect to main tabs
      router.replace('/(tabs)');
    }
  }, [session, loading, sessionReady, segments, router, rootState]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [persistReady, setPersistReady] = useState(true);

  // Prepare app and hide splash once ready — with timeout fallback for SDK 54 stuck splash issue
  useEffect(() => {
    async function prepare() {
      try {
        // Add any font loading or other async prep here if needed
        // Ensure at least one frame has rendered before hiding splash
        await new Promise((res) => setTimeout(res, 100));
      } finally {
        setAppReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
    // Fallback: force hide after 3s even if prepare hangs (prevents white stuck splash)
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 3000);
    return () => clearTimeout(t);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [appReady]);

  if (!appReady) {
    // Keep splash visible; render nothing yet to let expo-splash-screen control transition
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <AppErrorBoundary>
        {persistReady ? (
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              maxAge: CACHE_MAX_AGE,
              buster: CACHE_BUSTER,
            }}
          >
            <StatusBar style="dark" />
            <OfflineBanner />
            <NavigationGuard>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#ffffff' },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="site/[panel]"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: '#ffffff' },
                    headerTintColor: tokens.colors.ink,
                    headerTitleStyle: { fontWeight: '700', fontSize: 15, color: tokens.colors.ink },
                    presentation: 'card',
                    animation: 'slide_from_right',
                  }}
                />
              </Stack>
            </NavigationGuard>
          </PersistQueryClientProvider>
        ) : (
          // Lightweight fallback without persistence — ensures app still renders even if AsyncStorage corrupted
          <View style={{ flex: 1, backgroundColor: tokens.colors.canvasSubtle, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <AlertCircle size={28} color={tokens.colors.trendNegative} />
            <Text style={{ marginTop: 12, fontWeight: '700', color: tokens.colors.ink }}>Recovering storage…</Text>
            <Text style={{ marginTop: 8, color: tokens.colors.body, textAlign: 'center' }}>Tap to retry login.</Text>
            <TouchableOpacity onPress={() => setPersistReady(true)} style={{ marginTop: 16, backgroundColor: tokens.colors.ink, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Reload App</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
