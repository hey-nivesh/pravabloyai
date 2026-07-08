import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter, useNavigation } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerNavigationProp } from '@react-navigation/drawer';

import { BentoGrid } from '@/components/home/BentoGrid';
import { BentoTile } from '@/components/home/BentoTile';
import { HeroBanner } from '@/components/home/HeroBanner';
import { RecentActivityCard, RecentActivityCardSkeleton } from '@/components/home/RecentActivityCard';
import { Skeleton } from '@/components/home/Skeleton';
import { StreakBadge } from '@/components/home/StreakBadge';
import { WeeklyProgressStrip } from '@/components/home/WeeklyProgressStrip';
import { Brand, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProgressSummary } from '@/hooks/useProgressSummary';
import { useUserProfile, getFirstName } from '@/hooks/useUserProfile';
import { useRecentSession } from '@/hooks/use-recent-session';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// ─── Icon constants (typed to avoid inference errors) ────────────────────────

const ICON_MENU: SymbolName = { ios: 'line.horizontal.3', android: 'menu', web: 'menu' };
const ICON_BELL: SymbolName = { ios: 'bell.fill', android: 'notifications', web: 'notifications' };

// ─── Practice Modes data ─────────────────────────────────────────────────────

const PRACTICE_MODES: ReadonlyArray<{
  id: string;
  label: string;
  icon: SymbolName;
  iconBgColor: string;
  iconColor: string;
  href: string;
}> = [
  {
    id: 'casual',
    label: 'Casual\nChats',
    icon: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat_bubble', web: 'chat' },
    iconBgColor: Brand.accentBlueBg,
    iconColor: Brand.accentBlue,
    href: '/practice?category=casual',
  },
  {
    id: 'executive',
    label: 'Executive\nMeetings',
    icon: { ios: 'briefcase.fill', android: 'work', web: 'work' },
    iconBgColor: Brand.primaryBadgeBg,
    iconColor: Brand.primary,
    href: '/practice?category=executive',
  },
  {
    id: 'interview',
    label: 'Mock\nInterviews',
    icon: { ios: 'person.crop.rectangle.fill', android: 'badge', web: 'badge' },
    iconBgColor: Brand.accentAmberBg,
    iconColor: Brand.accentAmber,
    href: '/practice?category=interview',
  },
];

// ─── Your Tools data ─────────────────────────────────────────────────────────

