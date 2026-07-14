import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function deriveApiBaseUrl() {
  const gatewayUrl = process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://pravabloy-ai-backend.onrender.com/ws/voice-session';
  if (gatewayUrl.startsWith('wss://')) return gatewayUrl.replace('wss://', 'https://').replace('/ws/voice-session', '');
  if (gatewayUrl.startsWith('ws://')) return gatewayUrl.replace('ws://', 'http://').replace('/ws/voice-session', '');
  return gatewayUrl.replace('/ws/voice-session', '');
}

export function useLatestAnalytics() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('No active user session.');

        const response = await fetch(`${deriveApiBaseUrl()}/api/analytics/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error ?? 'Latest analytics request failed.');
        }
        if (mounted) {
          setReport(payload.report ?? null);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'Unable to load latest analytics.');
          setReport(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, report, error };
}

