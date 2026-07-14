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
 * Backend contract:
 *   GET  /api/v1/vocab-vault/session?limit=N&lang=LANG
 *        → { words: DailyWord[] } (includes audioUrl, slowAudioUrl, exampleAudioUrl)
 *   POST /api/v1/vocab-vault/:id/review
 *        Body: { response: 'got_it' | 'still_learning', userId: string }
 *        → { next_review_at: string, srs_interval_days: number }
 *   GET  /api/v1/vocab-vault/pronunciation?wordId=WORD_ID&speed=normal|slow
 *        → { audioUrl: string } (on-demand fallback when session URLs are missing)
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

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://pravabloy-ai-backend.onrender.com';
const CACHE_KEY_PREFIX = 'daily_word_session_v2';

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
  /** Pre-synthesized pronunciation (normal speed) from session API */
  audioUrl?: string;
  /** Pre-synthesized pronunciation (slow speed) from session API */
  slowAudioUrl?: string;
  /** Pre-synthesized example sentence audio from session API */
  exampleAudioUrl?: string;
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
  /** Resolve a direct MP3 URL for word pronunciation (session URL or on-demand API) */
  resolveWordAudioUrl: (
    word: DailyWord,
    speed?: 'normal' | 'slow',
  ) => Promise<string>;
  /** Resolve a direct MP3 URL for the example sentence (session URL or on-demand API) */
  resolveExampleAudioUrl: (word: DailyWord) => Promise<string>;
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

function youdaoWordUrl(text: string): string {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`;
}

function normalizeSessionWord(raw: Record<string, unknown>): DailyWord {
  const partOfSpeech =
    (raw.partOfSpeech as PartOfSpeech | undefined) ??
    (raw.part_of_speech as PartOfSpeech | undefined) ??
    'noun';

  return {
    id: String(raw.id ?? ''),
    word: String(raw.word ?? ''),
    phonetic: String(raw.phonetic ?? ''),
    partOfSpeech,
    definition: String(raw.definition ?? ''),
    exampleSentence: String(
      raw.exampleSentence ?? raw.example_sentence ?? '',
    ),
    usageTip: String(raw.usageTip ?? raw.usage_tip ?? ''),
    source: (raw.source as DailyWord['source']) ?? 'curated',
    audioUrl:
      (raw.audioUrl as string | undefined) ??
      (raw.word_audio_url as string | undefined),
    slowAudioUrl:
      (raw.slowAudioUrl as string | undefined) ??
      (raw.slow_word_audio_url as string | undefined),
    exampleAudioUrl:
      (raw.exampleAudioUrl as string | undefined) ??
      (raw.example_audio_url as string | undefined),
    srsIntervalDays: Number(raw.srsIntervalDays ?? raw.srs_interval_days ?? 1),
    srsEaseFactor: Number(raw.srsEaseFactor ?? raw.srs_ease_factor ?? 2.5),
  };
}

async function fetchPronunciationAudioUrl(params: {
  wordId?: string;
  text?: string;
  speed?: 'normal' | 'slow';
  type?: 'word' | 'example';
  lang?: string;
}): Promise<string> {
  const query = new URLSearchParams();
  if (params.wordId) query.set('wordId', params.wordId);
  if (params.text) query.set('text', params.text);
  if (params.speed) query.set('speed', params.speed);
  if (params.type) query.set('type', params.type);
  if (params.lang) query.set('lang', params.lang);
  query.set('format', 'json');

  const res = await fetch(
    `${API_BASE}/api/v1/vocab-vault/pronunciation?${query.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Pronunciation fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { audioUrl?: string };
  if (!json.audioUrl) {
    throw new Error('Pronunciation response missing audioUrl');
  }
  return json.audioUrl;
}

export async function resolveWordAudioUrl(
  word: DailyWord,
  speed: 'normal' | 'slow' = 'normal',
  lang = 'en',
): Promise<string> {
  const sessionUrl = speed === 'slow' ? word.slowAudioUrl : word.audioUrl;
  if (sessionUrl) return sessionUrl;

  if (word.id.startsWith('mock-')) {
    return youdaoWordUrl(word.word);
  }

  // Prefer text-based lookup — works for AI-generated words that may not be
  // indexed by the Express server's DB pronunciation endpoint yet.
  if (word.word) {
    try {
      return await fetchPronunciationAudioUrl({ text: word.word, type: 'word', speed, lang });
    } catch {
      // Fall through to wordId-based lookup as last resort
    }
  }

  return fetchPronunciationAudioUrl({ wordId: word.id, speed, lang });
}

export async function resolveExampleAudioUrl(
  word: DailyWord,
  lang = 'en',
): Promise<string> {
  if (word.exampleAudioUrl) return word.exampleAudioUrl;

  // Prefer text-based TTS — works for AI-generated words regardless of DB state.
  // The Express server's /pronunciation endpoint accepts a raw 'text' param.
  if (word.exampleSentence) {
    try {
      return await fetchPronunciationAudioUrl({
        text: word.exampleSentence,
        type: 'example',
        lang,
      });
    } catch {
      // Fall through to wordId-based lookup
    }
  }

  if (word.id.startsWith('mock-')) {
    return youdaoWordUrl(word.word);
  }

  return fetchPronunciationAudioUrl({ wordId: word.id, type: 'example', lang });
}

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
  const json = (await res.json()) as { words: Record<string, unknown>[] };
  return json.words.map(normalizeSessionWord);
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
            words: Record<string, unknown>[];
            currentIndex: number;
          };
          if (!cancelled && parsed.words.length > 0) {
            const normalizedWords = parsed.words.map(normalizeSessionWord);
            setWords(normalizedWords);
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

  // ─── Audio URL resolvers ────────────────────────────────────────────────────

  const resolveWordAudioUrlForWord = useCallback(
    (word: DailyWord, speed: 'normal' | 'slow' = 'normal') =>
      resolveWordAudioUrl(word, speed, lang),
    [lang],
  );

  const resolveExampleAudioUrlForWord = useCallback(
    (word: DailyWord) => resolveExampleAudioUrl(word, lang),
    [lang],
  );

  return {
    status,
    words,
    currentIndex,
    currentWord: words[currentIndex] ?? null,
    totalWords: words.length,
    submitResponse,
    resolveWordAudioUrl: resolveWordAudioUrlForWord,
    resolveExampleAudioUrl: resolveExampleAudioUrlForWord,
    error,
  };
}
