import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { xpProgressInCurrentLevel } from '@/constants/xp';
import { getLexiconTierDisplayName } from '@/constants/lexiconTier';
import type { UserProfileRow } from '@/hooks/useUserProfile';

type XpProgressCardProps = {
  profile: UserProfileRow | null;
  lexiconTier?: string | null;
  loading?: boolean;
};

function buildMotivationalTip(
  streakCount: number,
  lexiconTier: string,
): string {
  const tierName = getLexiconTierDisplayName(lexiconTier);
  if (streakCount >= 7) {
    return `${streakCount} days strong — your ${tierName} streak is on fire!`;
  }
  if (streakCount >= 1) {
    return `10 minutes today keeps your ${tierName} streak alive.`;
  }
  return `Start a quick session to begin your ${tierName} journey.`;
}

export function XpProgressCard({ profile, lexiconTier, loading }: XpProgressCardProps) {
  const xpTotal = profile?.xp_total ?? 0;
  const { level, current, needed, percent } = xpProgressInCurrentLevel(xpTotal);
  const streakCount = profile?.streak_count ?? 0;
  const tip = buildMotivationalTip(streakCount, lexiconTier ?? 'Smart Starter');

  if (loading) {
    return (
      <View style={styles.card}>
        <Skeleton height={120} borderRadius={Radius.xl} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.levelLabel}>Level {level}</Text>
        <Text style={styles.xpLabel}>
          {current}/{needed} XP
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.tipRow}>
        <Image
          source={require('@/assets/images/coach-explaining.png')}
          style={styles.coachThumb}
          contentFit="cover"
        />
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.grayText,
  },
  track: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: '#F0F0F3',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(90deg, ${Brand.primaryLight} 0%, ${Brand.primary} 100%)`,
    backgroundColor: Brand.primary,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  coachThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Brand.primaryBadgeBg,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Brand.grayText,
    lineHeight: 17,
  },
});
