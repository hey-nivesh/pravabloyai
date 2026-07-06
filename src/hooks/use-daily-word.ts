/**
 * use-daily-word — Core data hook for the Vocab Vault Daily Word screen.
 *
 * Responsibilities:
 *  1. Fetch today's word session from the backend (SRS due words first, curated fallback)
 *  2. Cache the session in AsyncStorage keyed by userId + date (survives re-opens mid-session)
 *  3. Expose current word, session progress, and submitResponse()
 *  4. Persist mastery responses immediately per word (not batched)
 *  5. Calculate SRS intervals locally (SM-2 algorithm) and sync to backend
 *
 * Backend contract (assumed — not yet confirmed):
 *   GET  /api/v1/vocab-vault/session?limit=N&lang=LANG
 *        → { words: DailyWord[] }
 *   POST /api/v1/vocab-vault/:id/review
 *        Body: { response: 'got_it' | 'still_learning', userId: string }
 *        → { next_review_at: string, srs_interval_days: number }
 *   GET  /api/v1/vocab-vault/pronunciation?wordId=WORD_ID&speed=normal|slow
 *        → { audioUrl: string }
 *
 * If the network request fails or the endpoint is unavailable, the hook falls
 * back to CURATED_MOCK_WORDS so the screen always has something to show in dev.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/context/auth-context';
import { useUserProfile } from '@/hooks/useUserProfile';

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many words to show per daily session. Tune this without a code change. */
export const DAILY_SESSION_SIZE = 5;

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.pravabloy.ai';
const CACHE_KEY_PREFIX = 'daily_word_session_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'phrase';

export type DailyWord = {
  /** Unique identifier — either a vocab_vault row id (uuid) or a curated word slug */
  id: string;
  word: string;
  /** IPA phonetic notation, e.g. "/ɪˈloʊkwənt/" */
  phonetic: string;
  partOfSpeech: PartOfSpeech;
  /** Definition rendered in the user's preferred_explanation_language */
  definition: string;
  /** Example sentence using the word in natural context */
  exampleSentence: string;
  /** Short usage tip or nuance note */
  usageTip: string;
  /** Source: 'curated' = fresh word, 'vault' = from user's vocab_vault (SRS due) */
  source: 'curated' | 'vault';
  /** Current SRS interval in days before this word was reviewed */
  srsIntervalDays: number;
  /** SM-2 ease factor */
  srsEaseFactor: number;
};

export type MasteryResponse = 'got_it' | 'still_learning';

export type SessionStatus =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'complete'
  | 'error';

export type UseDailyWordResult = {
  status: SessionStatus;
  words: DailyWord[];
  currentIndex: number;
  currentWord: DailyWord | null;
  /** Total words in today's session */
  totalWords: number;
  /** Submit a mastery response for the current word and advance to the next */
  submitResponse: (response: MasteryResponse) => Promise<void>;
  /** Build the TTS audio URL for a word (pronunciation) */
  getPronunciationUrl: (wordId: string, speed?: 'normal' | 'slow') => string;
  /** Build the TTS audio URL for an example sentence */
  getExampleAudioUrl: (wordId: string) => string;
  error: string | null;
};

// ─── SM-2 SRS Algorithm ────────────────────────────────────────────────────────

/**
 * Simplified SM-2: calculates new interval and ease factor after a review.
 * q=5 → perfect recall, q=1 → blackout. We map our two-button UI:
 *   got_it       → q = 4 (good recall, maybe some hesitation)
 *   still_learning → q = 1 (incorrect / forgotten)
 */
function sm2Update(
  intervalDays: number,
  easeFactor: number,
  response: MasteryResponse,
): { newInterval: number; newEaseFactor: number } {
  const q = response === 'got_it' ? 4 : 1;

  // Ease factor update: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  let newInterval: number;
  if (q < 3) {
    // Incorrect — reset to 1 day
    newInterval = 1;
  } else if (intervalDays <= 1) {
    newInterval = 1;
  } else if (intervalDays === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalDays * newEaseFactor);
  }

  return { newInterval, newEaseFactor };
}

