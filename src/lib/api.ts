import { supabase } from '@/lib/supabase';

export function deriveApiBaseUrl(): string {
  const gatewayUrl =
    process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://api.pravabloy.ai/ws/voice-session';
  if (gatewayUrl.startsWith('wss://')) {
    return gatewayUrl.replace('wss://', 'https://').replace('/ws/voice-session', '');
  }
  if (gatewayUrl.startsWith('ws://')) {
    return gatewayUrl.replace('ws://', 'http://').replace('/ws/voice-session', '');
  }
  return gatewayUrl.replace('/ws/voice-session', '');
}

export async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('No active user session.');
  return token;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${deriveApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }
  return payload as T;
}

export async function pollSessionReport(
  sessionId: string,
  maxAttempts = 20,
  intervalMs = 2000,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const payload = await apiFetch<{
        ok: boolean;
        ready: boolean;
        reportId: string | null;
      }>(`/api/analytics/by-session/${encodeURIComponent(sessionId)}`);
      if (payload.ready && payload.reportId) {
        return payload.reportId;
      }
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
