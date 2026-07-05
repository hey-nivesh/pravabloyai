import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';

/**
 * @deprecated Use `useUserProfile` from `@/hooks/useUserProfile` instead.
 * This type derives data from the auth session's user_metadata only and does
 * not fetch from the `public.users` database table.
 */
export type UserProfile = {
  id: string;
  firstName: string;
  email: string;
  streakCount: number;
  avatarUrl: string | null;
};

type UseUserResult =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: UserProfile }
  | { status: 'unauthenticated'; user: null };

/**
 * Derives a typed UserProfile from the Supabase session.
 *
 * Profile fields (firstName, streakCount, avatarUrl) are read from
 * the session's user_metadata when available, or fall back to sensible
 * defaults. Wire a `profiles` table fetch here when you have one set up:
 *
 *   const { data } = await supabase
 *     .from('profiles')
 *     .select('*')
 *     .eq('id', session.user.id)
 *     .single();
 */
export function useUser(): UseUserResult {
  const { session, isLoading } = useAuth();

  return useMemo<UseUserResult>(() => {
    if (isLoading) {
      return { status: 'loading', user: null };
    }

    if (!session) {
      return { status: 'unauthenticated', user: null };
    }

    const meta = session.user.user_metadata ?? {};
    const email = session.user.email ?? '';

    // Derive firstName: prefer user_metadata.full_name / name / first_name,
    // otherwise take the local part of the email.
    const rawName: string =
      meta.full_name ?? meta.name ?? meta.first_name ?? '';
    const firstName = rawName
      ? rawName.split(' ')[0]
      : email.split('@')[0] ?? 'Learner';

    return {
      status: 'authenticated',
      user: {
        id: session.user.id,
        firstName,
        email,
        // TODO: fetch streakCount from your profiles table
        streakCount: (meta.streak_count as number | undefined) ?? 0,
        avatarUrl: (meta.avatar_url as string | undefined) ?? null,
      },
    };
  }, [session, isLoading]);
}
