import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { supabase } from '@/lib/supabase';
import { Brand, Radius, Spacing } from '@/constants/theme';

function deriveApiBaseUrl() {
  const gatewayUrl = process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://api.pravabloy.ai/ws/voice-session';
  if (gatewayUrl.startsWith('wss://')) return gatewayUrl.replace('wss://', 'https://').replace('/ws/voice-session', '');
  if (gatewayUrl.startsWith('ws://')) return gatewayUrl.replace('ws://', 'http://').replace('/ws/voice-session', '');
  return gatewayUrl.replace('/ws/voice-session', '');
}

export default function AnalyticsReportScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('No active user session.');
        const response = await fetch(`${deriveApiBaseUrl()}/api/analytics/report/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Failed to load report');
        if (mounted) setReport(payload.report);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load report.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  const full = report?.full_report ?? {};
  const summary = full.overall_evaluation ?? report?.vocab_feedback ?? 'No summary available.';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : insets.top + Spacing.two }]}>
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
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <Text style={styles.text}>Loading report...</Text>}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && (
          <View style={styles.card}>
            <Text style={styles.score}>{Math.round(Number(report?.fluency_score ?? report?.score ?? 0))}%</Text>
            <Text style={styles.sectionTitle}>Coach Summary</Text>
            <Text style={styles.text}>{summary}</Text>
          </View>
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
  content: { padding: Spacing.four },
  card: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.14)',
  },
  score: { color: Brand.primaryDark, fontSize: 38, fontWeight: '800' },
  sectionTitle: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700', marginTop: Spacing.two },
  text: { color: Brand.grayText, lineHeight: 20, marginTop: Spacing.one },
  errorText: { color: '#EF4444' },
});

