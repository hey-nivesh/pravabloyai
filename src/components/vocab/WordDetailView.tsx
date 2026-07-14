/**
 * WordDetailView — Shared full-word detail card used by ALL three screens:
 *   Daily Vocab, Word History, and Search.
 *
 * This is THE single source of truth for:
 *  - Word audio playback (word_audio_url → resolveWordAudioUrl)
 *  - Example audio playback (example_audio_url → resolveExampleAudioUrl)
 *
 * Having one component for all screens prevents the audio-URL-mixing bug
 * from ever being reintroduced on a new screen. Both audio buttons are always
 * present and independently playable.
 *
 * Props:
 *  word              — DailyWord (contains audioUrl and exampleAudioUrl separately)
 *  onSaveToVault     — optional; shows "Save to Vault" button when provided
 *  isSaved           — true when word is already in vocab_vault
 *  isSaving          — loading state for the save action
 *  showResponseButtons — false for History/Search (no SRS got_it / still_learning)
 *  onSubmit          — SRS response callback (Daily only)
 *  lang              — user's preferred_explanation_language
 *
 * Audio is handled with its own AudioPlayer instance (not shared with parent),
 * so multiple WordDetailView instances don't interfere with each other.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { resolveWordAudioUrl, resolveExampleAudioUrl, type DailyWord, type MasteryResponse } from '@/hooks/use-daily-word';
import { WordCard } from '@/components/vocab/WordCard';
import { ExplanationSection } from '@/components/vocab/ExplanationSection';

// ─── Types ────────────────────────────────────────────────────────────────────

type WordDetailViewProps = {
  word: DailyWord;
  lang?: string;
  showResponseButtons?: boolean;
  onSubmit?: (response: MasteryResponse) => void;
  onSaveToVault?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WordDetailView({
  word,
  lang = 'en',
  showResponseButtons = false,
  onSubmit,
  onSaveToVault,
  isSaved = false,
  isSaving = false,
}: WordDetailViewProps) {
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [playingType, setPlayingType] = useState<'word' | 'example' | null>(null);
  const [coachState, setCoachState] = useState<'explaining' | 'celebrating' | 'resting'>('explaining');

  // Derived audio states
  const wordAudioPlaying = playerStatus.playing && playingType === 'word';
  const exampleAudioPlaying = playerStatus.playing && playingType === 'example';
  const exampleAudioLoading = playerStatus.isBuffering && playingType === 'example';

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  // Reset audio when word changes (e.g., navigating between history items)
  useEffect(() => {
    player.pause();
    setPlayingType(null);
    setCoachState('explaining');
  }, [word.id]);

  // ── Internal audio player ─────────────────────────────────────────────────

  const playAudio = async (uri: string, type: 'word' | 'example') => {
    try {
      setPlayingType(type);
      player.replace({ uri });
      player.play();
    } catch {
      setPlayingType(null);
    }
  };

  // ── Word audio handler — reads word.audioUrl (word_audio_url) ────────────────

  const handlePlayWordAudio = async (speed: 'normal' | 'slow' = 'normal') => {
    try {
      const url = await resolveWordAudioUrl(word, speed, lang);
      await playAudio(url, 'word');
    } catch {
      setPlayingType(null);
    }
  };

  // ── Example audio handler — reads word.exampleAudioUrl (example_audio_url) ──
  // IMPORTANT: This reads a DIFFERENT field than handlePlayWordAudio.
  // resolveExampleAudioUrl reads word.exampleAudioUrl — never word.audioUrl.

  const handlePlayExampleAudio = async () => {
    try {
      const url = await resolveExampleAudioUrl(word, lang);
      await playAudio(url, 'example');
    } catch {
      setPlayingType(null);
    }
  };

  // ── Handle submit (SRS only on Daily screen) ──────────────────────────────

  const handleSubmit = (response: MasteryResponse) => {
    onSubmit?.(response);
  };

  return (
    <View style={styles.container}>
      {/* Word card with pronunciation audio controls */}
      <WordCard
        key={word.id}
        word={word}
        isPlaying={wordAudioPlaying}
        onPlayAudio={handlePlayWordAudio}
        onSubmit={showResponseButtons ? handleSubmit : () => {}}
        onSetCoachState={setCoachState}
      />

      {/* Explanation section with example sentence audio — independently playable */}
      <ExplanationSection
        definition={word.definition}
        exampleSentence={word.exampleSentence}
        usageTip={word.usageTip}
        exampleAudioPlaying={exampleAudioPlaying}
        exampleAudioLoading={exampleAudioLoading}
        onPlayExampleAudio={handlePlayExampleAudio}
      />

      {/* Save to Vault action — shown on History and Search screens */}
      {onSaveToVault && (
        <View style={styles.saveContainer}>
          <Pressable
            onPress={isSaved ? undefined : onSaveToVault}
            style={({ pressed }) => [
              styles.saveBtn,
              isSaved && styles.saveBtnSaved,
              pressed && !isSaved && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Word saved to Vault' : 'Save this word to Vocab Vault'}
            disabled={isSaved || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Brand.primary} />
            ) : (
              <SymbolView
                name={
                  isSaved
                    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'plus.circle', android: 'add_circle_outline', web: 'add_circle_outline' }
                }
                size={16}
                tintColor={isSaved ? Brand.accentGreen : Brand.primary}
              />
            )}
            <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextSaved]}>
              {isSaved ? 'Saved to Vault' : 'Save to Vault'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  saveContainer: {
    paddingHorizontal: Spacing.three,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.2)',
  },
  saveBtnSaved: {
    backgroundColor: Brand.accentGreenLight,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  saveBtnTextSaved: {
    color: Brand.accentGreen,
  },
  pressed: {
    opacity: 0.75,
  },
});