// ─── Cache key helper ─────────────────────────────────────────────────────────

function cacheKey(userId: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${CACHE_KEY_PREFIX}_${userId}_${today}`;
}

// ─── Curated mock words (offline/dev fallback) ────────────────────────────────

const CURATED_MOCK_WORDS: DailyWord[] = [
  {
    id: 'mock-eloquent',
    word: 'Eloquent',
    phonetic: '/ˈɛl.ə.kwənt/',
    partOfSpeech: 'adjective',
    definition: 'Fluent and persuasive in speaking or writing; expressing ideas in a clear, powerful way.',
    exampleSentence: 'The CEO delivered an eloquent speech that moved the entire audience to applause.',
    usageTip: 'More common in formal contexts — use "articulate" for everyday speech.',
    source: 'curated',
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  },
  {
    id: 'mock-candid',
    word: 'Candid',
    phonetic: '/ˈkæn.dɪd/',
    partOfSpeech: 'adjective',
    definition: 'Truthful and straightforward; frank in expressing opinions without holding back.',
    exampleSentence: 'She gave a candid assessment of the project\'s weaknesses in the meeting.',
    usageTip: '"Candid" has a warm, honest tone — unlike "blunt" which can feel harsh.',
    source: 'curated',
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  },
  {
    id: 'mock-nuance',
    word: 'Nuance',
    phonetic: '/ˈnjuː.ɑːns/',
    partOfSpeech: 'noun',
    definition: 'A subtle distinction or shade of meaning, expression, or sound.',
    exampleSentence: 'A skilled negotiator understands the nuance of every word in a contract.',
    usageTip: 'Often used in professional contexts: "There\'s a nuance here" signals depth of understanding.',
    source: 'curated',
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  },
  {
    id: 'mock-pragmatic',
    word: 'Pragmatic',
    phonetic: '/præɡˈmæt.ɪk/',
    partOfSpeech: 'adjective',
    definition: 'Dealing with things sensibly and realistically based on practical considerations rather than theory.',
    exampleSentence: 'We need a pragmatic solution that works within our budget and timeline.',
    usageTip: 'A compliment in business — calling someone "pragmatic" means they get things done.',
    source: 'curated',
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  },
  {
    id: 'mock-concise',
    word: 'Concise',
    phonetic: '/kənˈsaɪs/',
    partOfSpeech: 'adjective',
    definition: 'Giving a lot of information clearly and in few words; brief but comprehensive.',
    exampleSentence: 'Keep your executive summary concise — one page maximum.',
    usageTip: '"Concise" is always a positive quality in professional writing, unlike "short" which can feel dismissive.',
    source: 'curated',
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSessionFromAPI(
  userId: string,
  lang: string,
  limit: number,
): Promise<DailyWord[]> {
  const url = `${API_BASE}/api/v1/vocab-vault/session?limit=${limit}&lang=${encodeURIComponent(lang)}&userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Session fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { words: DailyWord[] };
  return json.words;
}

