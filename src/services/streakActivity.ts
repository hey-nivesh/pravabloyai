import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/hooks/use-daily-word';

const STREAK_KEY_PREFIX = 'streak_recorded_v1';

/**
 * Records today's learning activity once per user per calendar day.
 * Safe to call from any learning screen — deduped locally and on the server.
 */
export async function recordStreakActivity(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user?.id) return;

  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `${STREAK_KEY_PREFIX}_${session.user.id}_${today}`;
  const already = await AsyncStorage.getItem(cacheKey);
  if (already) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/streak/record`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      await AsyncStorage.setItem(cacheKey, '1');
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[recordStreakActivity] failed:', err);
    }
  }
}
