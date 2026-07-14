/**
 * vocabGeneration.ts — Client service for the generate-vocab-word Edge Function.
 *
 * All calls go through `supabase.functions.invoke()` which automatically
 * forwards the current user's session JWT — no manual auth headers needed.
 * This is identical in pattern to src/services/analysis.ts (analyze-session).
 *
 * GEMINI_API_KEY never appears here — it lives only in the Edge Function secret.
 */

import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { DailyWord, PartOfSpeech } from '@/hooks/use-daily-word';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VocabGenErrorCode =
  | 'unauthorized'
  | 'bad_request'
  | 'gemini_rate_limit'
  | 'gemini_auth'
  | 'gemini_timeout'
  | 'gemini_error'
  | 'tts_error'
  | 'internal'
  | 'network'
  | 'timeout'
  | 'unknown';

export type CorpusState =
  | 'pre_enriched'          // Served from existing enriched corpus — no Gemini cost
  | 'fresh_generated'       // Gemini generated a new word, added to corpus
  | 'corpus_exhausted_fresh'; // All corpus words seen; Gemini generated fresh content

export type GenerateWordResult = {
  word: DailyWord;
  corpusState: CorpusState;
};

export type WordHistoryItem = DailyWord & {
  historyId: string;
  firstShownAt: string;
  timesRevisited: number;
  lastViewedAt: string;
  isSavedToVault: boolean;
};

export type WordHistoryPage = {
  items: WordHistoryItem[];
  page: number;
  hasMore: boolean;
};

export class VocabGenError extends Error {
  code: VocabGenErrorCode;
  retryable: boolean;
  status?: number;

