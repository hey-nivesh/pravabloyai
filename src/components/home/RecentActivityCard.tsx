import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { VoiceSession } from '@/hooks/use-recent-session';
import { formatRelativeDate } from '@/hooks/use-recent-session';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type RecentActivityCardProps = {
  session: VoiceSession | null;
};

const CATEGORY_ICON: Record<VoiceSession['category'], SymbolName> = {
  casual: { ios: 'bubble.left.and.bubble.right', android: 'chat_bubble', web: 'chat' },
  executive: { ios: 'briefcase', android: 'work', web: 'work' },
  interview: { ios: 'person.crop.rectangle', android: 'badge', web: 'badge' },
};

const CATEGORY_COLOR: Record<VoiceSession['category'], string> = {
  casual: Brand.accentBlueBg,
  executive: Brand.primaryBadgeBg,
  interview: Brand.accentAmberBg,
};

const CATEGORY_ICON_COLOR: Record<VoiceSession['category'], string> = {
  casual: Brand.accentBlue,
  executive: Brand.primary,
  interview: Brand.accentAmber,
};

const CHEVRON_ICON: SymbolName = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
};

/**
 * Shows the most recent voice session as a horizontal card.
 * If no session exists (first-time user), renders a friendly empty state
 * encouraging them to start their first session.
 */
export function RecentActivityCard({ session }: RecentActivityCardProps) {
  const router = useRouter();

  if (session === null) {
    return <EmptyState />;
  }

  const icon = CATEGORY_ICON[session.category];
  const badgeBg = CATEGORY_COLOR[session.category];
  const iconColor = CATEGORY_ICON_COLOR[session.category];
  const durationMin = Math.ceil(session.durationSeconds / 60);

  return (
    <View style={styles.card} accessibilityLabel="Recent activity">
      <View style={styles.left}>
        <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
          <SymbolView name={icon} size={20} tintColor={iconColor} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.modeName} numberOfLines={1}>
          {session.modeName}
        </Text>
        <Text style={styles.meta}>
          {formatRelativeDate(session.completedAt)} · {durationMin} min
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumeBtnPressed]}
        onPress={() => router.push(`/analytics/${session.analyticsReportId}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`Resume insights for ${session.modeName}`}
      >
        <Text style={styles.resumeLabel}>Insights</Text>
        <SymbolView name={CHEVRON_ICON} size={11} tintColor={Brand.primary} />
      </Pressable>
    </View>
  );
}

function EmptyState() {
  const router = useRouter();

  const micIcon: SymbolName = { ios: 'mic.fill', android: 'mic', web: 'mic' };

  return (
    <View
      style={styles.emptyCard}
      accessibilityLabel="No recent sessions — start your first session"
    >
      <View style={[styles.iconBadge, { backgroundColor: Brand.primaryBadgeBg }]}>
        <SymbolView name={micIcon} size={22} tintColor={Brand.primary} />
      </View>

      <View style={styles.emptyBody}>
        <Text style={styles.emptyHeading}>Start your first session!</Text>
        <Text style={styles.emptySubtext}>
          Your practice history will appear here after your first conversation.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumeBtnPressed]}
        onPress={() => router.push('/practice' as never)}
        accessibilityRole="button"
        accessibilityLabel="Go to practice — start your first session"
      >
        <Text style={styles.resumeLabel}>Begin</Text>
        <SymbolView name={CHEVRON_ICON} size={11} tintColor={Brand.primary} />
      </Pressable>
    </View>
  );
}

/** Loading skeleton matching the card dimensions */
export function RecentActivityCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={14} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={64} height={30} borderRadius={Radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyCard: {
    marginHorizontal: Spacing.three,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: Brand.primaryBadgeBg,
    borderStyle: 'dashed',
  },
  left: {
    flexShrink: 0,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  emptyBody: {
    flex: 1,
    gap: 3,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  meta: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '500',
  },
  emptyHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  emptySubtext: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '400',
    lineHeight: 17,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
  },
  resumeBtnPressed: {
    opacity: 0.75,
  },
  resumeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
  },
});
