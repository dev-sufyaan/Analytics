// apps/mobile/app/site/[panel].tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOverview } from '../../src/data/hooks';
import { tokens } from '../../src/theme/tokens';
import { DataTableRow } from '../../src/components/DataTableRow';
import { SkeletonRows } from '../../src/components/SkeletonRows';
import { formatNumber } from '@analytics/ui/format';
import { AI_SOURCE_LABELS } from '@analytics/db/constants';
import { Search, X, Layers } from 'lucide-react-native';

export default function PanelDrilldownScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const panel = (params.panel as string) || 'pages';
  const siteId = params.siteId as string;
  const siteName = (params.siteName as string) || 'Website';

  const [search, setSearch] = useState('');
  const { data: overview, isLoading } = useOverview(siteId, '30d');

  const panelTitles: Record<string, string> = {
    pages: 'ALL PAGES & PATHS',
    referrers: 'ALL REFERRERS',
    channels: 'ALL UTM CAMPAIGN CHANNELS',
    countries: 'ALL COUNTRIES',
    devices: 'ALL DEVICES & BROWSERS',
    events: 'ALL CUSTOM EVENTS',
  };

  const title = panelTitles[panel] || 'BREAKDOWN';

  const items = useMemo(() => {
    if (!overview) return [];
    if (panel === 'pages') {
      return (overview.pages || []).map((p) => ({
        label: p.url_path,
        value: p.pageviews,
        secondary: `${p.visitors} visitors`,
      }));
    }
    if (panel === 'referrers') {
      return (overview.referrers || []).map((r) => ({
        label: r.referrer_domain || 'Direct / None',
        value: r.pageviews,
        secondary: `${r.visitors} visitors`,
      }));
    }
    if (panel === 'channels') {
      return (overview.channels || []).map((c) => ({
        label: c.utm_source,
        value: c.pageviews,
        secondary: `${c.visitors} visitors`,
      }));
    }
    if (panel === 'countries') {
      return (overview.countries || []).map((c) => ({
        label: c.country || 'Unknown',
        value: c.visitors,
        secondary: `${c.sessions} sessions`,
      }));
    }
    if (panel === 'devices') {
      const allDev = [
        ...(overview.devices?.browsers || []),
        ...(overview.devices?.os || []),
        ...(overview.devices?.devices || []),
      ];
      return allDev.map((d) => ({
        label: d.name || 'Unknown',
        value: d.count,
        secondary: '',
      }));
    }
    if (panel === 'events') {
      return (overview.events || []).map((e) => ({
        label: e.event_name,
        value: e.total_events,
        secondary: `${e.unique_visitors} visitors`,
      }));
    }
    return [];
  }, [overview, panel]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, search]);

  const maxVal = useMemo(
    () => (filteredItems.length ? Math.max(...filteredItems.map((i) => Number(i.value))) : 1),
    [filteredItems]
  );

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={15} color={tokens.colors.bodyMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${title.toLowerCase()}...`}
          placeholderTextColor={tokens.colors.bodyMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={tokens.colors.bodyMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Item List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
      >
        {isLoading && !overview ? (
          <SkeletonRows count={8} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Layers size={28} color={tokens.colors.bodyMuted} />
            <Text style={styles.emptyText}>No matching records found</Text>
          </View>
        ) : (
          filteredItems.map((item, idx) => (
            <DataTableRow
              key={`item-${idx}`}
              rank={idx + 1}
              label={item.label}
              value={formatNumber(item.value)}
              secondaryValue={item.secondary}
              percentage={(Number(item.value) / maxVal) * 100}
              barColor="rgba(200, 246, 249, 0.45)"
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.canvasSubtle,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tokens.colors.surfaceCard,
    margin: tokens.spacing.md,
    paddingHorizontal: 12,
    borderRadius: tokens.radii.xs,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    height: 42,
    ...tokens.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: tokens.colors.ink,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing['3xl'],
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: tokens.colors.bodyMuted,
    fontSize: 13,
  },
});
