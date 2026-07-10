import { type ComponentProps, useEffect, useMemo } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import type { SplashReadinessTiles } from '@/hooks/use-splash-readiness';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IS_COMPACT = SCREEN_H < 700;
const AVATAR_SIZE = IS_COMPACT ? 128 : 156;

type SplashSceneProps = {
  tiles: SplashReadinessTiles;
  homeReady: boolean;
  exiting: boolean;
};

type BadgeDef = {
  id: string;
  icon: SymbolName;
  backgroundColor: string;
  top: number;
  left?: number;
  right?: number;
  delay: number;
  bobDuration: number;
};

const BADGES: BadgeDef[] = [
  {
    id: 'voice',
    icon: { ios: 'mic.fill', android: 'mic', web: 'mic' },
    backgroundColor: Brand.accentGreen,
    top: IS_COMPACT ? -8 : -14,
    left: IS_COMPACT ? -18 : -28,
    delay: 420,
    bobDuration: 2400,
  },
  {
    id: 'vocab',
    icon: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
    backgroundColor: Brand.primary,
    top: IS_COMPACT ? -4 : -8,
    right: IS_COMPACT ? -16 : -24,
    delay: 520,
    bobDuration: 2800,
  },
  {
    id: 'progress',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
    backgroundColor: Brand.primaryDark,
    top: IS_COMPACT ? 56 : 72,
    right: IS_COMPACT ? -36 : -48,
    delay: 620,
    bobDuration: 3200,
  },
];

const CLOUDS = [
  { size: SCREEN_W * 0.62, top: SCREEN_H * 0.04, left: -SCREEN_W * 0.18, color: '#EDE4FA', driftX: 16, driftY: 10, duration: 11000 },
  { size: SCREEN_W * 0.5, top: SCREEN_H * 0.1, right: -SCREEN_W * 0.14, color: '#F3EDFD', driftX: -14, driftY: 8, duration: 13000 },
  { size: SCREEN_W * 0.44, top: SCREEN_H * 0.42, left: -SCREEN_W * 0.08, color: '#E8DCFC', driftX: 12, driftY: -9, duration: 15000 },
] as const;

function getStatusMessage(tiles: SplashReadinessTiles, homeReady: boolean): string {
  if (!tiles.fonts) return 'Warming up your coach';
  if (!tiles.authProfile) return 'Getting your profile ready';
  if (!tiles.assets || !homeReady) return 'Almost there';
  return 'Ready to go';
}

