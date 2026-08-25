// apps/mobile/src/components/OfflineBanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { tokens } from '../theme/tokens';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { onlineManager } from '@tanstack/react-query';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline());
  const translateY = React.useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((online) => {
      setIsOnline(online);
      Animated.timing(translateY, {
        toValue: online ? -40 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [translateY]);

  if (isOnline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <WifiOff size={14} color="#ffffff" />
        <Text style={styles.text}>Offline Mode · Viewing cached data</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b91c1c',
    paddingVertical: 6,
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
