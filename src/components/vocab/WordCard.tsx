/**
 * WordCard — The primary focal element on the Daily Word screen.
 *
 * Visual & Interaction Features:
 *  1. Playful Reveal Animation: Scale and opacity entrance (under 750ms).
 *  2. Large typography: Word text (primaryDark), phonetics (grayText).
 *  3. Pronunciation Play Button: Primary color, soft shadow, pulsing invite.
 *  4. Audio Equalizer Wave: Synced to playback state. Uses premium Reanimated
 *     springs for multiple pulsing audio-bars.
 *  5. Slow Motion Playback: Secondary button (currently displays toast as backend follow-up).
 *  6. Part of speech pill tag.
 *  7. SRS buttons: "Still learning" (soft neutral) and "Got it!" (confident emerald green).
 *  8. Mastery Celebrations: Tapping "Got it!" triggers a state swap of the coach
 *     to 'celebrating' and releases a burst of animated sparkle particles before sliding out.
 *
 * Accessibility:
 *  - Fully visible textual representations (non-audio-only).
 *  - Respects reduced-motion setting.
 *  - Explicit accessibilityLabels and accessibilityRoles.
 */

import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  useReducedMotion,
  Easing,
  withSequence,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { DailyWord, MasteryResponse } from '@/hooks/use-daily-word';

// ─── Sparkle Particle Component ──────────────────────────────────────────────

type Particle = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
};

