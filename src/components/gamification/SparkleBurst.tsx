import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

type Particle = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
};

type SparkleBurstProps = {
  onComplete?: () => void;
};

export function SparkleBurst({ onComplete }: SparkleBurstProps) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (reducedMotion) {
      onComplete?.();
      return;
    }
    progress.value = withTiming(
      1,
      { duration: 600, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      },
    );
  }, [reducedMotion, onComplete, progress]);

  const particles: Particle[] = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 12;
    const distance = 40 + Math.random() * 50;
    const size = 6 + Math.random() * 8;
    const colors = [Brand.accentGreen, Brand.primaryLight, Brand.accentOrange, '#FCD34D'];
    return { id: i, angle, distance, size, color: colors[i % colors.length] };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <SparkleParticle key={p.id} particle={p} progress={progress} />
      ))}
    </View>
  );
}

function SparkleParticle({
  particle: p,
  progress,
}: {
  particle: Particle;
  progress: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const x = Math.cos(p.angle) * p.distance * progress.value;
    const y = Math.sin(p.angle) * p.distance * progress.value;
    const scale = interpolate(progress.value, [0, 0.25, 1], [0.1, 1.2, 0]);
    const opacity = interpolate(progress.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
        },
        animStyle,
      ]}
    />
  );
}
