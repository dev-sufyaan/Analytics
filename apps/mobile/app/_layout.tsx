// apps/mobile/app/_layout.tsx
import React, { useEffect, Component, ErrorInfo } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
              <Text style={errorStyles.errorMessage} numberOfLines={3}>
                {this.state.error.message}
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
    backgroundColor: tokens.colors.canvasDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  card: {
    backgroundColor: tokens.colors.surfaceDarkCard,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.hairlineDark,
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
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
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
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // User is not signed in and trying to access app screens -> redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // User is signed in and on login screen -> redirect to main tabs
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: CACHE_MAX_AGE,
            buster: CACHE_BUSTER,
          }}
        >
          <StatusBar style="light" />
          <OfflineBanner />
          <NavigationGuard>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.colors.canvasSubtle },
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
                  headerStyle: { backgroundColor: tokens.colors.canvasDark },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { fontWeight: '700', fontSize: 15 },
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
          </NavigationGuard>
        </PersistQueryClientProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
