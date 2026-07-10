import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/context/auth-context';
import {
  computeTodayStats,
  prefetchHomeData,
  type HomePrefetchResult,
} from '@/lib/home-prefetch';
import type { DailyChallenge } from '@/hooks/useDailyChallenge';
import type { ProgressSummary } from '@/hooks/useProgressSummary';
import type { HistorySession } from '@/hooks/use-session-history';
import type { VoiceSession } from '@/hooks/use-recent-session';
import type { UserProfileRow } from '@/hooks/useUserProfile';

type HomeDataContextValue = {
  ready: boolean;
  userEmail: string | null;
  profile: UserProfileRow | null;
  recentSession: VoiceSession | null;
  sessions: HistorySession[];
  dailyChallenge: DailyChallenge | null;
  progressSummary: ProgressSummary | null;
  minutesToday: number;
  totalMinutes: number;
  sessionsCompleted: number;
  refetch: () => Promise<void>;
};

const HomeDataContext = createContext<HomeDataContextValue | undefined>(undefined);

export function HomeDataProvider({ children }: PropsWithChildren) {
  const { session, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<HomePrefetchResult | null>(null);
  const [ready, setReady] = useState(false);
  const fetchId = useRef(0);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    const currentFetch = ++fetchId.current;
    const isMounted = () => currentFetch === fetchId.current;

    if (!session?.user?.id || !session.access_token) {
      if (!isMounted()) return;
      setData(null);
      setReady(true);
      hasLoadedOnce.current = true;
      return;
    }

    if (!hasLoadedOnce.current) {
      setReady(false);
    }

    const result = await prefetchHomeData(session.user.id, session.access_token);
    if (!isMounted()) return;
    setData(result);
    setReady(true);
    hasLoadedOnce.current = true;
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    load();
    return () => {
      fetchId.current += 1;
    };
  }, [authLoading, load]);

  const stats = useMemo(
    () => computeTodayStats(data?.sessions ?? []),
    [data?.sessions],
  );

  const value = useMemo<HomeDataContextValue>(
    () => ({
      ready: !authLoading && ready,
      userEmail: session?.user?.email ?? null,
      profile: data?.profile ?? null,
      recentSession: data?.recentSession ?? null,
      sessions: data?.sessions ?? [],
      dailyChallenge: data?.dailyChallenge ?? null,
      progressSummary: data?.progressSummary ?? null,
      minutesToday: stats.minutesToday,
      totalMinutes: stats.totalMinutes,
      sessionsCompleted: stats.sessionsCompleted,
      refetch: load,
    }),
    [authLoading, ready, data, stats, load, session?.user?.email],
  );

  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
}

export function useHomeData(): HomeDataContextValue {
  const ctx = useContext(HomeDataContext);
  if (!ctx) {
    throw new Error('useHomeData() must be called inside <HomeDataProvider>.');
  }
  return ctx;
}
