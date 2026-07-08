import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLatestAnalytics } from '@/hooks/useLatestAnalytics';

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, report, error } = useLatestAnalytics();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const full = report?.full_report ?? {};
  const fluencyScore = Number(report?.fluency_score ?? report?.score ?? full.fluency_score ?? 0);
  const confidenceScore = Number(report?.confidence_score ?? full.confidence_score ?? 0);
  const wpm = Number(report?.wpm ?? full.wpm ?? 0);
  const fillerCount = Number(report?.filler_word_count ?? report?.filler_count ?? full.filler_word_count ?? 0);
  const grammar = report?.grammar_gaps ?? report?.grammar_corrections ?? full.grammar_gaps ?? [];
  const strengths = report?.strengths ?? full.strengths ?? [];
  const improvements = report?.improvement_areas ?? full.improvement_areas ?? [];
  const vocabFeedback = report?.vocab_feedback ?? full.vocabulary_feedback ?? '';
  const overall = full.overall_evaluation ?? '';

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={Brand.primaryDark}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/images/coach-explaining.png')}
            style={styles.coachImage}
            contentFit="contain"
            accessibilityLabel="Coach analytics overview"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Insight Report</Text>
            <Text style={styles.description}>
              {overall || 'Your latest conversation analysis appears here with specific strengths and improvements.'}
            </Text>
          </View>
        </View>

        {loading && <Text style={styles.helperText}>Loading latest analytics...</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !report && (
          <Text style={styles.helperText}>
            No completed report yet. Finish one voice session to generate personalized analytics.
          </Text>
        )}

        {!loading && report && (
          <>
            <View style={styles.scoreRow}>
              <ScoreBadge label="Fluency" value={`${fluencyScore}%`} />
              <ScoreBadge label="Confidence" value={`${confidenceScore}%`} />
              <ScoreBadge label="WPM" value={`${wpm}`} />
              <ScoreBadge label="Fillers" value={`${fillerCount}`} />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Grammar Focus</Text>
              {Array.isArray(grammar) && grammar.length > 0 ? (
                grammar.slice(0, 3).map((item: any, idx: number) => (
                  <Text key={`g-${idx}`} style={styles.bulletText}>
                    • {item?.original ?? 'Statement'} → {item?.corrected ?? 'Improved phrasing'}
                  </Text>
                ))
              ) : (
                <Text style={styles.bulletText}>• No major grammar corrections were flagged.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Strengths</Text>
              {(Array.isArray(strengths) && strengths.length > 0 ? strengths : ['Steady participation and active speaking turns.']).map(
                (item: string, idx: number) => (
                  <Text key={`s-${idx}`} style={styles.bulletText}>• {item}</Text>
                ),
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Next Improvements</Text>
              {(
                Array.isArray(improvements) && improvements.length > 0
                  ? improvements
                  : ['Reduce fillers and aim for clearer sentence completion before pauses.']
              ).map((item: string, idx: number) => (
                <Text key={`i-${idx}`} style={styles.bulletText}>• {item}</Text>
              ))}
            </View>

            {!!vocabFeedback && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Vocabulary Coaching</Text>
                <Text style={styles.description}>{vocabFeedback}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ScoreBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreBadge}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  coachImage: { width: 92, height: 92 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  description: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'left',
    lineHeight: 20,
  },
  helperText: { color: Brand.grayText, textAlign: 'center', fontSize: 13 },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 13 },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
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
  sectionTitle: {
    color: Brand.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  bulletText: {
    color: Brand.grayText,
    fontSize: 13,
    lineHeight: 20,
  },
});