  constructor(
    message: string,
    code: VocabGenErrorCode,
    retryable = false,
    status?: number,
  ) {
    super(message);
    this.name = 'VocabGenError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

// ─── Error parsing (mirrors analysis.ts parseFunctionError) ──────────────────

async function parseFunctionError(error: unknown): Promise<VocabGenError> {
  if (error instanceof FunctionsFetchError) {
    return new VocabGenError(
      'Network error while contacting vocab generation service.',
      'network',
      true,
    );
  }
  if (error instanceof FunctionsRelayError) {
    return new VocabGenError(
      error.message || 'Vocab generation relay failed.',
      'unknown',
      true,
    );
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      const code = (body?.code as VocabGenErrorCode) ?? 'unknown';
      return new VocabGenError(
        body?.error ?? error.message ?? 'Vocab generation request failed.',
        code,
        Boolean(body?.retryable),
        error.context.status,
      );
    } catch {
      return new VocabGenError(
        error.message || 'Vocab generation request failed.',
        'unknown',
        error.context.status >= 500,
        error.context.status,
      );
    }
  }
  return new VocabGenError(
    error instanceof Error ? error.message : 'Unexpected error.',
    'unknown',
    true,
  );
}

// ─── Raw word normalizer — maps Edge Function response → DailyWord ────────────

function normalizeRawWord(raw: Record<string, unknown>): DailyWord {
  const partOfSpeech =
    (raw.part_of_speech as PartOfSpeech | undefined) ??
    (raw.partOfSpeech as PartOfSpeech | undefined) ??
    'noun';

  return {
    id: String(raw.word_id ?? raw.id ?? ''),
    word: String(raw.word ?? ''),
    phonetic: String(raw.phonetic ?? ''),
    partOfSpeech,
    definition: String(raw.definition ?? ''),
    exampleSentence: String(raw.example_sentence ?? raw.exampleSentence ?? ''),
    usageTip: String(raw.usage_tip ?? raw.usageTip ?? ''),
    source: 'curated',
    // word_audio_url and example_audio_url are stored separately — never mixed up
    audioUrl: (raw.word_audio_url as string | undefined) ?? undefined,
    slowAudioUrl: (raw.slow_word_audio_url as string | undefined) ?? undefined,
    exampleAudioUrl: (raw.example_audio_url as string | undefined) ?? undefined,
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
  };
}

function normalizeHistoryItem(raw: Record<string, unknown>): WordHistoryItem {
  return {
    ...normalizeRawWord(raw),
    historyId: String(raw.id ?? ''),
    firstShownAt: String(raw.first_shown_at ?? ''),
    timesRevisited: Number(raw.times_revisited ?? 0),
    lastViewedAt: String(raw.last_viewed_at ?? ''),
    isSavedToVault: Boolean(raw.is_saved_to_vault ?? false),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calls the generate-vocab-word Edge Function to get a new word for this user.
 * The Edge Function ensures no word is ever repeated and prefers the pre-enriched
 * corpus over Gemini generation (cost mitigation).
 */
export async function generateNewWord(opts?: {
  difficultyPreference?: string;
  topicHint?: string;
}): Promise<GenerateWordResult> {
  const { data, error } = await supabase.functions.invoke('generate-vocab-word', {
    body: {
      action: 'generate',
      difficultyPreference: opts?.difficultyPreference,
      topicHint: opts?.topicHint,
    },
  });

  if (error) {
    throw await parseFunctionError(error);
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    code?: VocabGenErrorCode;
    word?: Record<string, unknown>;
    corpus_state?: CorpusState;
  };

  if (!payload?.ok || !payload.word) {
    throw new VocabGenError(
      payload?.error ?? 'Word generation failed.',
      payload?.code ?? 'unknown',
      false,
    );
  }

  return {
    word: normalizeRawWord(payload.word),
    corpusState: payload.corpus_state ?? 'pre_enriched',
  };
}

/**
 * Fetches the user's paginated word history, joined with enrichment data.
 * Each item has both word_audio_url and example_audio_url independently accessible.
 */
export async function getWordHistory(page = 0): Promise<WordHistoryPage> {
  const { data, error } = await supabase.functions.invoke('generate-vocab-word', {
    body: { action: 'history', page },
  });

  if (error) {
    throw await parseFunctionError(error);
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    code?: VocabGenErrorCode;
    items?: Record<string, unknown>[];
    page?: number;
    hasMore?: boolean;
  };

  if (!payload?.ok) {
    throw new VocabGenError(
      payload?.error ?? 'Failed to fetch word history.',
      payload?.code ?? 'unknown',
      false,
    );
  }

  return {
    items: (payload.items ?? []).map(normalizeHistoryItem),
    page: payload.page ?? page,
    hasMore: Boolean(payload.hasMore),
  };
}

/**
 * Marks a history word as revisited (increments times_revisited, updates
 * last_viewed_at). Does NOT count as a new word shown today.
 */
export async function revisitWord(wordId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-vocab-word', {
    body: { action: 'revisit', wordId },
  });

  if (error) {
    // Non-fatal — swallow silently in production
    if (__DEV__) {
      console.warn('[vocabGeneration] revisitWord failed:', error);
    }
    return;
  }

  const payload = data as { ok?: boolean };
  if (!payload?.ok && __DEV__) {
    console.warn('[vocabGeneration] revisitWord: non-ok response');
  }
}

/**
 * Saves a word to the user's Vocab Vault for SRS review.
 * Also sets is_saved_to_vault = true on user_word_history.
 */
export async function saveWordToVault(wordId: string): Promise<{ vaultSaved: boolean }> {
  const { data, error } = await supabase.functions.invoke('generate-vocab-word', {
    body: { action: 'save_to_vault', wordId },
  });

  if (error) {
    throw await parseFunctionError(error);
  }

  const payload = data as { ok?: boolean; vault_saved?: boolean; error?: string; code?: VocabGenErrorCode };

  if (!payload?.ok) {
    throw new VocabGenError(
      payload?.error ?? 'Failed to save word to vault.',
      payload?.code ?? 'unknown',
      false,
    );
  }

  return { vaultSaved: Boolean(payload.vault_saved) };
}
