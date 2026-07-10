import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type AnalysisErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'transcript_too_short'
  | 'gemini_rate_limit'
  | 'gemini_auth'
  | 'gemini_malformed_response'
  | 'gemini_timeout'
  | 'gemini_error'
  | 'persist_error'
  | 'internal'
  | 'network'
  | 'timeout'
  | 'unknown';

export type GrammarGap = {
  original: string;
  corrected: string;
  explanation: string;
  practice_sentence?: string;
};

export type VocabularyTip = {
  term: string;
  meaning: string;
  standardAlternative: string;
  usage_example?: string;
};

export type ImprovementSolution = {
  area: string;
  evidence: string;
  solution: string;
  practice_drill: string;
};

export type PronunciationDrill = {
  focus: string;
  instruction: string;
  example_phrase: string;
};

export type FluencyActionStep = {
  step: number;
  goal: string;
  how_to_practice: string;
  success_criteria: string;
};

export type SessionAnalysisPayload = {
  wpm: number;
  filler_word_count: number;
  grammar_gaps: GrammarGap[];
  lexicon_tier_rank: string;
  fluency_score: number;
  confidence_score: number;
  strengths: string[];
  improvement_areas: string[];
  pronunciation_feedback: string;
  vocabulary_feedback: string;
  overall_evaluation: string;
  vocabulary_tips: VocabularyTip[];
  improvement_solutions?: ImprovementSolution[];
  pacing_feedback?: string;
  pacing_solutions?: string[];
  filler_word_solutions?: string[];
  pronunciation_drills?: PronunciationDrill[];
  fluency_action_plan?: FluencyActionStep[];
  next_session_goals?: string[];
  scenario_specific_advice?: string;
  analysis_schema_version?: number;
  transcript_turn_count?: number;
  context?: {
    category: string;
    scenarioPrompt: string;
    difficulty: string;
  };
  computed_metrics?: {
    wpm: number;
    filler_word_count: number;
  };
  live_pacing_summary?: unknown;
  live_pacing_wpm?: number | null;
};

export type AnalyticsReport = {
  id: string;
  user_id: string;
  voice_session_id: string;
  wpm?: number;
  filler_word_count?: number;
  filler_count?: number;
  grammar_gaps?: GrammarGap[];
  grammar_corrections?: GrammarGap[];
  lexicon_tier_rank?: string;
  fluency_score?: number;
  confidence_score?: number;
  score?: number;
  strengths?: string[];
  improvement_areas?: string[];
  vocab_feedback?: string;
  full_report?: SessionAnalysisPayload;
  created_at?: string;
  [key: string]: unknown;
};

export type GenerateSessionAnalysisResult = {
  report: AnalyticsReport;
  analysis: SessionAnalysisPayload;
  transcriptTurnCount: number;
  model: string;
  cached?: boolean;
};

export class SessionAnalysisError extends Error {
  code: AnalysisErrorCode;
  retryable: boolean;
  status?: number;

  constructor(message: string, code: AnalysisErrorCode, retryable = false, status?: number) {
    super(message);
    this.name = 'SessionAnalysisError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

const INVOKE_TIMEOUT_MS = 120_000;

async function parseFunctionError(error: unknown): Promise<SessionAnalysisError> {
  if (error instanceof FunctionsFetchError) {
    return new SessionAnalysisError(
      'Network error while contacting analysis service. Check your connection and retry.',
      'network',
      true,
    );
  }

  if (error instanceof FunctionsRelayError) {
    return new SessionAnalysisError(
      error.message || 'Analysis relay failed.',
      'unknown',
      true,
    );
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      const code = (body?.code as AnalysisErrorCode) ?? 'unknown';
      return new SessionAnalysisError(
        body?.error ?? error.message ?? 'Analysis request failed.',
        code,
        Boolean(body?.retryable),
        error.context.status,
      );
    } catch {
      return new SessionAnalysisError(
        error.message || 'Analysis request failed.',
        'unknown',
        error.context.status >= 500,
        error.context.status,
      );
    }
  }

  return new SessionAnalysisError(
    error instanceof Error ? error.message : 'Unexpected analysis error.',
    'unknown',
    true,
  );
}

/**
 * Invokes the `analyze-session` Supabase Edge Function for the authenticated user.
 * Auth headers are attached automatically by the Supabase client session.
 */
export async function generateSessionAnalysis(
  sessionId: string,
  options?: { signal?: AbortSignal },
): Promise<GenerateSessionAnalysisResult> {
  if (!sessionId?.trim()) {
    throw new SessionAnalysisError('sessionId is required.', 'bad_request', false);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);

  const abortListener = () => controller.abort();
  options?.signal?.addEventListener('abort', abortListener);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-session', {
      body: { sessionId },
    });

    if (error) {
      throw await parseFunctionError(error);
    }

    const payload = data as {
      ok?: boolean;
      error?: string;
      code?: AnalysisErrorCode;
      retryable?: boolean;
      report?: AnalyticsReport;
      analysis?: SessionAnalysisPayload;
      transcriptTurnCount?: number;
      model?: string;
      cached?: boolean;
    };

    if (!payload?.ok || !payload.report) {
      throw new SessionAnalysisError(
        payload?.error ?? 'Analysis failed without a report payload.',
        payload?.code ?? 'unknown',
        Boolean(payload?.retryable),
      );
    }

    return {
      report: payload.report,
      analysis: payload.analysis ?? (payload.report.full_report as SessionAnalysisPayload),
      transcriptTurnCount: payload.transcriptTurnCount ?? 0,
      model: payload.model ?? 'unknown',
      cached: payload.cached,
    };
  } catch (err) {
    if (err instanceof SessionAnalysisError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new SessionAnalysisError(
        'Analysis timed out. Please retry.',
        'timeout',
        true,
      );
    }
    throw await parseFunctionError(err);
  } finally {
    clearTimeout(timeoutId);
    options?.signal?.removeEventListener('abort', abortListener);
  }
}
