import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { apiFetch } from '@/lib/api';

export type JourneyNodeId =
  | 'grammar_foundations'
  | 'vocabulary_grove'
  | 'casual_cove'
  | 'executive_boardroom'
  | 'negotiation_arena'
  | 'mock_interview_summit';

export type JourneyNodeStatus = 'locked' | 'current' | 'completed';

export type JourneyNode = {
  id: JourneyNodeId;
  number: number;
  label: string;
  shortLabel: string;
  categoryRoute: string | null;
  status: JourneyNodeStatus;
  unlockHint: string;
  progressCount: number;
  progressTarget: number;
};

export function useJourneyMap() {
  const [nodes, setNodes] = useState<JourneyNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<JourneyNodeId>('grammar_foundations');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchMap = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiFetch<{
        ok: boolean;
        nodes: JourneyNode[];
        currentNodeId: JourneyNodeId;
        avatarUrl: string | null;
      }>('/api/v1/journey-map');
      if (mountedRef.current) {
        setNodes(payload.nodes);
        setCurrentNodeId(payload.currentNodeId);
        setAvatarUrl(payload.avatarUrl);
        setError(null);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load journey map.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchMap();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchMap]);

  useFocusEffect(
    useCallback(() => {
      fetchMap();
    }, [fetchMap]),
  );

  return { nodes, currentNodeId, avatarUrl, loading, error, refetch: fetchMap };
}
