import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';

import { GamificationScreenHeader } from '@/components/gamification/GamificationScreenHeader';
import { Skeleton } from '@/components/home/Skeleton';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getCaseStudyLabel, useSessionHistory } from '@/hooks/use-session-history';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const MODE_LABELS: Record<string, string> = {
  casual: 'Casual',
  executive: 'Executive',
  mock_interview: 'Interview',
  formal: 'Formal',
};

export default function SessionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions, loading, error } = useSessionHistory();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={{ paddingTop: topPadding }}>
        <GamificationScreenHeader title="Session History" showBell={false} />
      </View>

      {loading ? (
        <View style={styles.listPad}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={88} borderRadius={Radius.lg} style={{ marginBottom: Spacing.two }} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={require('@/assets/images/coach-resting.png')}
            style={styles.emptyCoach}
            contentFit="contain"
          />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyDesc}>
            Your completed voice practice sessions will appear here with duration and insights.
          </Text>
          <Pressable onPress={() => router.push('/practice' as never)} style={styles.cta}>
            <Text style={styles.ctaText}>Start Your First Session</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listPad, { paddingBottom: insets.bottom + Spacing.four }]}
          renderItem={({ item }) => {
            const mins = Math.max(1, Math.ceil(item.durationSeconds / 60));
            const label = getCaseStudyLabel(item.caseStudyId);
            const modeLabel = MODE_LABELS[item.mode] ?? item.mode;

            return (
              <Pressable
                onPress={() => {
                  if (item.analyticsReportId) {
                    router.push(`/analytics/${item.analyticsReportId}` as never);
                  }
                }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.modePill}>
                    <Text style={styles.modePillText}>{modeLabel}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {formatDate(item.completedAt)} · {mins} min · {item.turnCount} turns
                </Text>
                {item.analyticsReportId ? (
                  <View style={styles.insightsRow}>
                    <Text style={styles.insightsText}>View fluency insights</Text>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={12}
                      tintColor={Brand.primary}
                    />
                  </View>
                ) : (
                  <Text style={styles.pendingText}>Analysis pending</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgGradientStart },
  gradientBg: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  listPad: {
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  modePill: {
    backgroundColor: Brand.primaryBadgeBg,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.md,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.primary,
  },
  meta: {
    fontSize: 12,
    color: Brand.grayText,
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  insightsText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
  },
  pendingText: {
    fontSize: 12,
    color: Brand.grayText,
    fontStyle: 'italic',
    marginTop: Spacing.one,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyCoach: { width: 120, height: 140 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  emptyDesc: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: Spacing.two,
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: { color: '#DC2626', fontSize: 14 },
});
