// apps/mobile/src/components/ChartCard.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { tokens } from '../theme/tokens';
import type { TimeseriesPoint } from '@analytics/db/types';
import { formatBucketLabel, formatBucketFull } from '@analytics/ui/format';
import { BarChart2 } from 'lucide-react-native';

interface ChartCardProps {
  timeseries: TimeseriesPoint[];
  interval?: 'hour' | 'day';
  loading?: boolean;
}

export function ChartCard({
  timeseries,
  interval = 'day',
  loading = false,
}: ChartCardProps) {
  const [metric, setMetric] = useState<'all' | 'views' | 'visitors'>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);

  const fallbackWidth = Math.max(Dimensions.get('window').width - 32, 280);
  const screenWidth = measuredWidth > 0 ? measuredWidth : fallbackWidth;
  const chartHeight = 200;
  const paddingX = 14;
  const paddingTop = 26;
  const paddingBottom = 22;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - measuredWidth) > 2) {
      setMeasuredWidth(w);
    }
  };

  const data = useMemo(() => timeseries || [], [timeseries]);

  const maxViews = useMemo(
    () => Math.max(...data.map((d) => Number(d.pageviews || 0)), 1),
    [data]
  );
  const maxVisitors = useMemo(
    () => Math.max(...data.map((d) => Number(d.visitors || 0)), 1),
    [data]
  );

  const maxVal = useMemo(() => {
    if (metric === 'views') return maxViews;
    if (metric === 'visitors') return maxVisitors;
    return Math.max(maxViews, maxVisitors, 1);
  }, [metric, maxViews, maxVisitors]);

  const graphWidth = Math.max(screenWidth - paddingX * 2, 10);
  const graphHeight = Math.max(chartHeight - paddingTop - paddingBottom, 10);

  // Compute Coordinates for all points
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const count = data.length;
    const denom = Math.max(count - 1, 1);

    return data.map((d, i) => {
      const x = paddingX + (i / denom) * graphWidth;
      const vVal = Number(d.pageviews || 0);
      const uVal = Number(d.visitors || 0);
      const yViews = paddingTop + graphHeight - (vVal / maxVal) * graphHeight;
      const yVisitors = paddingTop + graphHeight - (uVal / maxVal) * graphHeight;
      return {
        x: isFinite(x) ? x : paddingX,
        yViews: isFinite(yViews) ? yViews : paddingTop + graphHeight,
        yVisitors: isFinite(yVisitors) ? yVisitors : paddingTop + graphHeight,
        point: d,
      };
    });
  }, [data, graphWidth, graphHeight, maxVal, paddingX, paddingTop]);

  // Touch gesture handling for smooth scrubbing
  const handleTouch = (evt: GestureResponderEvent) => {
    if (points.length === 0) return;
    const touchX = evt.nativeEvent.locationX;
    let closestIdx = 0;
    let minDiff = Infinity;

    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - touchX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  };

  // Build smooth bezier curves
  const buildCurvedPath = (key: 'yViews' | 'yVisitors', isArea = false) => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const y0 = points[0][key];
      return `M ${points[0].x} ${y0} L ${screenWidth - paddingX} ${y0}`;
    }

    let d = `M ${points[0].x} ${points[0][key]}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C ${cpX} ${prev[key]}, ${cpX} ${curr[key]}, ${curr.x} ${curr[key]}`;
    }

    if (isArea) {
      const lastX = points[points.length - 1].x;
      const bottomY = paddingTop + graphHeight;
      d += ` L ${lastX} ${bottomY} L ${points[0].x} ${bottomY} Z`;
    }

    return d;
  };

  const showViews = metric === 'all' || metric === 'views';
  const showVisitors = metric === 'all' || metric === 'visitors';

  const activePoint = activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;

  // Selected or summary info
  const headerSummary = activePoint ? (
    <View style={styles.activeInspectRow}>
      <Text style={styles.activeDateText}>
        {formatBucketFull
          ? formatBucketFull(activePoint.point.time_bucket)
          : formatBucketLabel(activePoint.point.time_bucket, interval)}
      </Text>
      <View style={styles.activeMetricsBadge}>
        {showViews && (
          <View style={styles.activeMetricItem}>
            <View style={[styles.dotIndicator, { backgroundColor: '#6366f1' }]} />
            <Text style={styles.activeMetricVal}>{activePoint.point.pageviews} views</Text>
          </View>
        )}
        {showVisitors && (
          <View style={styles.activeMetricItem}>
            <View style={[styles.dotIndicator, { backgroundColor: '#0891b2' }]} />
            <Text style={styles.activeMetricVal}>{activePoint.point.visitors} visitors</Text>
          </View>
        )}
      </View>
    </View>
  ) : (
    <View style={styles.subtextRow}>
      <Text style={styles.subtext}>
        {interval === 'hour' ? 'Hourly breakdown' : 'Daily trends'}
      </Text>
      <Text style={styles.scrubHint}>Drag across chart to inspect</Text>
    </View>
  );

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Header & Metric Selector */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.titleWithIcon}>
            <BarChart2 size={13} color={tokens.colors.body} />
            <Text style={styles.title}>ACTIVITY OVER TIME</Text>
          </View>
          {headerSummary}
        </View>

        <View style={styles.pillsContainer}>
          {(['all', 'views', 'visitors'] as const).map((m) => {
            const active = metric === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMetric(m)}
                style={[styles.pill, active && styles.pillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {m.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SVG Interactive Chart Canvas */}
      <View
        style={styles.chartWrapper}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        {data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No data for selected time period</Text>
          </View>
        ) : (
          <Svg width={screenWidth} height={chartHeight}>
            <Defs>
              {/* Gradient for Total Views */}
              <LinearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
              </LinearGradient>

              {/* Gradient for Unique Visitors */}
              <LinearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid Lines */}
            <Line
              x1={paddingX}
              y1={paddingTop}
              x2={screenWidth - paddingX}
              y2={paddingTop}
              stroke="#f1f5f9"
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            <Line
              x1={paddingX}
              y1={paddingTop + graphHeight * 0.5}
              x2={screenWidth - paddingX}
              y2={paddingTop + graphHeight * 0.5}
              stroke="#f1f5f9"
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            <Line
              x1={paddingX}
              y1={paddingTop + graphHeight}
              x2={screenWidth - paddingX}
              y2={paddingTop + graphHeight}
              stroke="#e2e8f0"
              strokeWidth={1}
            />

            {/* Area Fills */}
            {showViews && (
              <Path
                d={buildCurvedPath('yViews', true)}
                fill="url(#viewsGradient)"
              />
            )}
            {showVisitors && (
              <Path
                d={buildCurvedPath('yVisitors', true)}
                fill="url(#visitorsGradient)"
              />
            )}

            {/* Stroke Curves */}
            {showViews && (
              <Path
                d={buildCurvedPath('yViews', false)}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {showVisitors && (
              <Path
                d={buildCurvedPath('yVisitors', false)}
                fill="none"
                stroke="#0891b2"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Active Scrubbing Cursor & Target Dots */}
            {activePoint && (
              <G>
                {/* Vertical Cursor Guide Line */}
                <Line
                  x1={activePoint.x}
                  y1={paddingTop}
                  x2={activePoint.x}
                  y2={paddingTop + graphHeight}
                  stroke="#0891b2"
                  strokeWidth={1.5}
                  strokeDasharray="2,2"
                />

                {/* Highlight Point for Views */}
                {showViews && (
                  <>
                    <Circle
                      cx={activePoint.x}
                      cy={activePoint.yViews}
                      r={6}
                      fill="rgba(99, 102, 241, 0.2)"
                    />
                    <Circle
                      cx={activePoint.x}
                      cy={activePoint.yViews}
                      r={3.5}
                      fill="#6366f1"
                    />
                  </>
                )}

                {/* Highlight Point for Visitors */}
                {showVisitors && (
                  <>
                    <Circle
                      cx={activePoint.x}
                      cy={activePoint.yVisitors}
                      r={6}
                      fill="rgba(8, 145, 178, 0.2)"
                    />
                    <Circle
                      cx={activePoint.x}
                      cy={activePoint.yVisitors}
                      r={3.5}
                      fill="#0891b2"
                    />
                  </>
                )}
              </G>
            )}
          </Svg>
        )}
      </View>

      {/* Footer Legend */}
      <View style={styles.footerLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBullet, { backgroundColor: '#0891b2' }]} />
          <Text style={styles.legendLabel}>Unique Visitors</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBullet, { backgroundColor: '#6366f1' }]} />
          <Text style={styles.legendLabel}>Total Pageviews</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.surfaceCard,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    padding: tokens.spacing.md,
    marginVertical: tokens.spacing.xs,
    ...tokens.shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
    gap: 8,
  },
  headerTitleGroup: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtextRow: {
    flexDirection: 'column',
  },
  subtext: {
    fontSize: 12,
    fontWeight: '500',
    color: tokens.colors.ink,
  },
  scrubHint: {
    fontSize: 10,
    color: tokens.colors.textMuted,
    marginTop: 1,
  },
  activeInspectRow: {
    marginTop: 1,
  },
  activeDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  activeMetricsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  activeMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeMetricVal: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  pillsContainer: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    padding: 2,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radii.xs,
  },
  pillActive: {
    backgroundColor: tokens.colors.ink,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: '#ffffff',
  },
  chartWrapper: {
    position: 'relative',
    marginVertical: 2,
    alignItems: 'center',
  },
  emptyContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: tokens.colors.textMuted,
    fontSize: 12,
  },
  footerLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.hairlineSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: tokens.colors.body,
  },
});
