import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand, Radius } from '@/constants/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * A pulsing skeleton placeholder used while data is loading.
 * Matches the shape of the component it replaces via width/height/borderRadius.
 */
export function Skeleton({ width = '100%', height, borderRadius = Radius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as ViewStyle['width'], height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Brand.primaryBadgeBg,
  },
});
