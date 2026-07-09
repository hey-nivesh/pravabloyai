import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { apiFetch } from '@/lib/api';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiFetch<{
        ok: boolean;
        notifications: AppNotification[];
        unreadCount: number;
      }>('/api/v1/notifications');
      if (mountedRef.current) {
        setNotifications(payload.notifications ?? []);
        setUnreadCount(payload.unreadCount ?? 0);
        setError(null);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    await apiFetch('/api/v1/notifications/read', { method: 'POST', body: JSON.stringify({}) });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  return { notifications, unreadCount, loading, error, refetch: fetchNotifications, markAllRead };
}
