import React, { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type DrawerNavItemProps = {
  /** Label for the menu item */
  label: string;
  /** Icon name (platform-adaptive object) */
  icon: SymbolName;
  /** Whether this item is the currently active route */
  isActive: boolean;
  /** Action when pressed */
  onPress: () => void;
  /** Accessibility description */
  accessibilityLabel: string;
  /** Optional right-side badge text (e.g. "PRO") */
  rightBadge?: string;
  /** Highlight style for special items (e.g., Upgrade to Pro) */
  isSpecialUpgrade?: boolean;
};

export function DrawerNavItem({
  label,
  icon,
  isActive,
  onPress,
  accessibilityLabel,
  rightBadge,
  isSpecialUpgrade = false,
}: DrawerNavItemProps) {
  const chevronIcon: SymbolName = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' };

  // Set colors based on state
  const containerStyle = [
    styles.row,
    isActive && styles.rowActive,
    isSpecialUpgrade && styles.rowSpecial,
  ];

  // Inactive icon default colors
  const defaultIconBg = isSpecialUpgrade ? '#F59E0B' : Brand.cardBg;
  const defaultIconTint = isSpecialUpgrade ? '#FFFFFF' : Brand.grayText;

  // Active icon colors: solid purple icon, or custom for upgrade
  const iconBg = isActive
    ? Brand.primary
    : (isSpecialUpgrade ? '#FCD34D' : '#E5E7EB');

  const iconTint = isActive
    ? '#FFFFFF'
    : (isSpecialUpgrade ? '#B45309' : Brand.grayText);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...containerStyle, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
    >
      {/* Icon Badge */}
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <SymbolView name={icon} size={16} tintColor={iconTint} />
      </View>

      {/* Label Text */}
      <Text
        style={[
          styles.label,
          isActive && styles.labelActive,
          isSpecialUpgrade && styles.labelSpecial,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* Right Side Accessories (Badge or Chevron) */}
      {rightBadge ? (
        <View style={[styles.rightBadge, isSpecialUpgrade ? styles.rightBadgeSpecial : styles.rightBadgeDefault]}>
          <Text style={[styles.rightBadgeText, isSpecialUpgrade && styles.rightBadgeTextSpecial]}>
            {rightBadge}
          </Text>
        </View>
      ) : (
        <View style={styles.chevron}>
          <SymbolView
            name={chevronIcon}
            size={12}
            tintColor={isActive ? Brand.primary : Brand.grayText}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md, // 20px radius
    marginHorizontal: Spacing.two,
    marginVertical: 3,
    backgroundColor: 'transparent',
    gap: Spacing.three,
  },
  rowActive: {
    backgroundColor: Brand.primaryBadgeBg, // Soft purple background pill
  },
  rowSpecial: {
    backgroundColor: 'rgba(255, 237, 213, 0.6)', // light orange tint
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  rowPressed: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm, // 12px radius
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.grayText,
  },
  labelActive: {
    color: Brand.primaryDark,
  },
  labelSpecial: {
    color: '#C2410C', // warm dark orange
  },
  chevron: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  rightBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rightBadgeDefault: {
    backgroundColor: '#E5E7EB',
  },
  rightBadgeSpecial: {
    // Small purple gradient or gold badge for subscription
    backgroundColor: Brand.primary,
  },
  rightBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Brand.grayText,
  },
  rightBadgeTextSpecial: {
    color: '#FFFFFF',
  },
});