function SplashCloud({
  size,
  top,
  left,
  right,
  color,
  driftX,
  driftY,
  duration,
  reducedMotion,
}: {
  size: number;
  top: number;
  left?: number;
  right?: number;
  color: string;
  driftX: number;
  driftY: number;
  duration: number;
  reducedMotion: boolean;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-driftX, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(driftY, { duration: duration * 1.1, easing: Easing.inOut(Easing.sin) }),
        withTiming(-driftY, { duration: duration * 1.1, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [driftX, driftY, duration, reducedMotion, tx, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(reducedMotion ? 200 : 320)}
      style={[
        styles.cloud,
        {
          width: size,
          height: size * 0.62,
          borderRadius: size * 0.31,
          top,
          left,
          right,
          backgroundColor: color,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

function SplashFloatingBadge({
  badge,
  reducedMotion,
  exiting,
}: {
  badge: BadgeDef;
  reducedMotion: boolean;
  exiting: boolean;
}) {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || exiting) return;
    bob.value = withDelay(
      badge.delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: badge.bobDuration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(5, { duration: badge.bobDuration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [badge.bobDuration, badge.delay, bob, exiting, reducedMotion]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  const entering = reducedMotion
    ? FadeIn.duration(220).delay(badge.delay)
    : FadeIn.duration(280)
        .delay(badge.delay)
        .springify()
        .damping(14)
        .stiffness(160);

  const exitingAnim = exiting
    ? FadeOut.duration(320).withInitialValues({ transform: [{ scale: 0.92 }] })
    : undefined;

  return (
    <Animated.View
      entering={entering}
      exiting={exitingAnim}
      style={[
        styles.badge,
        {
          top: badge.top,
          left: badge.left,
          right: badge.right,
          backgroundColor: badge.backgroundColor,
        },
        bobStyle,
      ]}
    >
      <SymbolView name={badge.icon} size={18} tintColor="#FFFFFF" />
    </Animated.View>
  );
}

function SplashPedestal({ reducedMotion, exiting }: { reducedMotion: boolean; exiting: boolean }) {
  const entering = reducedMotion ? FadeIn.duration(240) : FadeIn.duration(300).springify().damping(16);

  return (
    <Animated.View entering={entering} exiting={exiting ? FadeOut.duration(320) : undefined} style={styles.pedestalWrap}>
      <View style={styles.pedestalShadow} />
      <View style={styles.pedestalBase} />
      <View style={styles.pedestalTop} />
    </Animated.View>
  );
}

function SplashAvatar({ reducedMotion, exiting }: { reducedMotion: boolean; exiting: boolean }) {
  const floatY = useSharedValue(0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.55);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(
      180,
      withSpring(1, { damping: 11, stiffness: 170, mass: 0.75 }),
    );
    floatY.value = withDelay(
      520,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(7, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [floatY, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  const entering = reducedMotion ? FadeIn.duration(280).delay(120) : undefined;
  const exitingAnim = exiting ? FadeOut.duration(320) : undefined;

  return (
    <Animated.View
      entering={entering}
      exiting={exitingAnim}
      style={[styles.avatarWrap, { width: AVATAR_SIZE, height: AVATAR_SIZE }, animStyle]}
    >
      <Image
        source={require('@/assets/images/avatar.png')}
        style={styles.avatar}
        contentFit="contain"
        accessibilityLabel="PravabloyAI coach mascot"
      />
    </Animated.View>
  );
}

function SplashWordmark({ reducedMotion, exiting }: { reducedMotion: boolean; exiting: boolean }) {
  const letters = 'PravabloyAI'.split('');

  return (
    <Animated.View
      entering={FadeIn.duration(reducedMotion ? 220 : 300).delay(reducedMotion ? 300 : 560)}
      exiting={exiting ? FadeOut.duration(280) : undefined}
      style={styles.wordmarkRow}
    >
      {letters.map((char, index) => (
        <Animated.Text
          key={`${char}-${index}`}
          entering={
            reducedMotion
              ? undefined
              : FadeIn.duration(220)
                  .delay(560 + index * 28)
                  .springify()
                  .damping(14)
          }
          style={styles.wordmark}
        >
          {char}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}

function SplashLoadingStatus({
  message,
  reducedMotion,
  exiting,
}: {
  message: string;
  reducedMotion: boolean;
  exiting: boolean;
}) {
  const dot1 = useSharedValue(0.35);
  const dot2 = useSharedValue(0.35);
  const dot3 = useSharedValue(0.35);

  useEffect(() => {
    if (reducedMotion) {
      dot1.value = 1;
      dot2.value = 1;
      dot3.value = 1;
      return;
    }
    const pulse = (value: SharedValue<number>, delay: number) => {
      value.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.35, { duration: 320, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.35, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(dot1, 0);
    pulse(dot2, 160);
    pulse(dot3, 320);
  }, [dot1, dot2, dot3, reducedMotion]);

  const dotStyle1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dotStyle2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dotStyle3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View
      entering={FadeIn.duration(reducedMotion ? 200 : 280).delay(reducedMotion ? 380 : 760)}
      exiting={exiting ? FadeOut.duration(240) : undefined}
      style={styles.statusRow}
      accessibilityRole="text"
      accessibilityLabel={`${message}, loading`}
    >
      <Text style={styles.statusText}>{message}</Text>
      <View style={styles.ellipsis}>
        <Animated.View style={[styles.dot, dotStyle1]} />
        <Animated.View style={[styles.dot, dotStyle2]} />
        <Animated.View style={[styles.dot, dotStyle3]} />
      </View>
    </Animated.View>
  );
}

export function SplashScene({ tiles, homeReady, exiting }: SplashSceneProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion() ?? false;
  const statusMessage = useMemo(() => getStatusMessage(tiles, homeReady), [tiles, homeReady]);

  return (
    <View style={styles.root}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.gradientBg,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          { experimental_backgroundImage: `linear-gradient(180deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 72%)` },
        ]}
      />

      {CLOUDS.map((cloud, index) => (
        <SplashCloud key={index} {...cloud} reducedMotion={reducedMotion} />
      ))}

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (IS_COMPACT ? 12 : 24),
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View style={styles.heroStage}>
          <View style={styles.figureCluster}>
            {BADGES.map((badge) => (
              <SplashFloatingBadge
                key={badge.id}
                badge={badge}
                reducedMotion={reducedMotion}
                exiting={exiting}
              />
            ))}

            <View style={styles.avatarPedestalStack}>
              <SplashPedestal reducedMotion={reducedMotion} exiting={exiting} />
              <SplashAvatar reducedMotion={reducedMotion} exiting={exiting} />
            </View>
          </View>

          <SplashWordmark reducedMotion={reducedMotion} exiting={exiting} />

          <Animated.Text
            entering={FadeIn.duration(reducedMotion ? 200 : 260).delay(reducedMotion ? 360 : 820)}
            exiting={exiting ? FadeOut.duration(260) : undefined}
            style={styles.tagline}
          >
            Speak boldly. Grow daily.
          </Animated.Text>
        </View>

        <SplashLoadingStatus
          message={statusMessage}
          reducedMotion={reducedMotion}
          exiting={exiting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    backgroundColor: Brand.bgGradientStart,
  },
  cloud: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroStage: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  figureCluster: {
    position: 'relative',
    width: AVATAR_SIZE + 96,
    height: AVATAR_SIZE + (IS_COMPACT ? 54 : 68),
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: IS_COMPACT ? 4 : 10,
  },
  avatarPedestalStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    height: AVATAR_SIZE + (IS_COMPACT ? 34 : 42),
  },
  pedestalWrap: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    width: IS_COMPACT ? 168 : 196,
    height: IS_COMPACT ? 34 : 40,
  },
  pedestalShadow: {
    position: 'absolute',
    bottom: -6,
    width: IS_COMPACT ? 132 : 152,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(76, 14, 158, 0.12)',
  },
  pedestalBase: {
    position: 'absolute',
    bottom: 0,
    width: IS_COMPACT ? 168 : 196,
    height: IS_COMPACT ? 22 : 26,
    borderRadius: 999,
    backgroundColor: '#DDD6FE',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  pedestalTop: {
    position: 'absolute',
    bottom: IS_COMPACT ? 14 : 16,
    width: IS_COMPACT ? 118 : 136,
    height: IS_COMPACT ? 16 : 18,
    borderRadius: 999,
    backgroundColor: Brand.cardBg,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarWrap: {
    position: 'absolute',
    bottom: IS_COMPACT ? 18 : 22,
    zIndex: 2,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  wordmark: {
    fontSize: IS_COMPACT ? 28 : 32,
    fontWeight: '900',
    color: Brand.primaryDark,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.grayText,
    textAlign: 'center',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 22,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.grayText,
  },
  ellipsis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
    paddingTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Brand.primary,
  },
});
