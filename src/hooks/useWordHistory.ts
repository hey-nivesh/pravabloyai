/**
 * useWordHistory — Paginated hook for the Word History module.
 *
 * Fetches the user's full user_word_history joined with enrichment data.
 * Each item has both word_audio_url and example_audio_url independently
 * accessible (mapped to audioUrl and exampleAudioUrl on the DailyWord shape).
 */

import { useState, useCallback } from 'react';

import { getWordHistory, revisitWord, type WordHistoryItem } from '@/services/vocabGeneration';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WordHistoryStatus = 'idle' | 'loading' | 'ready' | 'error' | 'loading_more';

export type UseWordHistoryResult = {
  status: WordHistoryStatus;
  items: WordHistoryItem[];
  hasMore: boolean;
  error: string | null;
  /** Initial fetch / refresh */
  loadHistory: () => Promise<void>;
  /** Append next page */
  loadMore: () => Promise<void>;
  /** Mark a word as revisited (increments counter, updates last_viewed_at) */
  markRevisited: (wordId: string) => Promise<void>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWordHistory(): UseWordHistoryResult {
  const [status, setStatus] = useState<WordHistoryStatus>('idle');
  const [items, setItems] = useState<WordHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const result = await getWordHistory(0);
      setItems(result.items);
      setCurrentPage(0);
      setHasMore(result.hasMore);
      setStatus('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load word history.';
      setError(message);
      setStatus('error');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || status === 'loading_more') return;
    setStatus('loading_more');

    try {
      const nextPage = currentPage + 1;
      const result = await getWordHistory(nextPage);
      setItems((prev) => [...prev, ...result.items]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
      setStatus('ready');
    } catch {
      setStatus('ready'); // Don't block the existing list on a paginate error
    }
  }, [hasMore, status, currentPage]);

  const markRevisited = useCallback(async (wordId: string) => {
    // Optimistically update last_viewed_at in local state
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) =>
        item.id === wordId
          ? { ...item, timesRevisited: item.timesRevisited + 1, lastViewedAt: now }
          : item,
      ),
    );

    // Fire-and-forget to backend — non-critical
    revisitWord(wordId).catch(() => {});
  }, []);

  return {
    status,
    items,
    hasMore,
    error,
    loadHistory,
    loadMore,
    markRevisited,
  };
}
