/**
 * VocabVaultScreen — Expanded Vocab Vault section.
 *
 * Four modules, navigable via a segmented control at the top:
 *
 *   [ Daily ] [ History ] [ Saved ] [ Search ]
 *
 * ┌─────────────────────────────────────────────┐
 * │  Vault                    🔥 streak          │
 * │  ┌─────┐ ┌───────┐ ┌────┐ ┌──────┐         │
 * │  │Daily│ │History│ │Saved│ │Search│         │
 * │  └─────┘ └───────┘ └────┘ └──────┘         │
 * ├─────────────────────────────────────────────┤
 * │  [Daily]   → AI-generated word (Edge Fn)    │
 * │  [History] → Every word ever seen           │
 * │  [Saved]   → vocab_vault SRS review (orig.) │
 * │  [Search]  → Full-text search corpus        │
 * └─────────────────────────────────────────────┘
 *
 * AUDIO GUARANTEE:
 *   All three active modules (Daily, History, Search) use WordDetailView as
 *   their word-rendering component. WordDetailView has the only two audio
 *   buttons — one for word_audio_url, one for example_audio_url — so there
 *   is no way to reintroduce the audio-mixing bug on any new module.
 *
 * ANTI-REPEAT GUARANTEE:
 *   The Daily module calls generateWord() which invokes the generate-vocab-word
 *   Edge Function. The function checks user_word_history server-side and never
 *   returns a word the user has already seen. The upsert into user_word_history
 *   happens before the HTTP response is sent (crash-safe).
 *
 * GEMINI COST:
 *   The Edge Function prefers pre-enriched corpus words over Gemini generation.
 *   Gemini is called only when the user has exhausted all enriched corpus words.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

import { Brand, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useUserProfile, getFirstName } from '@/hooks/useUserProfile';

// ── Daily module imports ───────────────────────────────────────────────────────
import { useVocabGeneration } from '@/hooks/useVocabGeneration';
import { Skeleton } from '@/components/home/Skeleton';
import { FloatingOrbs } from '@/components/vocab/FloatingOrbs';
import { WordDetailView } from '@/components/vocab/WordDetailView';
import { AllCaughtUpState } from '@/components/vocab/AllCaughtUpState';

// ── Saved / SRS module imports ─────────────────────────────────────────────────
// The existing SRS session hook is unchanged — it still serves the Saved module
import { useDailyWord, type MasteryResponse } from '@/hooks/use-daily-word';
import { SessionProgress } from '@/components/vocab/SessionProgress';
import { WordCard } from '@/components/vocab/WordCard';
import { ExplanationSection } from '@/components/vocab/ExplanationSection';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

// ── Vault navigation ───────────────────────────────────────────────────────────
import { VaultSegmentedControl, type VaultTab } from '@/components/vocab/VaultSegmentedControl';
import { WordHistoryList } from '@/components/vocab/WordHistoryList';
import { VocabSearchView } from '@/components/vocab/VocabSearchView';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VocabVaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();

  const streakCount = profile?.streak_count ?? 0;
  const lang = profile?.preferred_explanation_language ?? 'en';
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + BottomTabInset + Spacing.two;

  // ── Module navigation ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<VaultTab>('daily');

  const handleTabChange = (tab: VaultTab) => {
    setActiveTab(tab);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />
      <FloatingOrbs />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Vocab Vault</Text>
        </View>
        {streakCount > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakCount}>{streakCount}</Text>
          </View>
        )}
      </View>

      {/* Module segmented control */}
      <VaultSegmentedControl activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Module content */}
      <View style={styles.moduleContainer}>
        {activeTab === 'daily' && (
          <DailyModule
            lang={lang}
            streakCount={streakCount}
            bottomPadding={bottomPadding}
            onGoHome={() => router.replace('/')}
            onStartPractice={() => router.push('/practice')}
          />
        )}
        {activeTab === 'history' && (
          <WordHistoryList lang={lang} bottomPadding={bottomPadding} />
        )}
        {activeTab === 'saved' && (
          <SavedSrsModule lang={lang} bottomPadding={bottomPadding} />
        )}
        {activeTab === 'search' && (
          <VocabSearchView lang={lang} bottomPadding={bottomPadding} />
        )}
      </View>
    </View>
  );
}

// ─── Daily Module ─────────────────────────────────────────────────────────────
// Wired to the generate-vocab-word Edge Function via useVocabGeneration.
// First generateWord() call is automatic on mount. Subsequent calls are
// triggered by the "New Word" button — explicit user intent.

type DailyModuleProps = {
  lang: string;
  streakCount: number;
  bottomPadding: number;
  onGoHome: () => void;
  onStartPractice: () => void;
};

