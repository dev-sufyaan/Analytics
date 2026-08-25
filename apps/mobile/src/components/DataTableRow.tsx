// apps/mobile/src/components/DataTableRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { tokens } from '../theme/tokens';
import { Filter } from 'lucide-react-native';

interface DataTableRowProps {
  label: string;
  value: number | string;
  secondaryValue?: number | string;
  percentage?: number; // 0 to 100
  rank?: number;
  icon?: React.ReactNode;
  onPress?: () => void;
  barColor?: string;
}

export function DataTableRow({
  label,
  value,
  secondaryValue,
  percentage = 0,
  rank,
  icon,
  onPress,
  barColor = tokens.colors.accentMintLight,
}: DataTableRowProps) {
  const boundedPct = Math.min(Math.max(percentage, 0), 100);

  const Content = (
    <View style={styles.container}>
      {/* Background proportional progress bar */}
      <View
        style={[
          styles.progressBar,
          { width: `${boundedPct}%`, backgroundColor: barColor },
        ]}
      />

      {/* Row foreground data */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          {rank !== undefined && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          )}
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.label} numberOfLines={1} ellipsizeMode="middle">
            {label}
          </Text>
        </View>

        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
          {secondaryValue !== undefined && (
            <Text style={styles.secondaryValue}>({secondaryValue})</Text>
          )}
          {onPress && (
            <Filter size={10} color={tokens.colors.bodyMuted} style={styles.filterIcon} />
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  container: {
    height: 38,
    marginVertical: 2,
    borderRadius: tokens.radii.xs,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: tokens.radii.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: tokens.radii.xs,
    backgroundColor: tokens.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.body,
  },
  iconWrapper: {
    marginRight: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '500',
    color: tokens.colors.ink,
    flexShrink: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 12.5,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  secondaryValue: {
    fontSize: 11,
    color: tokens.colors.bodyMuted,
  },
  filterIcon: {
    marginLeft: 2,
    opacity: 0.6,
  },
});
