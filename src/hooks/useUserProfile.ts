/**
 * useUserProfile — Single source of truth for the current user's profile data.
 *
 * Fetches the matching `public.users` row from Supabase and subscribes to
 * real-time changes so the UI updates immediately after an avatar upload or
 * profile edit without requiring an app restart.
 *
 * Usage:
 *   const { user, profile, loading, refetch } = useUserProfile();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

// ─── Public users row shape ────────────────────────────────────────────────────

export type UserProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_public_id: string | null;
  subscription_tier: 'free' | 'pro' | string;
  streak_count: number;
  created_at: string; // ISO timestamp — shown as "Member since …"
};

// ─── Return type ───────────────────────────────────────────────────────────────

export type UseUserProfileResult = {
  /** The Supabase Auth user (id, email, etc.) — null while loading or signed out */
  user: User | null;
  /** The public.users database row — null while loading or no row exists */
  profile: UserProfileRow | null;
  /** True while the initial fetch is in flight */
  loading: boolean;
  /** Manually re-fetch the profile row from the database */
  refetch: () => Promise<void>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserProfile(): UseUserProfileResult {
  const { session, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  // Track the current user id to set up / tear down the realtime subscription
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = session?.user?.id ?? null;

  // ─── Fetch helper ──────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, full_name, avatar_url, avatar_public_id, subscription_tier, streak_count, created_at',
      )
      .eq('id', uid)
      .single();

    if (error) {
      if (__DEV__) {
        console.warn('[useUserProfile] fetch error:', error.message);
      }
      setProfile(null);
    } else {
      setProfile(data as UserProfileRow);
    }
  }, []);

  // ─── Public refetch ────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    if (!userId) return;
    await fetchProfile(userId);
  }, [userId, fetchProfile]);

  // ─── Initial fetch + realtime subscription ─────────────────────────────────

  useEffect(() => {
    // Still waiting for the auth session to resolve — don't fetch yet
    if (authLoading) return;

    // Signed out
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // 1. Initial fetch
    setLoading(true);
    fetchProfile(userId).finally(() => {
      if (!cancelled) setLoading(false);
    });

    // 2. Subscribe to real-time row changes (INSERT, UPDATE, DELETE)
    //    A unique channel name (with timestamp) prevents "cannot add callbacks
    //    after subscribe()" errors caused by channel name collisions on re-render.
    const channelName = `public:users:${userId}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProfile(null);
          } else {
            setProfile(payload.new as UserProfileRow);
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      cancelled = true;
      // Unsubscribe first, then remove — avoids dangling channel references
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
      realtimeChannelRef.current = null;
    };
  }, [authLoading, userId, fetchProfile]);

  return {
    user: session?.user ?? null,
    profile,
    loading: authLoading || loading,
    refetch,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive the display first name from a profile row and fallback email. */
export function getFirstName(
  profile: UserProfileRow | null,
  email: string | null | undefined,
): string {
  const rawName = profile?.full_name ?? '';
  if (rawName) return rawName.split(' ')[0];
  return email?.split('@')[0] ?? 'Learner';
}

/** Format an ISO timestamp as "Month YYYY" (e.g., "July 2024"). */
export function formatMemberSince(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