function DailyModule({ lang, streakCount, bottomPadding, onGoHome, onStartPractice }: DailyModuleProps) {
  const {
    status,
    word,
    error,
    isRetryable,
    generateWord,
    wordAudioPlaying,
    onPlayWordAudio,
    exampleAudioPlaying,
    exampleAudioLoading,
    onPlayExampleAudio,
    saveToVault,
    isSaving,
    isSaved,
  } = useVocabGeneration();

  // Auto-generate the first word on mount
  const hasGeneratedRef = React.useRef(false);
  useEffect(() => {
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generateWord();
    }
  }, [generateWord]);

  // Loading skeleton
  if (status === 'loading') {
    return (
      <View style={moduleStyles.loadingContainer}>
        <View style={moduleStyles.skeletonWrap}>
          <Skeleton height={24} width={150} borderRadius={Radius.sm} />
          <Skeleton height={220} borderRadius={Radius.xl} />
          <Skeleton height={140} borderRadius={Radius.lg} />
        </View>
      </View>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <View style={moduleStyles.errorContainer}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
          size={36}
          tintColor={Brand.accentAmber}
        />
        <Text style={moduleStyles.errorTitle}>Couldn't load a word</Text>
        <Text style={moduleStyles.errorMessage}>{error}</Text>
        {isRetryable && (
          <Pressable onPress={() => generateWord()} style={moduleStyles.retryBtn}>
            <Text style={moduleStyles.retryBtnText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // No word yet (shouldn't normally occur after auto-generate)
  if (status === 'idle' || !word) {
    return (
      <View style={moduleStyles.errorContainer}>
        <Pressable onPress={() => generateWord()} style={moduleStyles.retryBtn}>
          <Text style={moduleStyles.retryBtnText}>Generate a Word</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={moduleStyles.scroll}
      contentContainerStyle={[moduleStyles.scrollContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={moduleStyles.dailyInner}>
        {/*
          WordDetailView renders:
            - WordCard with word_audio_url button (handlePlayWordAudio)
            - ExplanationSection with example_audio_url button (handlePlayExampleAudio)
          Both are independently playable. Both URLs come from separate DB columns.
        */}
        <WordDetailView
          word={word}
          lang={lang}
          showResponseButtons={false}
          onSaveToVault={saveToVault}
          isSaved={isSaved}
          isSaving={isSaving}
        />

        {/* "New Word" — explicit user trigger for next word generation */}
        <View style={moduleStyles.newWordRow}>
          <Pressable
            onPress={() => generateWord()}
            style={({ pressed }) => [moduleStyles.newWordBtn, pressed && moduleStyles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Generate a new word"
          >
            <SymbolView
              name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
              size={14}
              tintColor={Brand.primary}
            />
            <Text style={moduleStyles.newWordBtnText}>New Word</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Saved / SRS Module ───────────────────────────────────────────────────────
// This is the ORIGINAL vocab_vault SRS flow — logic completely unchanged.
// It still uses useDailyWord() which fetches from the Express server.

type SavedSrsModuleProps = {
  lang: string;
  bottomPadding: number;
};

function SavedSrsModule({ lang, bottomPadding }: SavedSrsModuleProps) {
  const router = useRouter();
  const { profile } = useUserProfile();
  const streakCount = profile?.streak_count ?? 0;
  const {
    status,
    words,
    currentIndex,
    currentWord,
    totalWords,
    submitResponse,
    resolveWordAudioUrl,
    resolveExampleAudioUrl,
  } = useDailyWord();

  // Audio for Saved module — its own player (independent of Daily module)
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [playingType, setPlayingType] = useState<'word' | 'example' | null>(null);

  const wordAudioPlaying = playerStatus.playing && playingType === 'word';
  const exampleAudioPlaying = playerStatus.playing && playingType === 'example';
  const exampleAudioLoading = playerStatus.isBuffering && playingType === 'example';
  const [coachState, setCoachState] = useState<'explaining' | 'celebrating' | 'resting'>('explaining');

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false }).catch(() => {});
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
    } catch {
      setPlayingType(null);
    }
  };

  const handlePlayWordAudio = async (speed: 'normal' | 'slow' = 'normal') => {
    if (!currentWord) return;
    try {
      const url = await resolveWordAudioUrl(currentWord, speed);
      await playSound(url, 'word');
    } catch {
      setPlayingType(null);
    }
  };

  const handlePlayExampleAudio = async () => {
    if (!currentWord) return;
    try {
      // resolveExampleAudioUrl reads currentWord.exampleAudioUrl (example_audio_url)
      // — independent of word audio URL
      const url = await resolveExampleAudioUrl(currentWord);
      await playSound(url, 'example');
    } catch {
      setPlayingType(null);
    }
  };

  if (status === 'loading') {
    return (
      <View style={moduleStyles.loadingContainer}>
        <View style={moduleStyles.skeletonWrap}>
          <Skeleton height={24} width={150} borderRadius={Radius.sm} />
          <Skeleton height={220} borderRadius={Radius.xl} />
          <Skeleton height={140} borderRadius={Radius.lg} />
        </View>
      </View>
    );
  }

  if (status === 'complete') {
    return (
      <AllCaughtUpState
        streakCount={streakCount}
        wordsCompletedToday={totalWords}
        onGoHome={() => router.replace('/')}
        onStartPractice={() => router.push('/practice')}
      />
    );
  }

  if (!currentWord) return null;

  return (
    <ScrollView
      style={moduleStyles.scroll}
      contentContainerStyle={[moduleStyles.scrollContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={moduleStyles.srsInner}>
        <SessionProgress current={currentIndex + 1} total={totalWords} />

        <WordCard
          key={currentWord.id}
          word={currentWord}
          isPlaying={wordAudioPlaying}
          onPlayAudio={handlePlayWordAudio}
          onSubmit={submitResponse}
          onSetCoachState={setCoachState}
        />

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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    // @ts-ignore — experimental_backgroundImage is supported in Expo SDK 52+
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.primaryDark,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Brand.accentOrangeLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  streakFlame: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.accentOrange,
  },
  moduleContainer: {
    flex: 1,
  },
});

const moduleStyles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  dailyInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    paddingBottom: Spacing.two,
  },
  srsInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.three,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.2)',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  newWordRow: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  newWordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.2)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  newWordBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});
