import { StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type StreakBadgeProps = {
  count: number;
};

/**
 * A pill-shaped badge showing the user's current streak.
 * Uses a flame emoji as the icon for cross-platform compatibility.
 * Renders in an accentGreen-tinted pill.
 */
export function StreakBadge({ count }: StreakBadgeProps) {
  return (
    <View style={styles.pill} accessibilityLabel={`${count} day streak`}>
      <Text style={styles.flame} accessibilityElementsHidden>
        🔥
      </Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.accentOrangeLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    gap: 2,
    shadowColor: Brand.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  flame: {
    fontSize: 13,
    lineHeight: 18,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.accentOrange,
    lineHeight: 18,
  },
});
