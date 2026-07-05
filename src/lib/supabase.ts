/**
 * Supabase client singleton.
 *
 * Fill in your project credentials via environment variables:
 *   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 *
 * Create a .env file at the project root (not committed to git).
 * Expo automatically exposes EXPO_PUBLIC_* vars to the JS bundle.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Create a .env file at the project root with these values.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /**
     * AsyncStorage persists the Supabase session across app restarts.
     * Requires @react-native-async-storage/async-storage to be installed.
     */
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
