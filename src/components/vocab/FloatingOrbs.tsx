/**
 * FloatingOrbs — Ambient drifting purple orbs for the Vocab Vault background.
 *
 * Reuses the brand palette (Brand.primary, Brand.primaryLight, Brand.primaryDark)
 * at low opacity to create a soft, living background consistent with the
 * AnimatedSplashOverlay aesthetic. Uses react-native-reanimated withRepeat /
 * withTiming for smooth infinite loops.
 *
 * Respects `useReducedMotion()` — renders static orbs when the user has
 * enabled the OS-level Reduce Motion accessibility setting.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

// ─── Orb config ────────────────────────────────────────────────────────────────

type OrbDef = {
  size: number;
  color: string;
  opacity: number;
  /** Starting position as fraction of container (0–1) */
  startX: number;
  startY: number;
  /** Drift range in points */
  driftX: number;
  driftY: number;
  /** Animation duration in ms */
  duration: number;
  /** Initial delay before first drift */
  delay: number;
};

const ORBS: OrbDef[] = [
  {
    size: 180,
    color: Brand.primary,
    opacity: 0.07,
    startX: -0.1,
    startY: 0.05,
    driftX: 30,
    driftY: 40,
    duration: 7000,
    delay: 0,
  },
  {
    size: 120,
    color: Brand.primaryLight,
    opacity: 0.09,
    startX: 0.75,
    startY: 0.1,
    driftX: -25,
    driftY: 35,
    duration: 8500,
    delay: 1200,
  },
  {
    size: 90,
    color: Brand.primaryDark,
    opacity: 0.06,
    startX: 0.55,
    startY: 0.45,
    driftX: 20,
    driftY: -30,
    duration: 6000,
    delay: 2500,
  },
  {
    size: 150,
    color: Brand.primary,
    opacity: 0.05,
    startX: -0.05,
    startY: 0.7,
    driftX: 35,
    driftY: -20,
    duration: 9500,
    delay: 800,
  },
  {
    size: 70,
    color: Brand.primaryLight,
    opacity: 0.1,
    startX: 0.85,
    startY: 0.6,
    driftX: -15,
    driftY: 25,
    duration: 5500,
    delay: 3000,
  },
];

// ─── Single orb ───────────────────────────────────────────────────────────────

type OrbProps = OrbDef & { reducedMotion: boolean };

function Orb({
  size,
  color,
  opacity,
  startX,
  startY,
  driftX,
  driftY,
  duration,
  delay,
  reducedMotion,
}: OrbProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const animOpacity = useSharedValue(reducedMotion ? opacity : opacity * 0.6);

  useEffect(() => {
    if (reducedMotion) {
      animOpacity.value = opacity;
      return;
    }

    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(driftX, {
          duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(driftY, {
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );

    animOpacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(opacity, {
          duration: duration * 0.8,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, [reducedMotion, delay, driftX, driftY, duration, opacity, translateX, translateY, animOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: animOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: `${startX * 100}%` as unknown as number,
          top: `${startY * 100}%` as unknown as number,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function FloatingOrbs() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((orb, index) => (
        <Orb key={index} {...orb} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