const YOUR_TOOLS: ReadonlyArray<{
  id: string;
  label: string;
  icon: SymbolName;
  iconBgColor: string;
  iconColor: string;
  href: string;
}> = [
  {
    id: 'vocab',
    label: 'Vocab Vault',
    icon: { ios: 'books.vertical.fill', android: 'book', web: 'book' },
    iconBgColor: Brand.accentGreenLight,
    iconColor: Brand.accentGreen,
    href: '/vocab',
  },
  {
    id: 'progress Report',
    label: 'Progress Report',
    icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
    iconBgColor: Brand.primaryBadgeBg,
    iconColor: Brand.primary,
    href: '/progress',
  },
  {
    id: 'analytics',
    label: 'Analytics Report',
    icon: { ios: 'doc.text.magnifyingglass', android: 'analytics', web: 'analytics' },
    iconBgColor: Brand.accentAmberBg,
    iconColor: Brand.accentAmber,
    href: '/analytics',
  },
  {
    id: 'history',
    label: 'History',
    icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
    iconBgColor: Brand.accentBlueBg,
    iconColor: Brand.accentBlue,
    href: '/history',
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: { ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' },
    iconBgColor: Brand.primaryBadgeBg,
    iconColor: Brand.primary,
    href: '/practice',
  },
  {
    id: 'help',
    label: 'Help Center',
    icon: { ios: 'questionmark.circle', android: 'help', web: 'help' },
    iconBgColor: Brand.accentGreenLight,
    iconColor: Brand.accentGreen,
    href: '/help',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user, profile, loading: isUserLoading } = useUserProfile();
  const sessionResult = useRecentSession();
  const { loading: progressLoading, summary: progressSummary, error: progressError } = useProgressSummary();

  const firstName = getFirstName(profile, user?.email) || 'there';
  const streakCount = profile?.streak_count ?? 0;

  // Android handles its own top inset via system bars — apply it manually on Android only.
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + BottomTabInset + Spacing.five;

  return (
    <View style={styles.root}>
      {/* Soft purple-to-white gradient background */}
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>

          {/* ── 1. Header ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            {/* Hamburger / menu icon */}
            <Pressable
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <SymbolView name={ICON_MENU} size={18} tintColor={Brand.primaryDark} />
            </Pressable>

            {/* Logo mark + greeting */}
            <View style={styles.logoGreeting}>
              <Image
                source={require('@/assets/images/avatar.png')}
                style={styles.logoMark}
                contentFit="contain"
                accessibilityLabel="PravabloyAI logo"
              />
              {isUserLoading ? (
                <Skeleton width={100} height={16} borderRadius={Radius.sm} />
              ) : (
                <Text style={styles.greeting} numberOfLines={1}>
                  Hi, {firstName} 👋
                </Text>
              )}
            </View>

            {/* Streak badge + notification bell */}
            <View style={styles.rightActions}>
              {isUserLoading ? (
                <Skeleton width={56} height={28} borderRadius={Radius.md} />
              ) : (
                <StreakBadge count={streakCount} />
              )}

              <Pressable
                onPress={() => router.push('/notifications' as never)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <SymbolView name={ICON_BELL} size={18} tintColor={Brand.primaryDark} />
              </Pressable>
            </View>
          </View>

          {/* ── 2. Hero Banner ──────────────────────────────────────────── */}
          {isUserLoading ? (
            <View style={styles.heroSkeletonWrapper}>
              <Skeleton height={172} borderRadius={Radius.xl} />
            </View>
          ) : (
            <HeroBanner
              greetingName={firstName}
              onStartPress={() => router.push('/practice' as never)}
            />
          )}

          <WeeklyProgressStrip
            loading={progressLoading}
            summary={progressSummary}
            error={progressError}
          />

          {/* ── 3. Practice Modes bento grid ────────────────────────────── */}
          <BentoGrid title="Practice Modes" seeAllHref="/practice" expandInline={false}>
            {PRACTICE_MODES.map((mode) => (
              <BentoTile
                key={mode.id}
                icon={mode.icon}
                iconBgColor={mode.iconBgColor}
                iconColor={mode.iconColor}
                label={mode.label}
                onPress={() => router.push(mode.href as never)}
                accessibilityLabel={`${mode.label.replace('\n', ' ')} practice mode`}
              />
            ))}
          </BentoGrid>

          {/* ── 4. Your Tools bento grid ────────────────────────────────── */}
          <BentoGrid title="Your Tools" seeAllHref="/tools" collapsedCount={3} expandInline>
            {YOUR_TOOLS.map((tool) => (
              <BentoTile
                key={tool.id}
                icon={tool.icon}
                iconBgColor={tool.iconBgColor}
                iconColor={tool.iconColor}
                label={tool.label}
                onPress={() => router.push(tool.href as never)}
                accessibilityLabel={`${tool.label.replace('\n', ' ')} tool`}
              />
            ))}
          </BentoGrid>

          {/* ── 5. Continue / Recent Activity ───────────────────────────── */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Continue</Text>
            {sessionResult.status === 'loading' ? (
              <RecentActivityCardSkeleton />
            ) : (
              <RecentActivityCard session={sessionResult.session} />
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    // Same technique as animated-icon.tsx already in this project (RN 0.76+ / Expo SDK 57)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBtnPressed: {
    opacity: 0.75,
  },
  logoGreeting: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginLeft: Spacing.one,
    overflow: 'hidden',
  },
  logoMark: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.primaryDark,
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },

  // ── Hero skeleton ──────────────────────────────────────────────────────────
  heroSkeletonWrapper: {
    marginHorizontal: Spacing.three,
  },

  // ── Continue section ───────────────────────────────────────────────────────
  recentSection: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
    letterSpacing: -0.2,
    paddingHorizontal: Spacing.three,
  },
});
