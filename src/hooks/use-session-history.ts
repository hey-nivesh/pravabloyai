import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export type HistorySession = {
  id: string;
  caseStudyId: string;
  mode: string;
  status: string;
  completedAt: string;
  createdAt: string;
  durationSeconds: number;
  analyticsReportId: string | null;
  turnCount: number;
};

const CASE_STUDY_LABELS: Record<string, string> = {
  'ordering-coffee': 'Ordering at a Cafe',
  'hotel-checkin': 'Hotel Check-In',
  'salary-negotiation': 'Salary Negotiation',
  'system-design': 'System Design Interview',
};

export function getCaseStudyLabel(caseStudyId: string): string {
  return CASE_STUDY_LABELS[caseStudyId] ?? caseStudyId.replace(/-/g, ' ');
}

export function useSessionHistory() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiFetch<{ ok: boolean; sessions: HistorySession[] }>(
        '/api/voice-sessions/history?limit=50',
      );
      setSessions(payload.sessions ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load session history.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, sessions, error, refetch };
}
