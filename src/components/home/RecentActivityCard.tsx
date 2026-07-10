import { type ComponentProps } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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

/** Layout-validated against long scenario titles via maxWidth + numberOfLines. */
export function RecentActivityCard({ session }: RecentActivityCardProps) {
  const router = useRouter();

  if (session === null) {
    return <EmptyState />;
  }

  const icon = CATEGORY_ICON[session.category];
  const badgeBg = CATEGORY_COLOR[session.category];
  const iconColor = CATEGORY_ICON_COLOR[session.category];
  const durationMin = Math.ceil(session.durationSeconds / 60);
  const title = session.modeName;

  return (
    <View style={styles.cardOuter} accessibilityLabel="Recent activity">
      <View style={styles.activeCard}>
        <View style={styles.activeBody}>
          <View style={styles.activeTop}>
            <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
              <SymbolView name={icon} size={18} tintColor={iconColor} />
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingText}>● Live</Text>
            </View>
          </View>
          <Text style={styles.activeTitle} numberOfLines={3}>
            {title}
          </Text>
          <Text style={styles.activeMeta}>
            {formatRelativeDate(session.completedAt)} · {durationMin} min practice
          </Text>
        </View>

        <ExpoImage
          source={require('@/assets/images/coach-explaining.png')}
          style={styles.activeCoach}
          contentFit="contain"
          accessibilityLabel="Coach illustration"
        />

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.resumeBtnPressed]}
          onPress={() => {
            if (session.analyticsReportId) {
              router.push(`/analytics/${session.analyticsReportId}` as never);
            } else {
              router.push('/history' as never);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`View insights for ${session.modeName}`}
        >
          <SymbolView name={CHEVRON_ICON} size={16} tintColor={Brand.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  const router = useRouter();

  const micIcon: SymbolName = { ios: 'mic.fill', android: 'mic', web: 'mic' };

  return (
    <View
      style={styles.cardOuter}
      accessibilityLabel="No recent sessions — start your first session"
    >
      <View style={styles.emptyCard}>
        <ExpoImage
          source={require('@/assets/images/coach-resting.png')}
          style={styles.emptyCoach}
          contentFit="contain"
          accessibilityLabel="Coach resting in no recent sessions state"
        />
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
    </View>
  );
}

/** Loading skeleton matching the card dimensions */
export function RecentActivityCardSkeleton() {
  return (
    <View style={styles.cardOuter}>
      <View style={styles.card}>
        <Skeleton width={44} height={44} borderRadius={14} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={64} height={30} borderRadius={Radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    overflow: 'visible',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    ...Platform.select({
      ios: {
        elevation: 2,
      },
      default: {
        elevation: 0,
      },
    }),
  },
  card: {
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.26)',
      default: 'rgba(237,228,252,0.72)',
    }),
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Platform.select({
      ios: 'rgba(255,255,255,0.55)',
      default: 'rgba(255,255,255,0.75)',
    }),
    borderCurve: 'continuous',
  },
  activeCard: {
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.xl,
    padding: Spacing.three + 2,
    minHeight: 140,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
    position: 'relative',
  },
  activeCoach: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 130,
    zIndex: 2,
  },
  activeBody: {
    paddingRight: 72,
    paddingBottom: Spacing.one,
    gap: Spacing.one,
    zIndex: 1,
    position: 'relative',
    maxWidth: '72%',
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  ratingPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.accentGreen,
  },
  activeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.primaryDark,
    lineHeight: 22,
  },
  activeMeta: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: -6,
    bottom: -10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  emptyCard: {
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.26)',
      default: 'rgba(237,228,252,0.72)',
    }),
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Platform.select({
      ios: 'rgba(255,255,255,0.55)',
      default: 'rgba(255,255,255,0.75)',
    }),
    borderCurve: 'continuous',
  },
  emptyCoach: {
    width: 52,
    height: 52,
    marginRight: -Spacing.one,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBody: {
    flex: 1,
    gap: 3,
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
