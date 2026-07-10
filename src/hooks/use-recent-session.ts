import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type VoiceSession = {
  id: string;
  caseStudyId: string;
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
    let isMounted = true;
    const load = async () => {
      try {
        const { data: auth } = await supabase.auth.getSession();
        const userId = auth?.session?.user?.id;
        if (!userId) {
          if (isMounted) setResult({ status: 'ready', session: null });
          return;
        }

        const { data: sessionRow } = await supabase
          .from('voice_sessions')
          .select('*')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sessionRow) {
          if (isMounted) setResult({ status: 'ready', session: null });
          return;
        }

        const durationSec = Math.max(
          0,
          Math.round(
            (new Date(sessionRow.completed_at ?? sessionRow.updated_at).getTime() -
              new Date(sessionRow.created_at).getTime()) /
              1000,
          ),
        );

        const category =
          sessionRow.mode === 'executive'
            ? 'executive'
            : sessionRow.mode === 'mock_interview'
            ? 'interview'
            : 'casual';

        const modeName =
          sessionRow.case_study_id === 'salary-negotiation'
            ? 'Salary Negotiation'
            : sessionRow.case_study_id === 'system-design'
            ? 'System Design Interview'
            : sessionRow.case_study_id === 'hotel-checkin'
            ? 'Hotel Check-In'
            : 'Ordering at a Cafe';

        const mapped: VoiceSession = {
          id: String(sessionRow.id),
          caseStudyId: String(sessionRow.case_study_id ?? 'ordering-coffee'),
          modeName,
          category,
          completedAt: String(sessionRow.completed_at ?? sessionRow.updated_at ?? sessionRow.created_at),
          durationSeconds: durationSec,
          analyticsReportId: String(sessionRow.analytics_report_id ?? ''),
        };

        if (isMounted) setResult({ status: 'ready', session: mapped });
      } catch (_) {
        if (isMounted) setResult({ status: 'ready', session: null });
      }
    };

    load();
    return () => {
      isMounted = false;
    };
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