async function postReview(
  wordId: string,
  response: MasteryResponse,
  userId: string,
  newInterval: number,
  newEaseFactor: number,
): Promise<void> {
  const url = `${API_BASE}/api/v1/vocab-vault/${encodeURIComponent(wordId)}/review`;
  // Fire-and-forget — we don't block the UI on the backend sync
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response,
      userId,
      srs_interval_days: newInterval,
      srs_ease_factor: newEaseFactor,
      next_review_at: new Date(
        Date.now() + newInterval * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }),
  }).catch((err) => {
    if (__DEV__) {
      console.warn('[use-daily-word] review POST failed:', err);
    }
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailyWord(): UseDailyWordResult {
  const { session } = useAuth();
  const { profile } = useUserProfile();
  const userId = session?.user?.id ?? null;
  const lang = profile?.preferred_explanation_language ?? 'en';

  const [words, setWords] = useState<DailyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Track whether we've already loaded from cache/network this mount
  const loadedRef = useRef(false);

  // ─── Load session ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;

    let cancelled = false;

    async function loadSession() {
      setStatus('loading');

      // 1. Try AsyncStorage cache first
      const key = cacheKey(userId!);
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached) as {
            words: DailyWord[];
            currentIndex: number;
          };
          if (!cancelled && parsed.words.length > 0) {
            setWords(parsed.words);
            setCurrentIndex(parsed.currentIndex ?? 0);
            setStatus(
              parsed.currentIndex >= parsed.words.length ? 'complete' : 'ready',
            );
            return;
          }
        }
      } catch {
        // Cache miss — proceed to network fetch
      }

      // 2. Try network
      try {
        const fetched = await fetchSessionFromAPI(
          userId!,
          lang,
          DAILY_SESSION_SIZE,
        );
        if (!cancelled) {
          const sessionWords =
            fetched.length > 0 ? fetched : CURATED_MOCK_WORDS;
          setWords(sessionWords);
          setCurrentIndex(0);
          setStatus('ready');
          await AsyncStorage.setItem(
            key,
            JSON.stringify({ words: sessionWords, currentIndex: 0 }),
          );
        }
      } catch {
        // 3. Fallback to mock
        if (!cancelled) {
          if (__DEV__) {
            console.warn('[use-daily-word] Using mock fallback words (API unavailable)');
          }
          setWords(CURATED_MOCK_WORDS);
          setCurrentIndex(0);
          setStatus('ready');
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [userId, lang]);

  // ─── Submit response ────────────────────────────────────────────────────────

  const submitResponse = useCallback(
    async (response: MasteryResponse) => {
      if (!words[currentIndex] || status === 'submitting') return;

      setStatus('submitting');
      const word = words[currentIndex];

      // Calculate new SRS values
      const { newInterval, newEaseFactor } = sm2Update(
        word.srsIntervalDays,
        word.srsEaseFactor,
        response,
      );

      // Immediately update local word state with new SRS values
      const updatedWords = words.map((w, i) =>
        i === currentIndex
          ? { ...w, srsIntervalDays: newInterval, srsEaseFactor: newEaseFactor }
          : w,
      );

      const nextIndex = currentIndex + 1;
      const isComplete = nextIndex >= updatedWords.length;

      setWords(updatedWords);
      setCurrentIndex(nextIndex);
      setStatus(isComplete ? 'complete' : 'ready');

      // Persist progress to cache immediately
      if (userId) {
        const key = cacheKey(userId);
        AsyncStorage.setItem(
          key,
          JSON.stringify({ words: updatedWords, currentIndex: nextIndex }),
        ).catch(() => {});

        // Fire-and-forget to backend
        postReview(word.id, response, userId, newInterval, newEaseFactor);
      }
    },
    [words, currentIndex, status, userId],
  );

  // ─── Audio URL helpers ──────────────────────────────────────────────────────

  const getPronunciationUrl = useCallback(
    (wordId: string, speed: 'normal' | 'slow' = 'normal'): string => {
      return `${API_BASE}/api/v1/vocab-vault/pronunciation?wordId=${encodeURIComponent(wordId)}&speed=${speed}`;
    },
    [],
  );

  const getExampleAudioUrl = useCallback((wordId: string): string => {
    return `${API_BASE}/api/v1/vocab-vault/pronunciation?wordId=${encodeURIComponent(wordId)}&type=example`;
  }, []);

  return {
    status,
    words,
    currentIndex,
    currentWord: words[currentIndex] ?? null,
    totalWords: words.length,
    submitResponse,
    getPronunciationUrl,
    getExampleAudioUrl,
    error,
  };
}
