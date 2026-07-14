import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ProgressPoint = {
  label: string;
  fluency: number;
  confidence: number;
  wpm: number;
  fillerCount: number;
};

export type ProgressSummary = {
  points: ProgressPoint[];
  latest: {
    fluency: number;
    confidence: number;
    wpm: number;
    fillerCount: number;
    lexiconTier: string;
  };
  deltas: {
    fluency: number;
    confidence: number;
    wpm: number;
    fillerCount: number;
  };
  strengths: string[];
  improvementAreas: string[];
  coachParagraph: string;
};

function deriveApiBaseUrl() {
  const gatewayUrl = process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://pravabloy-ai-backend.onrender.com/ws/voice-session';
  if (gatewayUrl.startsWith('wss://')) return gatewayUrl.replace('wss://', 'https://').replace('/ws/voice-session', '');
  if (gatewayUrl.startsWith('ws://')) return gatewayUrl.replace('ws://', 'http://').replace('/ws/voice-session', '');
  return gatewayUrl.replace('/ws/voice-session', '');
}

export function useProgressSummary() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('No active user session.');

        const response = await fetch(`${deriveApiBaseUrl()}/api/progress/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error ?? 'Progress summary request failed.');
        }
        if (mounted) {
          setSummary(payload.summary as ProgressSummary);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'Unable to load progress summary.');
          setSummary(null);
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

  return { loading, summary, error };
}

