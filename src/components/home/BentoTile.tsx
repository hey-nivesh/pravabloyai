import { type ComponentProps, useEffect, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

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
  const scale = useRef(new Animated.Value(1)).current;
  const [canUseGlass, setCanUseGlass] = useState(false);

  const animateTo = (toScale: number) => {
    Animated.spring(scale, {
      toValue: toScale,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  };

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const reduceTransparency = await AccessibilityInfo.isReduceTransparencyEnabled();
        const supported =
          Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable() && !reduceTransparency;
        if (mounted) setCanUseGlass(supported);
      } catch {
        if (mounted) setCanUseGlass(false);
      }
    };
    check();
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', check);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const Surface: any = useMemo(() => (canUseGlass ? GlassView : View), [canUseGlass]);

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        styles.spanOne,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
      style={({ pressed }) => [
        styles.tilePressable,
        pressed && styles.tilePressed,
      ]}
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      onHoverIn={() => animateTo(1.01)}
      onHoverOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
        <View style={styles.tileOuter}>
          <Surface
            style={styles.tile}
            {...(canUseGlass
              ? { glassEffectStyle: 'regular', tintColor: 'rgba(255,255,255,0.35)', isInteractive: false }
              : null)}
          >
            {/* Soft top highlight + bottom shade so it blends into bg */}
            <View style={styles.tileHighlight} pointerEvents="none" />
            <View style={styles.tileShade} pointerEvents="none" />

            <View style={styles.tileInnerStroke} pointerEvents="none" />

            <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
              <View style={styles.iconBadgeHighlight} pointerEvents="none" />
              <SymbolView name={icon} size={22} tintColor={iconColor} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
          </Surface>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tileWrap: {
    marginBottom: Spacing.two + 2,
  },
  spanOne: {
    width: '31.5%',
  },
  tilePressable: {
    borderRadius: Radius.lg,
    overflow: 'visible',
  },
  tileOuter: {
    borderRadius: Radius.lg,
    overflow: 'visible',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    ...Platform.select({
      ios: {
        elevation: 2,
      },
      default: {
        elevation: 0,
      },
    }),
  },
  tile: {
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.12)',
      default: 'rgba(237,228,252,0.72)',
    }),
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Platform.select({
      ios: 'rgba(255,255,255,0.55)',
      default: 'rgba(255,255,255,0.75)',
    }),
    borderCurve: 'continuous',
  },
  tileInnerStroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127, 34, 253, 0.1)',
  },
  tileHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
    opacity: 0.38,
  },
  tileShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage:
      'linear-gradient(0deg, rgba(232,220,252,0.35) 0%, rgba(232,220,252,0) 100%)',
    opacity: 0.32,
  },
  tilePressed: {
    opacity: 0.9,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)',
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Brand.primaryDark,
    textAlign: 'center',
    lineHeight: 15,
  },
});
