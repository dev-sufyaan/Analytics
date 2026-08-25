// apps/mobile/src/components/RangePills.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { tokens } from '../theme/tokens';
import type { DashboardRange } from '@analytics/db/types';

interface RangePillsProps {
  selected: DashboardRange;
  onSelect: (range: DashboardRange) => void;
}

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

export function RangePills({ selected, onSelect }: RangePillsProps) {
  return (
    <View style={styles.container}>
      {RANGES.map((r) => {
        const active = selected === r.value;
        return (
          <TouchableOpacity
            key={r.value}
            onPress={() => onSelect(r.value)}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    padding: 2.5,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    alignSelf: 'flex-start',
    gap: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tokens.radii.xs,
  },
  pillActive: {
    backgroundColor: tokens.colors.ink,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: '#ffffff',
  },
});
