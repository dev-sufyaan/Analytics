// apps/mobile/app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/data/hooks';
import { View, ActivityIndicator } from 'react-native';
import { tokens } from '../src/theme/tokens';

export default function RootIndex() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={tokens.colors.ink} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
