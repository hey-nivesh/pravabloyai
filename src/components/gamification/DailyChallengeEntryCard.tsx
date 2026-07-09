import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ICON_SHIELD: SymbolName = { ios: 'shield.fill', android: 'shield', web: 'shield' };

export function DailyChallengeEntryCard() {
  const router = useRouter();
  const { challenge, loading } = useDailyChallenge();

  const tasks = challenge?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length || 5;

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <Skeleton height={100} borderRadius={Radius.xl} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/daily-challenge' as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Open daily challenge"
    >
      <View style={styles.left}>
        <Text style={styles.eyebrow}>Daily Challenge</Text>
        <Text style={styles.title}>Today&apos;s 5-Task Challenge</Text>
        <Text style={styles.subtitle}>
          {completedCount}/{totalCount} tasks completed
        </Text>
      </View>
      <View style={styles.badges}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>+50 XP</Text>
        </View>
        <View style={styles.shieldBadge}>
          <SymbolView name={ICON_SHIELD} size={12} tintColor={Brand.accentBlue} />
          <Text style={styles.shieldText}>Streak</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.three,
  },
  card: {
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Brand.primaryBadgeBg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  left: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '500',
  },
  badges: {
    gap: Spacing.one + 2,
    alignItems: 'flex-end',
  },
  xpBadge: {
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.primary,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.accentBlueBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  shieldText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.accentBlue,
  },
});
