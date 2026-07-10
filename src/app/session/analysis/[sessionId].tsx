import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { CASE_STUDIES } from '@/constants/case-studies';
import { DetailedAnalysisReport } from '@/components/analytics/DetailedAnalysisReport';
import {
  generateSessionAnalysis,
  SessionAnalysisError,
  type AnalyticsReport,
  type SessionAnalysisPayload,
} from '@/services/analysis';

const FLUENCY_TIPS = [
  'Automaticity first: prioritize speaking flow over perfect grammar on your first try.',
  'Muscle memory: re-read corrected sentences aloud to train pronunciation patterns.',
  'Native speakers link sounds — pay attention to how words connect in natural speech.',
  'Memorize phrase chunks rather than isolated words to sound more natural.',
  'Record yourself regularly to spot subconscious pauses or filler habits.',
];

function AnalysisSpinner() {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.spinnerWrap}>
      <Animated.View style={[styles.spinnerRing, spinStyle]} />
      <Text style={styles.spinnerEmoji}>✨</Text>
    </View>
  );
}

export default function SessionAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId, caseStudyId } = useLocalSearchParams<{
    sessionId: string;
    caseStudyId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SessionAnalysisError | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [analysis, setAnalysis] = useState<SessionAnalysisPayload | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const attemptRef = useRef(0);

  const caseStudyTitle =
    CASE_STUDIES.find((cs) => cs.id === caseStudyId)?.title ?? 'Voice Session';

  const runAnalysis = useCallback(async () => {
    if (!sessionId) {
      setError(new SessionAnalysisError('Missing session id.', 'bad_request', false));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    attemptRef.current += 1;
    const attempt = attemptRef.current;

    try {
      const result = await generateSessionAnalysis(sessionId);
      if (attempt !== attemptRef.current) return;
      setReport(result.report);
      setAnalysis(result.analysis);
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof SessionAnalysisError ? err : new SessionAnalysisError(
        err instanceof Error ? err.message : 'Analysis failed.',
        'unknown',
        true,
      ));
    } finally {
      if (attempt === attemptRef.current) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void runAnalysis();
  }, [runAnalysis]);

  useEffect(() => {
    if (!loading) return undefined;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % FLUENCY_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [loading]);

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.replace('/')}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Session Analysis</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{caseStudyTitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.loadingCard}>
            <AnalysisSpinner />
            <Text style={styles.loadingTitle}>Analyzing your conversation…</Text>
            <Text style={styles.loadingSub}>
              Gemini is evaluating grammar, pronunciation context, pacing, and vocabulary from your transcript.
            </Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipLabel}>Fluency tip</Text>
              <Text style={styles.tipText}>{FLUENCY_TIPS[tipIndex]}</Text>
            </View>
            <ActivityIndicator color={Brand.primary} style={{ marginTop: Spacing.three }} />
          </Animated.View>
        )}

        {!loading && error && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Analysis failed</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            {error.retryable && (
              <Pressable onPress={() => void runAnalysis()} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry analysis</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.replace('/')} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Back to home</Text>
            </Pressable>
          </Animated.View>
        )}

        {!loading && !error && report && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <DetailedAnalysisReport report={report} analysis={analysis} />
            <Pressable
              onPress={() => {
                if (report.id) router.push(`/analytics/${report.id}`);
                else router.replace('/(drawer)/analytics');
              }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Save & view history</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgGradientEnd },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 28, color: Brand.primaryDark, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Brand.primaryDark },
  headerSub: { fontSize: 12, color: Brand.grayText, marginTop: 2 },
  content: { padding: Spacing.four, gap: Spacing.three },
  loadingCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  spinnerWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  spinnerRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: 'rgba(127, 34, 253, 0.15)',
    borderTopColor: Brand.primary,
  },
  spinnerEmoji: { fontSize: 28 },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  tipCard: {
    marginTop: Spacing.three,
    backgroundColor: 'rgba(127, 34, 253, 0.06)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.1)',
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tipText: { fontSize: 13, color: Brand.primaryDark, lineHeight: 20 },
  errorCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorEmoji: { fontSize: 36, marginBottom: Spacing.two },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Brand.primaryDark },
  errorMessage: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  retryBtn: {
    marginTop: Spacing.three,
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderRadius: Radius.full,
    width: '100%',
    alignItems: 'center',
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { marginTop: Spacing.two, padding: Spacing.two },
  secondaryBtnText: { color: Brand.grayText, fontSize: 14, fontWeight: '600' },
  results: { gap: Spacing.three },
  heroCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  heroScore: { fontSize: 48, fontWeight: '800', color: Brand.primaryDark },
  heroLabel: { fontSize: 13, fontWeight: '600', color: Brand.grayText, marginTop: 4 },
  heroSummary: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.two,
  },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  scoreBadge: {
    minWidth: '47%',
    backgroundColor: Brand.cardBg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  scoreLabel: { color: Brand.grayText, fontSize: 11, fontWeight: '600' },
  scoreValue: { color: Brand.primaryDark, fontSize: 18, fontWeight: '800' },
  sectionCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  sectionTitle: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700', marginBottom: Spacing.one },
  bodyText: { color: Brand.grayText, fontSize: 13, lineHeight: 20 },
  bulletText: { color: Brand.grayText, fontSize: 13, lineHeight: 20, marginTop: 4 },
  vocabTip: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 34, 253, 0.08)',
  },
  vocabTerm: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700' },
  vocabAlt: { color: Brand.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  primaryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
