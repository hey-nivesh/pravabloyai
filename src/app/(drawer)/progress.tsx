import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProgressSummary } from '@/hooks/useProgressSummary';
import { TrendLineChart } from '@/components/progress/TrendLineChart';

export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, summary, error } = useProgressSummary();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const labels = summary?.points.map((p) => p.label) ?? [];
  const fluency = summary?.points.map((p) => p.fluency) ?? [];
  const confidence = summary?.points.map((p) => p.confidence) ?? [];
  const wpm = summary?.points.map((p) => p.wpm) ?? [];
  const fillers = summary?.points.map((p) => p.fillerCount) ?? [];

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
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/images/coach-explaining.png')}
            style={styles.coachImage}
            contentFit="contain"
            accessibilityLabel="Coach guiding progress insights"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your Progress Lab</Text>
            <Text style={styles.description}>
              {summary?.coachParagraph ??
                'Complete more speaking sessions to unlock adaptive guidance and richer charts.'}
            </Text>
          </View>
        </View>

        {loading && <Text style={styles.helperText}>Loading your progress metrics...</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && summary && (
          <>
            <View style={styles.metricsRow}>
              <MetricPill label="Fluency" value={`${summary.latest.fluency}`} delta={summary.deltas.fluency} />
              <MetricPill label="Confidence" value={`${summary.latest.confidence}`} delta={summary.deltas.confidence} />
            </View>
            <View style={styles.metricsRow}>
              <MetricPill label="WPM" value={`${summary.latest.wpm}`} delta={summary.deltas.wpm} />
              <MetricPill label="Fillers" value={`${summary.latest.fillerCount}`} delta={-summary.deltas.fillerCount} />
            </View>

            <TrendLineChart title="Fluency Trend" values={fluency} labels={labels} color={Brand.primary} suffix="%" />
            <TrendLineChart title="Confidence Trend" values={confidence} labels={labels} color={Brand.accentBlue} suffix="%" />
            <TrendLineChart title="WPM Trend" values={wpm} labels={labels} color={Brand.accentGreen} />
            <TrendLineChart title="Filler Words Trend" values={fillers} labels={labels} color={Brand.accentAmber} />

            <View style={styles.recommendCard}>
              <Text style={styles.sectionTitle}>Strengths</Text>
              {(summary.strengths.length ? summary.strengths : ['Keep speaking daily to reinforce your rhythm.']).map(
                (item, idx) => (
                  <Text key={`s-${idx}`} style={styles.bulletText}>• {item}</Text>
                ),
              )}
              <Text style={[styles.sectionTitle, { marginTop: Spacing.three }]}>Improvement Areas</Text>
              {(
                summary.improvementAreas.length
                  ? summary.improvementAreas
                  : ['Slow down slightly and focus on sentence completion before pausing.']
              ).map((item, idx) => (
                <Text key={`i-${idx}`} style={styles.bulletText}>• {item}</Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetricPill({ label, value, delta }: { label: string; value: string; delta: number }) {
  const isPositive = delta >= 0;
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricDelta, { color: isPositive ? Brand.accentGreen : '#EF4444' }]}>
        {isPositive ? '+' : ''}
        {Math.round(delta)}
      </Text>
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
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  coachImage: { width: 90, height: 90 },
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
  helperText: { color: Brand.grayText, fontSize: 13, textAlign: 'center' },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: Spacing.two },
  metricPill: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 14, 158, 0.12)',
  },
  metricLabel: { color: Brand.grayText, fontSize: 11, fontWeight: '600' },
  metricValue: { color: Brand.primaryDark, fontSize: 20, fontWeight: '800' },
  metricDelta: { fontSize: 12, fontWeight: '700' },
  recommendCard: {
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
  },
  bulletText: {
    color: Brand.grayText,
    lineHeight: 20,
    fontSize: 13,
  },
});
