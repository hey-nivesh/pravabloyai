import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type VoiceStartContextValue = {
  /** Scenario case-study id set from Active Practice / home context */
  scenarioCaseStudyId: string | null;
  setScenarioCaseStudyId: (id: string | null) => void;
};

const VoiceStartContext = createContext<VoiceStartContextValue | undefined>(undefined);

export function VoiceStartProvider({ children }: PropsWithChildren) {
  const [scenarioCaseStudyId, setScenarioCaseStudyIdState] = useState<string | null>(null);

  const setScenarioCaseStudyId = useCallback((id: string | null) => {
    setScenarioCaseStudyIdState(id);
  }, []);

  const value = useMemo(
    () => ({ scenarioCaseStudyId, setScenarioCaseStudyId }),
    [scenarioCaseStudyId, setScenarioCaseStudyId],
  );

  return <VoiceStartContext.Provider value={value}>{children}</VoiceStartContext.Provider>;
}

export function useVoiceStart(): VoiceStartContextValue {
  const ctx = useContext(VoiceStartContext);
  if (!ctx) {
    throw new Error('useVoiceStart() must be called inside <VoiceStartProvider>.');
  }
  return ctx;
}