function SparkleBurst({ onComplete }: { onComplete: () => void }) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    progress.value = withTiming(
      1,
      { duration: 600, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }
    );
  }, [reducedMotion, progress, onComplete]);

  // Generate 12 radial particles
  const particles: Particle[] = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 12;
    const distance = 40 + Math.random() * 50;
    const size = 6 + Math.random() * 8;
    const colors = [Brand.accentGreen, Brand.primaryLight, Brand.accentOrange, '#FCD34D'];
    return {
      id: i,
      angle,
      distance,
      size,
      color: colors[i % colors.length],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const animStyle = useAnimatedStyle(() => {
          const x = Math.cos(p.angle) * p.distance * progress.value;
          const y = Math.sin(p.angle) * p.distance * progress.value;
          const scale = interpolate(progress.value, [0, 0.25, 1], [0.1, 1.2, 0]);
          const opacity = 1 - progress.value;

          return {
            transform: [{ translateX: x }, { translateY: y }, { scale: scale }],
            opacity,
          };
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.sparkle,
              {
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
              },
              animStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Equalizer Wave Component ────────────────────────────────────────────────

function AudioEqualizer({ active }: { active: boolean }) {
  const height1 = useSharedValue(6);
  const height2 = useSharedValue(6);
  const height3 = useSharedValue(6);
  const height4 = useSharedValue(6);

  useEffect(() => {
    if (active) {
      const timingConf = { duration: 250, easing: Easing.inOut(Easing.ease) };
      height1.value = withRepeat(withTiming(24, timingConf), -1, true);
      height2.value = withRepeat(withTiming(18, { ...timingConf, duration: 300 }), -1, true);
      height3.value = withRepeat(withTiming(28, { ...timingConf, duration: 200 }), -1, true);
      height4.value = withRepeat(withTiming(20, { ...timingConf, duration: 280 }), -1, true);
    } else {
      height1.value = withSpring(6);
      height2.value = withSpring(6);
      height3.value = withSpring(6);
      height4.value = withSpring(6);
    }
  }, [active, height1, height2, height3, height4]);

  const bar1 = useAnimatedStyle(() => ({ height: height1.value }));
  const bar2 = useAnimatedStyle(() => ({ height: height2.value }));
  const bar3 = useAnimatedStyle(() => ({ height: height3.value }));
  const bar4 = useAnimatedStyle(() => ({ height: height4.value }));

  return (
    <View style={styles.equalizerContainer}>
      <Animated.View style={[styles.equalizerBar, bar1]} />
      <Animated.View style={[styles.equalizerBar, bar2]} />
      <Animated.View style={[styles.equalizerBar, bar3]} />
      <Animated.View style={[styles.equalizerBar, bar4]} />
    </View>
  );
}

// ─── Primary Card Component ──────────────────────────────────────────────────

type WordCardProps = {
  word: DailyWord;
  isPlaying: boolean;
  onPlayAudio: (speed?: 'normal' | 'slow') => void;
  onSubmit: (response: MasteryResponse) => void;
  onSetCoachState: (state: 'explaining' | 'celebrating' | 'resting') => void;
};

export function WordCard({
  word,
  isPlaying,
  onPlayAudio,
  onSubmit,
  onSetCoachState,
}: WordCardProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const pulseScale = useSharedValue(1);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(40);
  const [showSparkles, setShowSparkles] = React.useState(false);

  // Entrance animation
  useEffect(() => {
    if (reducedMotion) {
      cardScale.value = 1;
      cardOpacity.value = 1;
      cardTranslateY.value = 0;
      return;
    }

    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 500 });
    cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, [word.id, reducedMotion, cardScale, cardOpacity, cardTranslateY]);

  // Pulse play button when not playing
  useEffect(() => {
    if (reducedMotion) {
      pulseScale.value = 1;
      return;
    }

    if (!isPlaying) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [isPlaying, reducedMotion, pulseScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleGotIt = () => {
    // 1. Swap coach pose to celebrating
    onSetCoachState('celebrating');
    // 2. Trigger sparkles
    setShowSparkles(true);

    if (reducedMotion) {
      onSubmit('got_it');
      return;
    }

    // 3. Slide card out after celebration brief peak
    setTimeout(() => {
      cardScale.value = withTiming(0.85, { duration: 250 });
      cardOpacity.value = withTiming(0, { duration: 250 });
      cardTranslateY.value = withTiming(-60, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(onSubmit)('got_it');
        }
      });
    }, 450);
  };

  const handleStillLearning = () => {
    if (reducedMotion) {
      onSubmit('still_learning');
      return;
    }

    cardOpacity.value = withTiming(0, { duration: 250 });
    cardScale.value = withTiming(0.95, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(onSubmit)('still_learning');
      }
    });
  };

  const handleSlowAudio = () => {
    onPlayAudio('slow');
    const msg = 'Slow-motion audio playback requested';
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Pronunciation', msg);
    }
  };

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Sparkles effect container */}
      {showSparkles && (
        <View style={styles.sparkleContainer}>
          <SparkleBurst onComplete={() => setShowSparkles(false)} />
        </View>
      )}

      {/* Header Row: Part of Speech */}
      <View style={styles.header}>
        <View style={styles.posPill}>
          <Text style={styles.posText}>{word.partOfSpeech}</Text>
        </View>
      </View>

      {/* Main Word Body */}
      <View style={styles.wordBody}>
        <Text style={styles.wordText} accessibilityRole="header">
          {word.word}
        </Text>
        <Text style={styles.phoneticText} accessibilityLabel={`phonetic reading: ${word.phonetic}`}>
          {word.phonetic}
        </Text>
      </View>

      {/* Audio Playback Controls */}
      <View style={styles.audioSection}>
        <Animated.View style={[styles.pulseWrap, pulseStyle]}>
          <Pressable
            onPress={() => onPlayAudio('normal')}
            style={({ pressed }) => [
              styles.playBtn,
              pressed && styles.pressed,
              isPlaying && styles.playBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying ? 'Playing pronunciation' : 'Play pronunciation'
            }
          >
            {isPlaying ? (
              <AudioEqualizer active={isPlaying} />
            ) : (
              <SymbolView
                name={{ ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }}
                size={28}
                tintColor="#FFFFFF"
              />
            )}
          </Pressable>
        </Animated.View>

        {/* Slow Motion Sub-Button */}
        <Pressable
          onPress={handleSlowAudio}
          style={({ pressed }) => [styles.slowBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Play pronunciation slowly"
        >
          <SymbolView
            name={{ ios: 'tortoise.fill', android: 'slow_motion_video', web: 'slow_motion_video' }}
            size={16}
            tintColor={Brand.primary}
          />
          <Text style={styles.slowBtnLabel}>Slower</Text>
        </Pressable>
      </View>

      {/* SRS Response Row */}
      <View style={styles.responseRow}>
        <Pressable
          onPress={handleStillLearning}
          style={({ pressed }) => [styles.stillLearningBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Still learning this word"
        >
          <Text style={styles.stillLearningText}>Still learning</Text>
        </Pressable>

        <Pressable
          onPress={handleGotIt}
          style={({ pressed }) => [styles.gotItBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Got it! Mastered this word"
        >
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check' }}
            size={16}
            tintColor="#FFFFFF"
          />
          <Text style={styles.gotItText}>Got it!</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
    marginHorizontal: Spacing.three,
    gap: Spacing.four,
    position: 'relative',
    overflow: 'visible',
  },
  header: {
    alignItems: 'flex-start',
  },
  posPill: {
    backgroundColor: Brand.primaryBadgeBg,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  posText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordBody: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  wordText: {
    fontSize: 36,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  phoneticText: {
    fontSize: 16,
    color: Brand.grayText,
    fontWeight: '500',
  },
  audioSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.one,
  },
  pulseWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  playBtnActive: {
    backgroundColor: Brand.primaryDark,
  },
  slowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.15)',
  },
  slowBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
  },
  responseRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  stillLearningBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stillLearningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  gotItBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one + 2,
    backgroundColor: Brand.accentGreen,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  gotItText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },

  // ── Equalizer layout ───────────────────────────────────────────────────────
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 32,
    width: 48,
  },
  equalizerBar: {
    width: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // ── Particle layout ────────────────────────────────────────────────────────
  sparkleContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  sparkle: {
    position: 'absolute',
  },
});
