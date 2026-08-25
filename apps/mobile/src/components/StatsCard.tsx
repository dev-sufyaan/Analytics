// apps/mobile/src/components/StatsCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: string | null;
  variant?: 'mint' | 'periwinkle' | 'orange' | 'plain';
  icon?: React.ReactNode;
  comparisonLabel?: string;
  loading?: boolean;
}

export function StatsCard({
  label,
  value,
  delta,
  variant = 'plain',
  icon,
  comparisonLabel = 'vs prev 30d',
  loading = false,
}: StatsCardProps) {
  const isMint = variant === 'mint';
  const isPeriwinkle = variant === 'periwinkle';
  const isPositive = delta ? delta.startsWith('+') || (!delta.startsWith('-') && delta !== '0%') : null;
  const isNeutral = delta === '0%' || delta === '0';

  const cardBgStyle = isMint
    ? { backgroundColor: tokens.colors.accentMint, borderColor: 'rgba(0,0,0,0.06)' }
    : isPeriwinkle
    ? { backgroundColor: tokens.colors.accentPeriwinkle, borderColor: 'rgba(0,0,0,0.06)' }
    : { backgroundColor: tokens.colors.surfaceCard, borderColor: tokens.colors.hairline };

  const labelColor = isMint || isPeriwinkle ? 'rgba(0, 0, 0, 0.7)' : tokens.colors.body;
  const valueColor = tokens.colors.ink;

  const iconBg = isMint || isPeriwinkle
    ? { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
    : { backgroundColor: tokens.colors.surfaceSubtle };

  return (
    <View style={[styles.card, cardBgStyle]}>
      {/* Header with Mono Label + Icon */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
        {icon && <View style={[styles.iconWrapper, iconBg]}>{icon}</View>}
      </View>

      {/* Main Metric Value */}
      {loading ? (
        <View style={[styles.loadingSkeleton, (isMint || isPeriwinkle) && { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
      ) : (
        <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}

      {/* Delta Trend Pill & Subtext */}
      <View style={styles.footer}>
        {delta && !loading ? (
          <View
            style={[
              styles.deltaPill,
              isMint || isPeriwinkle
                ? styles.deltaPillTinted
                : isNeutral
                ? styles.deltaPillNeutral
                : isPositive
                ? styles.deltaPillPositive
                : styles.deltaPillNegative,
            ]}
          >
            {isNeutral ? (
              <Minus size={11} color={isMint || isPeriwinkle ? '#000000' : tokens.colors.textMuted} style={styles.trendIcon} />
            ) : isPositive ? (
              <TrendingUp size={11} color={isMint || isPeriwinkle ? '#000000' : tokens.colors.trendPositive} style={styles.trendIcon} />
            ) : (
              <TrendingDown size={11} color={isMint || isPeriwinkle ? '#000000' : tokens.colors.trendNegative} style={styles.trendIcon} />
            )}
            <Text
              style={[
                styles.deltaText,
                isMint || isPeriwinkle
                  ? { color: '#000000' }
                  : isNeutral
                  ? styles.deltaTextNeutral
                  : isPositive
                  ? styles.deltaTextPositive
                  : styles.deltaTextNegative,
              ]}
            >
              {delta}
            </Text>
          </View>
        ) : (
          <View style={{ height: 18 }} />
        )}

        {delta && !loading && (
          <Text style={[styles.comparisonText, (isMint || isPeriwinkle) && { color: 'rgba(0,0,0,0.6)' }]} numberOfLines={1}>
            {comparisonLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    padding: tokens.spacing.md,
    minHeight: 114,
    justifyContent: 'space-between',
    ...tokens.shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 1,
    marginRight: 4,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: tokens.radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginVertical: 2,
  },
  loadingSkeleton: {
    width: '70%',
    height: 28,
    backgroundColor: '#e2e8f0',
    borderRadius: tokens.radii.xs,
    marginVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radii.xs,
  },
  deltaPillTinted: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  deltaPillPositive: {
    backgroundColor: tokens.colors.trendPositiveBg,
    borderWidth: 1,
    borderColor: tokens.colors.trendPositiveBorder,
  },
  deltaPillNegative: {
    backgroundColor: tokens.colors.trendNegativeBg,
    borderWidth: 1,
    borderColor: tokens.colors.trendNegativeBorder,
  },
  deltaPillNeutral: {
    backgroundColor: tokens.colors.surfaceSubtle,
  },
  trendIcon: {
    marginRight: 3,
  },
  deltaText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  deltaTextPositive: {
    color: tokens.colors.trendPositive,
  },
  deltaTextNegative: {
    color: tokens.colors.trendNegative,
  },
  deltaTextNeutral: {
    color: tokens.colors.textMuted,
  },
  comparisonText: {
    fontSize: 9.5,
    color: tokens.colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
});
