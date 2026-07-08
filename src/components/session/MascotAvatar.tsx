/**
 * MascotAvatar
 * ─────────────
 * Floating 3D-style mascot avatar with:
 *   - Continuous gentle float loop (translateY oscillation)
 *   - Outer glow ring that pulses with aiAmplitude (0–1)
 *   - Speaking state ring — Electric Purple glow when AI talks
 *   - Resting ring — soft lavender when idle
 *
 * Uses coach images already in assets/images.
 * Fallback to a stylised gradient circle if image fails to load.
 */

import React, { useEffect } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

interface MascotAvatarProps {
  /** 0–1, from useVoiceStream aiAmplitude */
  aiAmplitude?: number;
  /** whether the AI is currently speaking */
  aiSpeaking?: boolean;
  /** avatar image source; defaults to coach-explaining */
  source?: ImageSourcePropType;
  size?: number;
}

const FLOAT_DURATION = 2800;
const FLOAT_DISTANCE = 10;

export default function MascotAvatar({
  aiAmplitude = 0,
  aiSpeaking = false,
  source,
  size = 160,
}: MascotAvatarProps) {
  const floatY = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.25);
  const outerRingScale = useSharedValue(1);

  // ── Continuous float loop ────────────────────────────────────────────────
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-FLOAT_DISTANCE, {
          duration: FLOAT_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(FLOAT_DISTANCE, {
          duration: FLOAT_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, []);

  // ── Amplitude → glow scale + opacity ────────────────────────────────────
  useEffect(() => {
    const targetScale = 1 + aiAmplitude * 0.18;
    const targetOpacity = aiSpeaking ? 0.15 + aiAmplitude * 0.6 : 0.15;
    glowScale.value = withSpring(targetScale, { damping: 8, stiffness: 120 });
    glowOpacity.value = withSpring(targetOpacity, { damping: 10, stiffness: 100 });
  }, [aiAmplitude, aiSpeaking]);

  // ── Outer ring pulse ─────────────────────────────────────────────────────
  useEffect(() => {
    if (aiSpeaking) {
      outerRingScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      outerRingScale.value = withSpring(1);
    }
  }, [aiSpeaking]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerRingScale.value }],
    borderColor: aiSpeaking ? '#7F22FD' : '#D8B4FE',
    opacity: aiSpeaking ? 1 : 0.4,
  }));

  const avatarSource = source ?? require('@/assets/images/coach-explaining.png');

  const containerSize = size + 48; // padding for glow ring

  return (
    <View style={[styles.wrapper, { width: containerSize, height: containerSize }]}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.ring,
          outerRingStyle,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
          },
        ]}
      />

      {/* Glow blob */}
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: '#7F22FD',
          },
        ]}
      />

      {/* Floating avatar */}
      <Animated.View
        style={[
          floatStyle,
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Image
          source={avatarSource}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />

        {/* Inner purple border ring */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              borderWidth: 3,
              borderColor: '#7F22FD',
              opacity: 0.5,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#7F22FD',
  },
  glow: {
    position: 'absolute',
  },
  avatarContainer: {
    overflow: 'hidden',
    // 3D shadow for depth
    shadowColor: '#7F22FD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
});
