/**
 * WaveformVisualizer
 * ──────────────────
 * Renders a real-time animated bar waveform synced to an `amplitude` prop (0–1).
 * Uses react-native-reanimated shared values + spring animations for buttery-smooth 60fps.
 *
 * Props:
 *   amplitude   – normalised 0–1 value (updated continuously by caller)
 *   color       – bar fill colour (defaults to Electric Purple)
 *   barCount    – number of bars (default 28)
 *   height      – container height (default 64)
 *   active      – when false the bars collapse to minimal resting height
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 12,
  stiffness: 180,
  mass: 0.6,
};

// Each bar gets a unique phase offset so they ripple outward from centre.
function getPhaseOffset(index: number, total: number): number {
  const centre = total / 2;
  return 1 - Math.abs(index - centre) / centre; // 0 at edges, 1 at centre
}

interface BarProps {
  amplitude: number;
  phaseOffset: number;
  color: string;
  maxHeight: number;
  minHeight: number;
  width: number;
  active: boolean;
}

const AnimatedBar = React.memo(function AnimatedBar({
  amplitude,
  phaseOffset,
  color,
  maxHeight,
  minHeight,
  width,
  active,
}: BarProps) {
  const heightVal = useSharedValue(minHeight);

  useEffect(() => {
    const target = active
      ? minHeight + (maxHeight - minHeight) * Math.min(1, amplitude * (0.3 + phaseOffset * 0.7))
      : minHeight;
    heightVal.value = withSpring(target, SPRING_CONFIG);
  }, [amplitude, active, phaseOffset, maxHeight, minHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightVal.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          borderRadius: width / 2,
          backgroundColor: color,
          marginHorizontal: 1.5,
          alignSelf: 'center',
        },
      ]}
    />
  );
});

interface WaveformVisualizerProps {
  amplitude: number;
  color?: string;
  barCount?: number;
  height?: number;
  active?: boolean;
}

export default function WaveformVisualizer({
  amplitude,
  color = '#7F22FD',
  barCount = 28,
  height = 64,
  active = true,
}: WaveformVisualizerProps) {
  const minHeight = Math.max(3, height * 0.06);
  const maxHeight = height * 0.92;
  const barWidth = 3;

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {Array.from({ length: barCount }, (_, i) => (
        <AnimatedBar
          key={i}
          amplitude={amplitude}
          phaseOffset={getPhaseOffset(i, barCount)}
          color={color}
          maxHeight={maxHeight}
          minHeight={minHeight}
          width={barWidth}
          active={active}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
