import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export interface CaseStudy {
  id: string;
  title: string;
  category: 'casual' | 'executive' | 'interview';
  description: string;
  contextLine: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMin: number;
  suggestions: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'salary-negotiation',
    title: 'Salary Negotiation',
    category: 'executive',
    description: 'Practice negotiating your base salary increment with your manager using professional and diplomatic framing.',
    contextLine: 'Salary review session with the VP of Engineering',
    difficulty: 'Advanced',
    durationMin: 10,
    suggestions: ['market benchmark', 'increased scope of impact', 'achievements aligned with goals', 'competitive compensation'],
  },
  {
    id: 'ordering-coffee',
    title: 'Ordering at a Cafe',
    category: 'casual',
    description: 'Practice making orders at a busy NYC cafe, asking for custom milk/espresso preferences, and friendly small talk.',
    contextLine: 'Ordering from a high-paced barista',
    difficulty: 'Beginner',
    durationMin: 5,
    suggestions: ['double shot espresso', 'oat milk flat white', 'extra hot', 'keep the change'],
  },
  {
    id: 'system-design',
    title: 'System Design Interview',
    category: 'interview',
    description: 'A mock technical interview simulating a staff engineer discussion on database sharding, caching, and horizontal scaling.',
    contextLine: 'Staff Engineer system design interview loop',
    difficulty: 'Advanced',
    durationMin: 15,
    suggestions: ['horizontal scaling', 'cache eviction policy', 'single point of failure', 'read replica database'],
  },
  {
    id: 'hotel-checkin',
    title: 'Hotel Check-In',
    category: 'casual',
    description: 'Confirm a booking, request a room upgrade, and ask for local tourist recommendations at a boutique hotel reception.',
    contextLine: 'Boutique hotel front desk arrival',
    difficulty: 'Intermediate',
    durationMin: 7,
    suggestions: ['room upgrade options', 'booking confirmation', 'complimentary breakfast', 'local attractions'],
  }
];

const CATEGORY_COLORS = {
  casual: { bg: Brand.accentBlueBg, text: Brand.accentBlue, label: 'Casual Chat' },
  executive: { bg: Brand.primaryBadgeBg, text: Brand.primary, label: 'Executive Meeting' },
  interview: { bg: Brand.accentAmberBg, text: Brand.accentAmber, label: 'Mock Interview' },
};

export default function PracticeModesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + Spacing.five;

  return (
    <View style={styles.root}>
      {/* Soft gradient background */}
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      {/* Header */}
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
        <Text style={styles.headerTitle}>Practice Scenarios</Text>
        <View style={{ width: 40 }} />
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
            const diffColor = isAdvanced ? '#EF4444' : study.difficulty === 'Intermediate' ? '#F59E0B' : Brand.accentGreen;

            return (
              <Pressable
                key={study.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/session/${study.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Practice ${study.title}`}
              >
                {/* Header info */}
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.badgeText, { color: cat.text }]}>{cat.label}</Text>
                  </View>
                  <View style={styles.difficultyBadge}>
                    <View style={[styles.difficultyDot, { backgroundColor: diffColor }]} />
                    <Text style={styles.difficultyText}>{study.difficulty}</Text>
                  </View>
                </View>

                {/* Body */}
                <Text style={styles.cardTitle}>{study.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {study.description}
                </Text>

                <View style={styles.divider} />

                {/* Footer details */}
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
