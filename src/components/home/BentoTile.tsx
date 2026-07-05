import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

/** Exact type of the `name` prop that SymbolView expects */
type SymbolName = ComponentProps<typeof SymbolView>['name'];

type BentoTileProps = {
  /** Icon name — pass a platform-adaptive object matching SymbolView's name prop */
  icon: SymbolName;
  /** Icon badge background color — e.g. Brand.primaryBadgeBg */
  iconBgColor: string;
  /** Icon tint color — e.g. Brand.primary */
  iconColor: string;
  /** Label shown below the icon badge */
  label: string;
  /** Called when the tile is pressed */
  onPress: () => void;
  /** Accessibility label for screen readers */
  accessibilityLabel: string;
};

/**
 * Reusable bento-grid tile.
 *
 * Styling rules:
 * - White card surface, 24px radius, soft purple-tinted shadow (3D-modular feel)
 * - Colored rounded icon badge on top (glassmorphic-style container)
 * - Short label text below in primaryDark
 */
export function BentoTile({
  icon,
  iconBgColor,
  iconColor,
  label,
  onPress,
  accessibilityLabel,
}: BentoTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
        <SymbolView name={icon} size={22} tintColor={iconColor} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  tilePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.primaryDark,
    textAlign: 'center',
    lineHeight: 16,
  },
});
