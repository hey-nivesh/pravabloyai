import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

const DURATION = 900;
const HOLD_MS = 900;
const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [animate]);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }, { translateY: 0 }],
      opacity: 1,
    },
    75: {
      opacity: 1,
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1.02 }, { translateY: -4 }],
      easing: Easing.out(Easing.quad),
    },
  });

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION)}
      style={styles.splashOverlay}>
      <View style={styles.contentCard}>
        <View style={styles.avatarRing}>
          <Image
            style={styles.avatar}
            source={require('@/assets/images/avatar.png')}
            contentFit="cover"
          />
        </View>
        <Text style={styles.title}>PravabloyAI</Text>
        <Text style={styles.tagline}>Speak boldly. Grow daily.</Text>
        <View style={styles.loaderTrack}>
          <View style={styles.loaderFill} />
        </View>
      </View>
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      <View style={styles.contentCard}>
        <View style={styles.avatarRing}>
          <Image
            style={styles.avatar}
            source={require('@/assets/images/avatar.png')}
            contentFit="cover"
          />
        </View>
        <Text style={styles.title}>PravabloyAI</Text>
        <Text style={styles.tagline}>Speak boldly. Grow daily.</Text>
        <View style={styles.loaderTrack}>
          <View style={styles.loaderFill} />
        </View>
      </View>
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentCard: {
    width: '84%',
    maxWidth: 340,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 8,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFFFFF',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 7,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  title: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 10,
  },
  loaderTrack: {
    width: '100%',
    height: 14,
    borderRadius: 999,
    padding: 2,
    backgroundColor: 'rgba(10, 16, 49, 0.55)',
  },
  loaderFill: {
    width: '34%',
    height: '100%',
    borderRadius: 999,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: 'linear-gradient(90deg, #A855F7 0%, #7F22FD 100%)',
    backgroundColor: '#7F22FD',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: 'linear-gradient(180deg, #4C0E9E 0%, #7F22FD 45%, #A855F7 100%)',
    backgroundColor: '#4C0E9E',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
