/**
 * AuthContext — provides the Supabase session state to the whole app.
 *
 * Usage:
 *   const { session, isLoading, signOut } = useAuth();
 *
 * The root _layout.tsx wraps the app in <AuthProvider> and uses the session
 * state to guard routes (unauthenticated → /(auth)/login).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { type Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// ─── Context type ─────────────────────────────────────────────────────────────

type AuthContextValue = {
  /** Current Supabase session — null when signed out, undefined while loading */
  session: Session | null | undefined;
  /** True only during the initial session load on app start */
  isLoading: boolean;
  /** Sign out and clear the session */
  signOut: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: PropsWithChildren) {
  // `undefined` = still loading; `null` = loaded, no session; `Session` = authenticated
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get the initial session (from AsyncStorage / cookie)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsLoading(false);
    });

    // 2. Subscribe to future changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current auth context. Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be called inside <AuthProvider>.');
  }
  return ctx;
}
