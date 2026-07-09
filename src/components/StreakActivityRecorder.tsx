import { useEffect, useRef } from 'react';
import { useSegments } from 'expo-router';

import { recordStreakActivity } from '@/services/streakActivity';

const LEARNING_SEGMENTS = new Set([
  'vocab',
  'practice',
  'progress',
  'analytics',
  'history',
  'session',
]);

/**
 * Silently records streak activity when the user opens a learning tool screen.
 * Mount once inside the authenticated drawer layout.
 */
export function StreakActivityRecorder() {
  const segments = useSegments();
  const lastRecordedKey = useRef<string | null>(null);

  useEffect(() => {
    const isLearningScreen = segments.some((segment) => LEARNING_SEGMENTS.has(segment));
    if (!isLearningScreen) return;

    const routeKey = segments.join('/');
    if (lastRecordedKey.current === routeKey) return;
    lastRecordedKey.current = routeKey;

    recordStreakActivity().catch(() => {});
  }, [segments]);

  return null;
}
