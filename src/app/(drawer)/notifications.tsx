import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';

import { GamificationScreenHeader } from '@/components/gamification/GamificationScreenHeader';
import { Skeleton } from '@/components/home/Skeleton';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function iconForType(type: string): { emoji: string; bg: string } {
  if (type.includes('level')) return { emoji: '⭐', bg: Brand.primaryBadgeBg };
  if (type.includes('streak')) return { emoji: '🔥', bg: Brand.accentOrangeLight };
  if (type.includes('daily')) return { emoji: '🎯', bg: Brand.accentGreenLight };
  if (type.includes('journey')) return { emoji: '🗺️', bg: Brand.accentBlueBg };
  if (type.includes('session')) return { emoji: '🎙️', bg: Brand.primaryBadgeBg };
  return { emoji: '🏆', bg: Brand.accentAmberBg };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, loading, error, markAllRead } = useNotifications();

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  useFocusEffect(
    React.useCallback(() => {
      if (notifications.some((n) => !n.read)) {
        void markAllRead();
      }
    }, [notifications, markAllRead]),
  );

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={{ paddingTop: topPadding }}>
        <GamificationScreenHeader title="Notifications" showBell={false} />
      </View>

      {loading ? (
        <View style={styles.listPad}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={72} borderRadius={Radius.lg} style={{ marginBottom: Spacing.two }} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={require('@/assets/images/coach-resting.png')}
            style={styles.emptyCoach}
            contentFit="contain"
          />
          <Text style={styles.emptyTitle}>No achievements yet</Text>
          <Text style={styles.emptyDesc}>
            Complete sessions, daily challenges, and journey milestones to unlock notifications here.
          </Text>
          <Pressable onPress={() => router.push('/practice' as never)} style={styles.cta}>
            <Text style={styles.ctaText}>Start Practicing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listPad, { paddingBottom: insets.bottom + Spacing.four }]}
          renderItem={({ item }) => {
            const { emoji, bg } = iconForType(item.type);
            return (
              <View style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={[styles.iconBadge, { backgroundColor: bg }]}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBodyText}>{item.body}</Text>
                  <Text style={styles.cardTime}>{formatWhen(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgGradientStart },
  gradientBg: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  listPad: {
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    flexDirection: 'row',
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
  cardUnread: {
    borderWidth: 1,
    borderColor: Brand.primaryBadgeBg,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 20 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  cardBodyText: {
    fontSize: 13,
    color: Brand.grayText,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: Brand.grayText,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyCoach: { width: 120, height: 140 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  emptyDesc: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: Spacing.two,
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  ctaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: { color: '#DC2626', fontSize: 14 },
});
