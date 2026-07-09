import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { apiFetch } from '@/lib/api';

export type DailyChallengeTaskType = 'voice_session' | 'vocab_review' | 'grammar_check';

export type DailyChallengeTask = {
  id: string;
  type: DailyChallengeTaskType;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
  trackMinutes?: boolean;
  masteryOnly?: boolean;
};

export type DailyChallenge = {
  id: string;
  user_id: string;
  challenge_date: string;
  tasks: DailyChallengeTask[];
  xp_reward: number;
  streak_protection: boolean;
  completed: boolean;
};

export function useDailyChallenge() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiFetch<{ ok: boolean; challenge: DailyChallenge }>(
        '/api/v1/daily-challenge/today',
      );
      if (mountedRef.current) {
        setChallenge(payload.challenge);
        setError(null);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load daily challenge.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchChallenge();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchChallenge]);

  useFocusEffect(
    useCallback(() => {
      fetchChallenge();
    }, [fetchChallenge]),
  );

  return { challenge, loading, error, refetch: fetchChallenge };
}
