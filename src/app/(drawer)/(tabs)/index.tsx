import { type ComponentProps, useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BentoGrid } from '@/components/home/BentoGrid';
import { BentoTile } from '@/components/home/BentoTile';
import { HeroBanner } from '@/components/home/HeroBanner';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { HomeScreenSkeleton } from '@/components/home/HomeScreenSkeleton';
import { HomeStatsRow } from '@/components/home/HomeStatsRow';
import { RecentActivityCard } from '@/components/home/RecentActivityCard';
import { TodayGoalsCard } from '@/components/home/TodayGoalsCard';
import { DailyChallengeEntryCard } from '@/components/gamification/DailyChallengeEntryCard';
import { JourneyMapEntryCard } from '@/components/gamification/JourneyMapEntryCard';
import { StatusHeader } from '@/components/gamification/StatusHeader';
import { Brand, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHomeData } from '@/context/home-data-context';
import { useVoiceStart } from '@/context/voice-start-context';
import { getFirstName } from '@/hooks/useUserProfile';

type SymbolName = ComponentProps<typeof BentoTile>['icon'];

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
    id: 'progress',
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

export default function HomeScreen() {
  const router = useRouter();
  const drawerNavigation = useNavigation('/(drawer)');
  const insets = useSafeAreaInsets();
  const {
    ready,
    userEmail,
    profile,
    recentSession,
    dailyChallenge,
    progressSummary,
    minutesToday,
    totalMinutes,
    sessionsCompleted,
  } = useHomeData();
  const { setScenarioCaseStudyId } = useVoiceStart();

  const firstName = getFirstName(profile, userEmail) || 'there';
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const bottomPadding = insets.bottom + BottomTabInset + Spacing.two;

  useEffect(() => {
    if (recentSession?.caseStudyId) {
      setScenarioCaseStudyId(recentSession.caseStudyId);
    } else {
      setScenarioCaseStudyId(null);
    }
  }, [recentSession?.caseStudyId, setScenarioCaseStudyId]);

  const openDrawer = () => {
    if (
      'openDrawer' in drawerNavigation &&
      typeof drawerNavigation.openDrawer === 'function'
    ) {
      drawerNavigation.openDrawer();
    }
  };

  if (!ready) {
    return (
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />
        <View style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
          <HomeScreenSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
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
          <StatusHeader
            showMenu
            onMenuPress={openDrawer}
            profile={profile}
            userEmail={userEmail}
            progressSummary={progressSummary}
          />

          <HomeGreeting firstName={firstName} />

          <HeroBanner
            greetingName={firstName}
            onStartPress={() => router.push('/practice' as never)}
          />

          <TodayGoalsCard
            minutesToday={minutesToday}
            streakCount={profile?.streak_count ?? 0}
            xpTotal={profile?.xp_total ?? 0}
          />

          <HomeStatsRow totalMinutes={totalMinutes} sessionsCompleted={sessionsCompleted} />

          <DailyChallengeEntryCard challenge={dailyChallenge} />
          <JourneyMapEntryCard />

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

          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Active Practice</Text>
            <RecentActivityCard session={recentSession} />
          </View>
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
  scroll: { flex: 1 },
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
