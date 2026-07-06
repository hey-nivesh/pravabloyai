/**
 * VocabVaultScreen — Flagship Daily Word / Vocab Vault screen.
 *
 * Fully wires:
 *  - useDailyWord hook for session data, local caching, and SRS tracking
 *  - expo-av Audio stack for pronunciation & example sentence audio playback
 *  - Beautiful entry, exit, and celebration states
 *  - Screen layout with FloatingOrbs, progress tracker, WordCard, and Explanation
 *  - Complete compliance with Accessibility guidelines
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useUserProfile, getFirstName } from '@/hooks/useUserProfile';
import { useDailyWord, MasteryResponse } from '@/hooks/use-daily-word';
import { Skeleton } from '@/components/home/Skeleton';

// Components
import { FloatingOrbs } from '@/components/vocab/FloatingOrbs';
import { SessionProgress } from '@/components/vocab/SessionProgress';
import { WordCard } from '@/components/vocab/WordCard';
import { ExplanationSection } from '@/components/vocab/ExplanationSection';
import { AllCaughtUpState } from '@/components/vocab/AllCaughtUpState';

export default function VocabVaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const {
    status,
    words,
    currentIndex,
    currentWord,
    totalWords,
    submitResponse,
    getPronunciationUrl,
    getExampleAudioUrl,
  } = useDailyWord();

  const streakCount = profile?.streak_count ?? 0;
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + Spacing.five;

  // Coach avatar pose tracking: 'explaining' | 'celebrating' | 'resting'
  const [coachState, setCoachState] = useState<'explaining' | 'celebrating' | 'resting'>('explaining');

  // Audio Player Core using expo-audio
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [playingType, setPlayingType] = useState<'word' | 'example' | null>(null);

  const wordAudioPlaying = playerStatus.playing && playingType === 'word';
  const exampleAudioPlaying = playerStatus.playing && playingType === 'example';
  const exampleAudioLoading = playerStatus.isBuffering && playingType === 'example';

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(err => {
      if (__DEV__) {
        console.warn('[VocabVaultScreen] Failed to set audio mode:', err);
      }
    });
  }, []);

  useEffect(() => {
    player.pause();
    setPlayingType(null);
    setCoachState('explaining');
  }, [currentIndex]);

  const playSound = async (uri: string, type: 'word' | 'example') => {
    try {
      setPlayingType(type);
      player.replace({ uri });
      player.play();
    } catch (error) {
      if (__DEV__) {
        console.warn('[VocabVaultScreen] Audio play failed:', error);
      }
      setPlayingType(null);
    }
  };

  const handlePlayWordAudio = (speed: 'normal' | 'slow' = 'normal') => {
    if (!currentWord) return;
    // For local mock data fallback, we use web-safe public pronunciation files or TTS proxies
    const url = currentWord.id.startsWith('mock-')
      ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(currentWord.word)}&type=2`
      : getPronunciationUrl(currentWord.id, speed);
    playSound(url, 'word');
  };

  const handlePlayExampleAudio = () => {
    if (!currentWord) return;
    const url = currentWord.id.startsWith('mock-')
      ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(currentWord.exampleSentence)}&type=2`
      : getExampleAudioUrl(currentWord.id);
    playSound(url, 'example');
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  const handleStartPractice = () => {
    router.push('/practice');
  };

  // Render main screen states
  return (
    <View style={styles.root}>
      {/* Drifting background gradient & floating orbs */}
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />
      <FloatingOrbs />

      {/* Main Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back to Dashboard"
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={Brand.primaryDark}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Word</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading Skeleton State */}
      {status === 'loading' && (
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonWrap}>
            <Skeleton height={24} width={150} borderRadius={Radius.sm} />
            <Skeleton height={220} borderRadius={Radius.xl} />
            <Skeleton height={140} borderRadius={Radius.lg} />
          </View>
        </View>
      )}

      {/* Empty / Complete State */}
      {status === 'complete' && (
        <AllCaughtUpState
          streakCount={streakCount}
          wordsCompletedToday={totalWords}
          onGoHome={handleGoHome}
          onStartPractice={handleStartPractice}
        />
      )}

      {/* Active Practice Screen */}
      {status !== 'loading' && status !== 'complete' && currentWord && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContent}>
            {/* 1. Progress Indicator */}
            <SessionProgress current={currentIndex + 1} total={totalWords} />

            {/* 2. Primary Word Card */}
            <WordCard
              key={currentWord.id}
              word={currentWord}
              isPlaying={wordAudioPlaying}
              onPlayAudio={handlePlayWordAudio}
              onSubmit={submitResponse}
              onSetCoachState={setCoachState}
            />

            {/* 3. Explanation Section */}
            <ExplanationSection
              definition={currentWord.definition}
              exampleSentence={currentWord.exampleSentence}
              usageTip={currentWord.usageTip}
              exampleAudioPlaying={exampleAudioPlaying}
              exampleAudioLoading={exampleAudioLoading}
              onPlayExampleAudio={handlePlayExampleAudio}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  skeletonWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  innerContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
});
