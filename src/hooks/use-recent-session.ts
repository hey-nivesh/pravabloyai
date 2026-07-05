import { useState, useEffect } from 'react';

export type VoiceSession = {
  id: string;
  modeName: string;
  category: 'casual' | 'executive' | 'interview';
  completedAt: string; // ISO date string
  durationSeconds: number;
  analyticsReportId: string;
};

type UseRecentSessionResult =
  | { status: 'loading'; session: null }
  | { status: 'ready'; session: VoiceSession | null };

/**
 * Minimal typed stub that resolves the most recent VoiceSession.
 * Wire this to a real Supabase query when the sessions table is set up:
 *   const { data } = await supabase
 *     .from('voice_sessions')
 *     .select('*')
 *     .order('completed_at', { ascending: false })
 *     .limit(1)
 *     .single();
 */
export function useRecentSession(): UseRecentSessionResult {
  const [result, setResult] = useState<UseRecentSessionResult>({ status: 'loading', session: null });

  useEffect(() => {
    const timer = setTimeout(() => {
      // Return null to show the empty-state card (first-time user).
      // Replace with a real Supabase fetch to get actual session data.
      setResult({ status: 'ready', session: null });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return result;
}

/** Returns a human-readable relative date label (e.g., "Today", "Yesterday", "3 days ago") */
export function formatRelativeDate(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
