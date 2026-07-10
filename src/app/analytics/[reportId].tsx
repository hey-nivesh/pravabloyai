import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { supabase } from '@/lib/supabase';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { DetailedAnalysisReport } from '@/components/analytics/DetailedAnalysisReport';
import type { AnalyticsReport, SessionAnalysisPayload } from '@/services/analysis';

export default function AnalyticsReportScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('analytics_reports')
          .select('*')
          .eq('id', reportId)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        if (mounted) setReport(data as AnalyticsReport);
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load report.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  const analysis = (report?.full_report ?? null) as SessionAnalysisPayload | null;
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} tintColor={Brand.primaryDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics Report</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        {loading && <Text style={styles.text}>Loading report...</Text>}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && report && (
          <DetailedAnalysisReport report={report} analysis={analysis} />
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
    justifyContent: 'space-between',
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
  headerTitle: { color: Brand.primaryDark, fontSize: 18, fontWeight: '700' },
  content: { padding: Spacing.four, gap: Spacing.three },
  text: { color: Brand.grayText, textAlign: 'center' },
  errorText: { color: '#EF4444', textAlign: 'center' },
});
