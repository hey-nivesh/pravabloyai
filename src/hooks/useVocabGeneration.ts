/**
 * useVocabGeneration — Hook for the Daily Vocab AI-generation module.
 *
 * Wraps generateNewWord() with:
 *  - Loading / error state
 *  - AudioPlayer (expo-audio) for word and example audio, independently
 *  - Reuses resolveWordAudioUrl / resolveExampleAudioUrl from use-daily-word.ts
 *    (the same functions already confirmed bug-free on the original screen)
 *  - "Save to Vault" action
 *  - History-aware: words served from the Edge Function are pre-deduplicated
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import {
  generateNewWord,
  saveWordToVault,
  type CorpusState,
  VocabGenError,
} from '@/services/vocabGeneration';
import {
  resolveWordAudioUrl,
  resolveExampleAudioUrl,
  type DailyWord,
} from '@/hooks/use-daily-word';
import { useUserProfile } from '@/hooks/useUserProfile';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VocabGenStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

export type UseVocabGenerationResult = {
  status: VocabGenStatus;
  word: DailyWord | null;
  corpusState: CorpusState | null;
  error: string | null;
  isRetryable: boolean;

  /** Fetch a fresh new word from the Edge Function */
  generateWord: (opts?: { difficultyPreference?: string; topicHint?: string }) => Promise<void>;

  /** Audio: word pronunciation */
  wordAudioPlaying: boolean;
  onPlayWordAudio: (speed?: 'normal' | 'slow') => Promise<void>;

  /** Audio: example sentence — independently playable button */
  exampleAudioPlaying: boolean;
  exampleAudioLoading: boolean;
  onPlayExampleAudio: () => Promise<void>;

  /** Save the current word to the user's Vocab Vault (SRS) */
  saveToVault: () => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVocabGeneration(): UseVocabGenerationResult {
  const { profile } = useUserProfile();
  const lang = profile?.preferred_explanation_language ?? 'en';

  const [status, setStatus] = useState<VocabGenStatus>('idle');
  const [word, setWord] = useState<DailyWord | null>(null);
  const [corpusState, setCorpusState] = useState<CorpusState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Audio player — single instance shared by word and example (sequential only)
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [playingType, setPlayingType] = useState<'word' | 'example' | null>(null);

  const wordAudioPlaying = playerStatus.playing && playingType === 'word';
  const exampleAudioPlaying = playerStatus.playing && playingType === 'example';
  const exampleAudioLoading = playerStatus.isBuffering && playingType === 'example';

  // Prevent double-fetch on Strict Mode double-effect
  const fetchingRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  // Reset playback when word changes
  useEffect(() => {
    player.pause();
    setPlayingType(null);
    setIsSaved(false);
  }, [word?.id]);

  // ── Generate word ────────────────────────────────────────────────────────────

  const generateWord = useCallback(
    async (opts?: { difficultyPreference?: string; topicHint?: string }) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      setStatus('loading');
      setError(null);

      try {
        const result = await generateNewWord(opts);
        setWord(result.word);
        setCorpusState(result.corpusState);
        setStatus('ready');
      } catch (err: unknown) {
        const message =
          err instanceof VocabGenError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to generate word. Please try again.';
        setError(message);
        setIsRetryable(err instanceof VocabGenError ? err.retryable : true);
        setStatus('error');
      } finally {
        fetchingRef.current = false;
      }
    },
    [],
  );

  // ── Audio: shared playback helper ────────────────────────────────────────────

  const playAudio = useCallback(
    async (uri: string, type: 'word' | 'example') => {
      try {
        setPlayingType(type);
        player.replace({ uri });
        player.play();
      } catch {
        setPlayingType(null);
      }
    },
    [player],
  );

  // ── Audio: word pronunciation ────────────────────────────────────────────────

  const onPlayWordAudio = useCallback(
    async (speed: 'normal' | 'slow' = 'normal') => {
      if (!word) return;
      try {
        const url = await resolveWordAudioUrl(word, speed, lang);
        await playAudio(url, 'word');
      } catch {
        setPlayingType(null);
      }
    },
    [word, lang, playAudio],
  );

  // ── Audio: example sentence — independent button, independent URL ────────────

  const onPlayExampleAudio = useCallback(async () => {
    if (!word) return;
    try {
      // resolveExampleAudioUrl reads word.exampleAudioUrl — NEVER word.audioUrl
      const url = await resolveExampleAudioUrl(word, lang);
      await playAudio(url, 'example');
    } catch {
      setPlayingType(null);
    }
  }, [word, lang, playAudio]);

  // ── Save to vault ────────────────────────────────────────────────────────────

  const saveToVault = useCallback(async () => {
    if (!word || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      await saveWordToVault(word.id);
      setIsSaved(true);
    } catch {
      // Non-fatal — let UI surface the error if needed
    } finally {
      setIsSaving(false);
    }
  }, [word, isSaving, isSaved]);

  return {
    status,
    word,
    corpusState,
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
  };
}
