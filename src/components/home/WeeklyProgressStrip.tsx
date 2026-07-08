import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';
import type { ProgressSummary } from '@/hooks/useProgressSummary';

type WeeklyProgressStripProps = {
  loading: boolean;
  summary: ProgressSummary | null;
  error: string | null;
};

export function WeeklyProgressStrip({ loading, summary, error }: WeeklyProgressStripProps) {
  const router = useRouter();
  const latest = summary?.latest;
  const coachTip =
    summary?.improvementAreas?.[0] ??
    summary?.strengths?.[0] ??
    'Finish one session today to unlock richer weekly insights.';

  return (
    <Pressable
      onPress={() => router.push('/progress' as never)}
      style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
      accessibilityRole="button"
      accessibilityLabel="Open weekly progress details"
    >
      <View style={styles.left}>
        <Image
          source={require('@/assets/images/coach-explaining.png')}
          style={styles.coach}
          contentFit="contain"
          accessibilityLabel="Coach giving weekly recommendation"
        />
      </View>
      <View style={styles.center}>
        <Text style={styles.kicker}>Weekly Progress</Text>
        {loading ? (
          <Text style={styles.title}>Loading trend insights...</Text>
        ) : error ? (
          <Text style={styles.title}>Unable to load weekly metrics</Text>
        ) : (
          <Text style={styles.title}>
            Fluency {Math.round(latest?.fluency ?? 0)}% • WPM {Math.round(latest?.wpm ?? 0)}
          </Text>
        )}
        <Text style={styles.tip} numberOfLines={2}>
          Coach: {coachTip}
        </Text>
      </View>
      <View style={styles.sparkWrap}>
        {(summary?.points?.slice(-5) ?? []).map((point, index) => (
          <View
            key={`${point.label}-${index}`}
            style={[styles.sparkBar, { height: Math.max(6, Math.round((point.fluency / 100) * 34)) }]}
          />
        ))}
        {(!summary?.points || summary.points.length === 0) && (
          <View style={styles.emptySpark}>
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              size={16}
              tintColor={Brand.primary}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stripPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  left: {
    width: 52,
    alignItems: 'center',
  },
  coach: {
    width: 48,
    height: 48,
  },
  center: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: Brand.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: Brand.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  tip: {
    color: Brand.grayText,
    fontSize: 11,
    lineHeight: 15,
  },
  sparkWrap: {
    width: 46,
    height: 38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sparkBar: {
    width: 6,
    borderRadius: 4,
    backgroundColor: Brand.primary,
    opacity: 0.88,
  },
  emptySpark: {
    width: 46,
    height: 38,
    borderRadius: 8,
    backgroundColor: Brand.primaryBadgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

