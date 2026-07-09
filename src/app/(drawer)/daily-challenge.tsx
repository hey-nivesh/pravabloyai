import { type ComponentProps, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GamificationScreenHeader } from '@/components/gamification/GamificationScreenHeader';
import { SparkleBurst } from '@/components/gamification/SparkleBurst';
import { Skeleton } from '@/components/home/Skeleton';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  useDailyChallenge,
  type DailyChallengeTask,
} from '@/hooks/useDailyChallenge';
import { useUserProfile } from '@/hooks/useUserProfile';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ICON_SHIELD: SymbolName = { ios: 'shield.fill', android: 'shield', web: 'shield' };

function taskIcon(task: DailyChallengeTask): { icon: SymbolName; bg: string; color: string } {
  switch (task.type) {
    case 'voice_session':
      return {
        icon: { ios: 'mic.fill', android: 'mic', web: 'mic' },
        bg: Brand.primaryBadgeBg,
        color: Brand.primary,
      };
    case 'vocab_review':
      return {
        icon: { ios: 'books.vertical.fill', android: 'book', web: 'book' },
        bg: Brand.accentGreenLight,
        color: Brand.accentGreen,
      };
    case 'grammar_check':
    default:
      return {
        icon: { ios: 'text.magnifyingglass', android: 'spellcheck', web: 'spellcheck' },
        bg: Brand.accentAmberBg,
        color: Brand.accentAmber,
      };
  }
}

function taskRoute(task: DailyChallengeTask): string {
  switch (task.type) {
    case 'voice_session':
      return '/practice';
    case 'vocab_review':
      return '/vocab';
    case 'grammar_check':
      return '/practice';
    default:
      return '/practice';
  }
}

function SegmentBar({ completed, total }: { completed: number; total: number }) {
  return (
    <View style={styles.segmentRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.segment, i < completed ? styles.segmentDone : styles.segmentPending]}
        />
      ))}
    </View>
  );
}

export default function DailyChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge, loading, error } = useDailyChallenge();
  const { refetch: refetchProfile } = useUserProfile();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const tasks = challenge?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length || 5;

  useEffect(() => {
    if (challenge?.completed && !celebrated) {
      setShowCelebration(true);
      setCelebrated(true);
      void refetchProfile();
    }
  }, [challenge?.completed, celebrated, refetchProfile]);

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={{ paddingTop: topPadding }}>
        <GamificationScreenHeader title="Daily Challenge" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.heroCard}>
            <Image
              source={require('@/assets/images/coach-explaining.png')}
              style={styles.heroCoach}
              contentFit="contain"
            />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Today&apos;s 5-Task Challenge</Text>
              <Text style={styles.heroDesc}>
                Complete all tasks to earn bonus XP and streak protection for today.
              </Text>
              <View style={styles.rewardRow}>
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>+{challenge?.xp_reward ?? 50} XP</Text>
                </View>
                <View style={styles.shieldPill}>
                  <SymbolView name={ICON_SHIELD} size={13} tintColor={Brand.accentBlue} />
                  <Text style={styles.shieldPillText}>Streak Protection</Text>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <Skeleton height={24} borderRadius={Radius.md} />
          ) : (
            <>
              <Text style={styles.progressLabel}>
                {completedCount}/{totalCount} Tasks Completed
              </Text>
              <SegmentBar completed={completedCount} total={totalCount} />
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.sectionTitle}>Today&apos;s Challenges</Text>

          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={72} borderRadius={Radius.lg} style={{ marginBottom: Spacing.two }} />
              ))
            : tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => {
                    if (!task.completed) {
                      router.push(taskRoute(task) as never);
                    }
                  }}
                />
              ))}

          {showCelebration && (
            <View style={styles.celebrationOverlay}>
              <SparkleBurst onComplete={() => setShowCelebration(false)} />
              <Image
                source={require('@/assets/images/coach-celebrating.png')}
                style={styles.celebrationCoach}
                contentFit="contain"
              />
              <Text style={styles.celebrationTitle}>Challenge Complete!</Text>
              <Text style={styles.celebrationSub}>
                +{challenge?.xp_reward ?? 50} XP earned · Streak protected
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TaskCard({ task, onPress }: { task: DailyChallengeTask; onPress: () => void }) {
  const { icon, bg, color } = taskIcon(task);
  const checkIcon: SymbolName = task.completed
    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
    : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' };

  return (
    <Pressable
      onPress={onPress}
      disabled={task.completed}
      style={({ pressed }) => [styles.taskCard, pressed && !task.completed && styles.taskPressed]}
    >
      <View style={[styles.taskIconBadge, { backgroundColor: bg }]}>
        <SymbolView name={icon} size={18} tintColor={color} />
      </View>
      <View style={styles.taskBody}>
        <Text style={styles.taskLabel}>{task.label}</Text>
        <Text style={styles.taskProgress}>
          {task.progress}/{task.target}
        </Text>
      </View>
      <SymbolView
        name={checkIcon}
        size={24}
        tintColor={task.completed ? Brand.accentGreen : Brand.grayText}
      />
    </Pressable>
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
  content: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroCoach: {
    width: 88,
    height: 100,
  },
  heroText: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  heroDesc: {
    fontSize: 13,
    color: Brand.grayText,
    lineHeight: 18,
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  xpPill: {
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
  },
  xpPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.primary,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.accentBlueBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
  },
  shieldPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.accentBlue,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.grayText,
    textAlign: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: Radius.full,
    maxWidth: 56,
  },
  segmentDone: {
    backgroundColor: Brand.primary,
  },
  segmentPending: {
    backgroundColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginTop: Spacing.one,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two + 2,
    marginBottom: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  taskPressed: {
    opacity: 0.9,
  },
  taskIconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBody: {
    flex: 1,
    gap: 2,
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.primaryDark,
  },
  taskProgress: {
    fontSize: 12,
    color: Brand.grayText,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  celebrationOverlay: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
    position: 'relative',
    minHeight: 180,
    justifyContent: 'center',
  },
  celebrationCoach: {
    width: 120,
    height: 140,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  celebrationSub: {
    fontSize: 14,
    color: Brand.grayText,
    fontWeight: '500',
  },
});
