// apps/mobile/src/components/Toast.tsx
import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, Platform } from 'react-native';
import { tokens } from '../theme/tokens';
import { CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react-native';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'info',
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: isNative,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: isNative,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: isNative,
        }),
        Animated.timing(translateY, {
          toValue: 24,
          duration: 200,
          useNativeDriver: isNative,
        }),
      ]).start(() => {
        if (onDismiss) onDismiss();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [opacity, translateY, duration, onDismiss, isNative]);

  const Icon =
    type === 'success' ? (
      <CheckCircle size={16} color={tokens.colors.accentMint} />
    ) : type === 'error' ? (
      <AlertCircle size={16} color="#ef4444" />
    ) : (
      <Sparkles size={16} color={tokens.colors.accentMint} />
    );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {Icon}
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 34,
    left: 20,
    right: 20,
    backgroundColor: tokens.colors.canvasDark,
    borderRadius: tokens.radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: tokens.colors.hairlineDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});
