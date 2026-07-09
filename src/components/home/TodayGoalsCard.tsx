import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';

export const DAILY_GOAL_MINUTES = 20;

type TodayGoalsCardProps = {
  minutesToday: number;
  streakCount: number;
  xpTotal: number;
  loading?: boolean;
};

function CircularProgress({ minutes, goal }: { minutes: number; goal: number }) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, minutes / goal);
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EDE9FE"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Brand.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringMinutes}>{Math.round(minutes)}</Text>
        <Text style={styles.ringUnit}>min</Text>
      </View>
    </View>
  );
}

export function TodayGoalsCard({
  minutesToday,
  streakCount,
  xpTotal,
  loading,
}: TodayGoalsCardProps) {
  const goalMet = minutesToday >= DAILY_GOAL_MINUTES;

  if (loading) {
    return (
      <View style={styles.outer}>
        <Skeleton height={180} borderRadius={Radius.xl} />
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today Goals</Text>
        <Text style={styles.headerMeta}>
          {Math.round(minutesToday)} / {DAILY_GOAL_MINUTES} mins
        </Text>
      </View>

      <View style={styles.body}>
        <CircularProgress minutes={minutesToday} goal={DAILY_GOAL_MINUTES} />

        <View style={styles.statsCol}>
          <View style={styles.statBlock}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streakCount}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{xpTotal}</Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>
        </View>
      </View>

      <View style={[styles.banner, goalMet && styles.bannerSuccess]}>
        <Text style={[styles.bannerText, goalMet && styles.bannerTextSuccess]}>
          {goalMet
            ? "Great job! You've completed your goal."
            : `${DAILY_GOAL_MINUTES - Math.round(minutesToday)} more minutes to hit today's goal.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Brand.cardBg,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Brand.primaryDark,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  ringWrap: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringMinutes: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.primaryDark,
    lineHeight: 26,
  },
  ringUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.grayText,
  },
  statsCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E5E7EB',
  },
  statEmoji: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.grayText,
  },
  banner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  bannerSuccess: {
    backgroundColor: Brand.accentGreenLight,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.primary,
    textAlign: 'center',
  },
  bannerTextSuccess: {
    color: Brand.accentGreen,
  },
});
