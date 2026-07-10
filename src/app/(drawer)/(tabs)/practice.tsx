import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { CASE_STUDIES, CATEGORY_COLORS } from '@/constants/case-studies';
import { Brand, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export default function PracticeModesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + BottomTabInset + Spacing.two;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Practice Scenarios</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Choose your scenario</Text>
          <Text style={styles.heroSubtitle}>
            Select an AI-guided simulation to practice real-life conversations and get real-time feedback.
          </Text>
        </View>

        <View style={styles.grid}>
          {CASE_STUDIES.map((study) => {
            const cat = CATEGORY_COLORS[study.category];
            const isAdvanced = study.difficulty === 'Advanced';
            const diffColor = isAdvanced
              ? '#EF4444'
              : study.difficulty === 'Intermediate'
                ? '#F59E0B'
                : Brand.accentGreen;

            return (
              <Pressable
                key={study.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/session/${study.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Practice ${study.title}`}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.badgeText, { color: cat.text }]}>{cat.label}</Text>
                  </View>
                  <View style={styles.difficultyBadge}>
                    <View style={[styles.difficultyDot, { backgroundColor: diffColor }]} />
                    <Text style={styles.difficultyText}>{study.difficulty}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{study.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {study.description}
                </Text>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <View style={styles.metaRow}>
                    <SymbolView
                      name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                      size={14}
                      tintColor={Brand.grayText}
                    />
                    <Text style={styles.metaText}>{study.durationMin} mins</Text>
                  </View>

                  <View style={styles.startBtn}>
                    <Text style={styles.startBtnText}>Start Speaking</Text>
                    <SymbolView
                      name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                      size={12}
                      tintColor={Brand.primary}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.primaryDark,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Brand.grayText,
    lineHeight: 20,
  },
  grid: {
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 11,
    color: Brand.grayText,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginBottom: Spacing.one,
  },
  cardDesc: {
    fontSize: 13,
    color: Brand.grayText,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(76, 14, 158, 0.06)',
    marginBottom: Spacing.three,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.primaryBadgeBg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: Radius.md,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
  },
});
