// apps/mobile/app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { BarChart3, Radio, Globe, Settings, Zap } from 'lucide-react-native';
import { tokens } from '../../src/theme/tokens';
import { View, Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const isIos = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const tabHeight = isIos ? 88 : isWeb ? 72 : 68;
  const paddingBottom = isIos ? 28 : isWeb ? 12 : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tokens.colors.canvas,
          borderTopColor: tokens.colors.hairline,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 8,
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: tokens.colors.ink,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <BarChart3 size={20} color={focused ? tokens.colors.ink : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="realtime"
        options={{
          title: 'Realtime',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Radio size={20} color={focused ? tokens.colors.ink : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Zap size={20} color={focused ? tokens.colors.ink : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sites"
        options={{
          title: 'Sites',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Globe size={20} color={focused ? tokens.colors.ink : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Settings size={20} color={focused ? tokens.colors.ink : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 26,
    borderRadius: tokens.radii.xs,
  },
  iconContainerFocused: {
    backgroundColor: tokens.colors.accentMint,
  },
});
