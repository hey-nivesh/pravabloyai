import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { DailyChallenge } from '@/hooks/useDailyChallenge';
import type { ProgressSummary } from '@/hooks/useProgressSummary';
import type { HistorySession } from '@/hooks/use-session-history';
import type { VoiceSession } from '@/hooks/use-recent-session';
import type { UserProfileRow } from '@/hooks/useUserProfile';

function mapRecentSession(sessionRow: Record<string, unknown>): VoiceSession {
  const durationSec = Math.max(
    0,
    Math.round(
      (new Date(String(sessionRow.completed_at ?? sessionRow.updated_at)).getTime() -
        new Date(String(sessionRow.created_at)).getTime()) /
        1000,
    ),
  );

  const category =
    sessionRow.mode === 'executive'
      ? 'executive'
      : sessionRow.mode === 'mock_interview'
        ? 'interview'
        : 'casual';

  const caseStudyId = String(sessionRow.case_study_id ?? 'ordering-coffee');
  const modeName =
    caseStudyId === 'salary-negotiation'
      ? 'Salary Negotiation'
      : caseStudyId === 'system-design'
        ? 'System Design Interview'
        : caseStudyId === 'hotel-checkin'
          ? 'Hotel Check-In'
          : 'Ordering at a Cafe';

  return {
    id: String(sessionRow.id),
    caseStudyId,
    modeName,
    category: category as VoiceSession['category'],
    completedAt: String(sessionRow.completed_at ?? sessionRow.updated_at ?? sessionRow.created_at),
    durationSeconds: durationSec,
    analyticsReportId: String(sessionRow.analytics_report_id ?? ''),
  };
}

function deriveApiBaseUrl() {
  const gatewayUrl =
    process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://pravabloy-ai-backend.onrender.com/ws/voice-session';
  if (gatewayUrl.startsWith('wss://')) {
    return gatewayUrl.replace('wss://', 'https://').replace('/ws/voice-session', '');
  }
  if (gatewayUrl.startsWith('ws://')) {
    return gatewayUrl.replace('ws://', 'http://').replace('/ws/voice-session', '');
  }
  return gatewayUrl.replace('/ws/voice-session', '');
}

function isToday(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export type HomePrefetchResult = {
  profile: UserProfileRow | null;
  recentSession: VoiceSession | null;
  sessions: HistorySession[];
  dailyChallenge: DailyChallenge | null;
  progressSummary: ProgressSummary | null;
};

export async function prefetchHomeData(userId: string, accessToken: string): Promise<HomePrefetchResult> {
  const [profileResult, recentResult, historyResult, challengeResult, progressResult] =
    await Promise.allSettled([
      supabase
        .from('users')
        .select(
          'id, full_name, avatar_url, avatar_public_id, subscription_tier, streak_count, xp_total, xp_level, created_at, preferred_explanation_language',
        )
        .eq('id', userId)
        .single(),
      supabase
        .from('voice_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      apiFetch<{ ok: boolean; sessions: HistorySession[] }>('/api/voice-sessions/history?limit=50'),
      apiFetch<{ ok: boolean; challenge: DailyChallenge }>('/api/v1/daily-challenge/today'),
      fetch(`${deriveApiBaseUrl()}/api/progress/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.ok) return null;
        return payload.summary as ProgressSummary;
      }),
    ]);

  const profile =
    profileResult.status === 'fulfilled' && !profileResult.value.error
      ? (profileResult.value.data as UserProfileRow)
      : null;

  const recentSession =
    recentResult.status === 'fulfilled' && recentResult.value.data
      ? mapRecentSession(recentResult.value.data as Record<string, unknown>)
      : null;

  const sessions =
    historyResult.status === 'fulfilled' ? (historyResult.value.sessions ?? []) : [];

  const dailyChallenge =
    challengeResult.status === 'fulfilled' ? (challengeResult.value.challenge ?? null) : null;

  const progressSummary =
    progressResult.status === 'fulfilled' ? progressResult.value : null;

  return { profile, recentSession, sessions, dailyChallenge, progressSummary };
}

export function computeTodayStats(sessions: HistorySession[]) {
  const todaySessions = sessions.filter((s) => isToday(s.completedAt));
  const minutesToday = todaySessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
  return {
    minutesToday,
    totalMinutes,
    sessionsCompleted: sessions.length,
    todaySessionCount: todaySessions.length,
  };
}
