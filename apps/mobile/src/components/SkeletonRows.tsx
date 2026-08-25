// apps/mobile/src/components/SkeletonRows.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { tokens } from '../theme/tokens';

export function SkeletonRows({ count = 5 }: { count?: number }) {
  const shimmer = useRef(new Animated.Value(0.4)).current;
  const isNative = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: isNative,
        }),
        Animated.timing(shimmer, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: isNative,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, isNative]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Animated.View
            style={[
              styles.bar,
              {
                width: `${40 + ((i * 17) % 50)}%`,
                opacity: shimmer,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.metric,
              {
                opacity: shimmer,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: tokens.spacing.xs,
    gap: 4,
  },
  row: {
    height: 38,
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.xs,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  bar: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: tokens.radii.xs,
  },
  metric: {
    width: 48,
    height: 12,
    backgroundColor: tokens.colors.accentMint,
    borderRadius: tokens.radii.xs,
  },
});
