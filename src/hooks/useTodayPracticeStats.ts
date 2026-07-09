import { useMemo } from 'react';

import { useSessionHistory } from '@/hooks/use-session-history';

function isToday(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function useTodayPracticeStats() {
  const { sessions, loading, error, refetch } = useSessionHistory();

  const stats = useMemo(() => {
    const todaySessions = sessions.filter((s) => isToday(s.completedAt));
    const minutesToday = todaySessions.reduce(
      (sum, s) => sum + s.durationSeconds / 60,
      0,
    );
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationSeconds / 60, 0);
    return {
      minutesToday,
      totalMinutes,
      sessionsCompleted: sessions.length,
      todaySessionCount: todaySessions.length,
    };
  }, [sessions]);

  return { ...stats, loading, error, refetch };
}
