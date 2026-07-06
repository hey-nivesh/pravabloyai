/**
 * SessionProgress — Top-of-screen "Word N of M" indicator with an animated
 * progress bar. Transitions smoothly as the user advances through the session.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SessionProgressProps = {
  current: number; // 1-based display index (currentIndex + 1)
  total: number;
};

export function SessionProgress({ current, total }: SessionProgressProps) {
  const progress = total > 0 ? current / total : 0;

  const fillStyle = useAnimatedStyle(() => ({
    width: `${withSpring(progress * 100, { damping: 18, stiffness: 120 })}%` as unknown as number,
  }));

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={`Word ${current} of ${total}`} accessibilityValue={{ min: 0, max: total, now: current }}>
      <View style={styles.row}>
        <Text style={styles.label}>Daily Word</Text>
        <Text style={styles.counter}>
          <Text style={styles.currentNum}>{current}</Text>
          <Text style={styles.ofText}> of {total}</Text>
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  counter: {
    fontSize: 12,
  },
  currentNum: {
    fontWeight: '800',
    color: Brand.primaryDark,
    fontSize: 13,
  },
  ofText: {
    fontWeight: '500',
    color: Brand.grayText,
    fontSize: 12,
  },
  track: {
    height: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(127, 34, 253, 0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.sm,
    // @ts-ignore — experimental_backgroundImage supported in RN 0.76+ / Expo SDK 57
    experimental_backgroundImage: `linear-gradient(90deg, ${Brand.primaryLight} 0%, ${Brand.primary} 100%)`,
  },
});
