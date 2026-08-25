// apps/mobile/src/components/PanelCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { tokens } from '../theme/tokens';
import { ChevronRight } from 'lucide-react-native';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface PanelCardProps {
  title: string;
  icon?: React.ReactNode;
  totalCount?: number;
  actionText?: string;
  onAction?: () => void;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: any) => void;
  children: React.ReactNode;
}

export function PanelCard({
  title,
  icon,
  totalCount,
  actionText,
  onAction,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PanelCardProps) {
  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          {typeof totalCount === 'number' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalCount}</Text>
            </View>
          )}
        </View>

        {actionText && onAction && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onAction}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{actionText}</Text>
            <ChevronRight size={13} color={tokens.colors.body} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tabs Switcher */}
      {tabs && tabs.length > 1 && onTabChange && (
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <View style={[styles.tabCountBadge, isActive && styles.tabCountBadgeActive]}>
                    <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Body Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconWrapper: {
    opacity: 0.7,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: tokens.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: tokens.radii.full,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: tokens.colors.body,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surfaceSubtle,
    borderRadius: tokens.radii.xs,
    padding: 2,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.hairline,
    gap: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: tokens.radii.xs,
    gap: 4,
  },
  tabActive: {
    backgroundColor: tokens.colors.ink,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.body,
    letterSpacing: 0.4,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: tokens.radii.full,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: tokens.colors.body,
  },
  tabCountTextActive: {
    color: '#ffffff',
  },
  content: {
    marginTop: 2,
  },
});
