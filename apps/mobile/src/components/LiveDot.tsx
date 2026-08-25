// apps/mobile/src/components/LiveDot.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { tokens } from '../theme/tokens';

interface LiveDotProps {
  size?: number;
  color?: string;
}

export function LiveDot({ size = 8, color = tokens.colors.accentMint }: LiveDotProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.85)).current;
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 2.2,
            duration: 1400,
            useNativeDriver: isNative,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: isNative,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: isNative,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.85,
            duration: 0,
            useNativeDriver: isNative,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, opacityAnim, isNative]);

  return (
    <View style={[styles.container, { width: size * 2.2, height: size * 2.2 }]}>
      {/* Animated Ping Ring */}
      <Animated.View
        style={[
          styles.ping,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      {/* Core Solid Dot with Glow */}
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ping: {
    position: 'absolute',
  },
  dot: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
});
