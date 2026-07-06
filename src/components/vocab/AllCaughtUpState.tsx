/**
 * AllCaughtUpState — The empty/complete state shown when:
 *  a) The user has finished all words in today's session, OR
 *  b) No words are due and no new curated word is available
 *
 * Shows the resting coach, a streak summary, and CTAs.
 */

import React from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ComponentProps,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type AllCaughtUpStateProps = {
  streakCount: number;
  wordsCompletedToday: number;
  onGoHome: () => void;
  onStartPractice: () => void;
};

export function AllCaughtUpState({
  streakCount,
  wordsCompletedToday,
  onGoHome,
  onStartPractice,
}: AllCaughtUpStateProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const coachScale = useSharedValue(0.6);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    translateY.value = withSpring(0, { damping: 16, stiffness: 100 });
    coachScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 120 }));
  }, [opacity, translateY, coachScale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const coachStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coachScale.value }],
  }));

  const flameIcon: SymbolName = {
    ios: 'flame.fill',
    android: 'local_fire_department',
    web: 'local_fire_department',
  };
  const bookIcon: SymbolName = {
    ios: 'books.vertical.fill',
    android: 'book',
    web: 'book',
  };
  const micIcon: SymbolName = {
    ios: 'mic.fill',
    android: 'mic',
    web: 'mic',
  };
  const homeIcon: SymbolName = {
    ios: 'house.fill',
    android: 'home',
    web: 'home',
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Coach resting */}
      <Animated.View style={[styles.coachWrap, coachStyle]} pointerEvents="none">
        <Image
          source={require('@/assets/images/coach-resting.png')}
          style={styles.coachImage}
          contentFit="contain"
          accessibilityLabel="Vocabulary coach resting, session complete"
        />
      </Animated.View>

      {/* Headline */}
      <View style={styles.headline}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>You're all caught up!</Text>
        <Text style={styles.subtitle}>
          You studied {wordsCompletedToday} word{wordsCompletedToday !== 1 ? 's' : ''} today.
          Come back tomorrow for a fresh set.
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Brand.accentOrangeLight }]}>
            <SymbolView name={flameIcon} size={16} tintColor={Brand.accentOrange} />
          </View>
          <Text style={styles.statValue}>{streakCount}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Brand.accentGreenLight }]}>
            <SymbolView name={bookIcon} size={16} tintColor={Brand.accentGreen} />
          </View>
          <Text style={styles.statValue}>{wordsCompletedToday}</Text>
          <Text style={styles.statLabel}>Today's Words</Text>
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaStack}>
        <Pressable
          onPress={onStartPractice}
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Start a Live Voice Practice session"
        >
          <SymbolView name={micIcon} size={16} tintColor="#FFFFFF" />
          <Text style={styles.ctaPrimaryText}>Practice Speaking Now</Text>
        </Pressable>

        <Pressable
          onPress={onGoHome}
          style={({ pressed }) => [styles.ctaSecondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Return to Home Dashboard"
        >
          <SymbolView name={homeIcon} size={15} tintColor={Brand.primary} />
          <Text style={styles.ctaSecondaryText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  coachWrap: {
    width: 160,
    height: 180,
  },
  coachImage: {
    width: 160,
    height: 180,
  },
  headline: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.08)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  statLabel: {
    fontSize: 11,
    color: Brand.grayText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(127, 34, 253, 0.08)',
    marginHorizontal: Spacing.two,
  },
  ctaStack: {
    width: '100%',
    gap: Spacing.two,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.15)',
  },
  ctaSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
