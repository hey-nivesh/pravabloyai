/**
 * VaultSegmentedControl — Four-tab strip for the Vault screen modules.
 *
 * Styled to match the Email/Phone toggle on the Sign Up screen:
 *  - Filled background pill for the active segment
 *  - Same Brand.primary accent
 *  - Subtle shadow and border for premium feel
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VaultTab = 'daily' | 'history' | 'saved' | 'search';

type VaultSegmentedControlProps = {
  activeTab: VaultTab;
  onTabChange: (tab: VaultTab) => void;
};

const TABS: { id: VaultTab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'history', label: 'History' },
  { id: 'saved', label: 'Saved' },
  { id: 'search', label: 'Search' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function VaultSegmentedControl({
  activeTab,
  onTabChange,
}: VaultSegmentedControlProps) {
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [
                styles.segment,
                isActive && styles.segmentActive,
                pressed && !isActive && styles.segmentPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} module`}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.sm,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm - 2,
  },
  segmentActive: {
    backgroundColor: Brand.primary,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentPressed: {
    backgroundColor: 'rgba(127, 34, 253, 0.08)',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
