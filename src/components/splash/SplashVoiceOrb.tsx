import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

const MIC_ICON = { ios: 'mic.fill', android: 'mic', web: 'mic' } as const;

export function SplashVoiceOrb({ size = 96 }: { size?: number }) {
  const reducedMotion = useReducedMotion() ?? false;
  const floatY = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    if (reducedMotion) return;

    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [reducedMotion, floatY, glowScale, glowOpacity]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const orbSize = size;
  const innerSize = size * 0.72;

  return (
    <Animated.View style={[styles.wrap, { width: orbSize, height: orbSize }, floatStyle]}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: orbSize + 28,
            height: orbSize + 28,
            borderRadius: (orbSize + 28) / 2,
          },
          glowStyle,
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        <View style={styles.innerHighlight} />
        <SymbolView name={MIC_ICON} size={innerSize * 0.34} tintColor="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: Brand.primaryLight,
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(145deg, ${Brand.primaryLight} 0%, ${Brand.primary} 55%, ${Brand.primaryDark} 100%)`,
    backgroundColor: Brand.primary,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  innerHighlight: {
    position: 'absolute',
    top: 6,
    left: 10,
    right: 10,
    height: '38%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
