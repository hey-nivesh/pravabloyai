/**
 * Coordinates real splash-screen readiness gates before the app becomes interactive.
 *
 * Tiles map to:
 *   1 — fonts loaded
 *   2 — auth session resolved + initial profile row fetched (when signed in)
 *   3 — critical Home above-the-fold image assets preloaded
 */

import { useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export const SPLASH_MIN_DURATION_MS = 1800;
export const SPLASH_MAX_WAIT_MS = 9000;

const CRITICAL_HOME_ASSETS = [
  require('@/assets/images/avatar.png'),
  require('@/assets/images/coach-explaining.png'),
  require('@/assets/images/coach-resting.png'),
  require('@/assets/images/coach-celebrating.png'),
  require('@/assets/images/logo.png'),
];

export type SplashReadinessTiles = {
  fonts: boolean;
  authProfile: boolean;
  assets: boolean;
};

export type SplashReadinessState = {
  tiles: SplashReadinessTiles;
  allReady: boolean;
  timedOut: boolean;
};

export function useSplashReadiness(): SplashReadinessState {
  const { session, isLoading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({});
  const [profileResolved, setProfileResolved] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const profileFetchStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SPLASH_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Asset.loadAsync(CRITICAL_HOME_ASSETS)
      .then(() => {
        if (!cancelled) setAssetsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setAssetsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    if (!session?.user?.id) {
      setProfileResolved(true);
      return () => {
        cancelled = true;
      };
    }

    if (profileFetchStarted.current) {
      return () => {
        cancelled = true;
      };
    }

    profileFetchStarted.current = true;

    (async () => {
      try {
        await supabase
          .from('users')
          .select(
            'id, full_name, avatar_url, avatar_public_id, subscription_tier, streak_count, xp_total, xp_level, created_at, preferred_explanation_language',
          )
          .eq('id', session.user.id)
          .single();
      } catch {
        // Proceed even if profile fetch fails — useUserProfile will retry in-app.
      } finally {
        if (!cancelled) setProfileResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user?.id]);

  const tiles: SplashReadinessTiles = {
    fonts: fontsLoaded,
    authProfile: !authLoading && profileResolved,
    assets: assetsLoaded,
  };

  const allReady = tiles.fonts && tiles.authProfile && tiles.assets;

  return { tiles, allReady, timedOut };
}
