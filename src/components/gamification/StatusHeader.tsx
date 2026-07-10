import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { getLexiconTierDisplayName } from '@/constants/lexiconTier';
import { getFirstName, useUserProfile, type UserProfileRow } from '@/hooks/useUserProfile';
import { useProgressSummary, type ProgressSummary } from '@/hooks/useProgressSummary';
import { useNotifications } from '@/hooks/useNotifications';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ICON_BELL: SymbolName = { ios: 'bell.fill', android: 'notifications', web: 'notifications' };
const ICON_MENU: SymbolName = { ios: 'line.horizontal.3', android: 'menu', web: 'menu' };

type StatusHeaderProps = {
  showMenu?: boolean;
  onMenuPress?: () => void;
  /** When provided (e.g. from HomeDataProvider), skips internal fetch skeletons. */
  profile?: UserProfileRow | null;
  userEmail?: string | null;
  progressSummary?: ProgressSummary | null;
};

export function StatusHeader({
  showMenu = true,
  onMenuPress,
  profile: profileProp,
  userEmail,
  progressSummary: summaryProp,
}: StatusHeaderProps) {
  const router = useRouter();
  const profileHook = useUserProfile();
  const summaryHook = useProgressSummary();
  const { unreadCount } = useNotifications();

  const useExternal = profileProp !== undefined;
  const profile = useExternal ? profileProp : profileHook.profile;
  const user = useExternal ? null : profileHook.user;
  const loading = useExternal ? false : profileHook.loading;
  const summary = summaryProp !== undefined ? summaryProp : summaryHook.summary;
  const tierLoading = summaryProp !== undefined ? false : summaryHook.loading;

  const firstName = getFirstName(profile, useExternal ? userEmail : user?.email);
  const streakCount = profile?.streak_count ?? 0;
  const level = profile?.xp_level ?? 1;
  const lexiconTier = getLexiconTierDisplayName(summary?.latest?.lexiconTier);

  const avatarSource = profile?.avatar_url
    ? { uri: profile.avatar_url }
    : require('@/assets/images/avatar.png');

  return (
    <View style={styles.header}>
      {showMenu ? (
        <Pressable
          onPress={onMenuPress}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <SymbolView name={ICON_MENU} size={18} tintColor={Brand.primaryDark} />
        </Pressable>
      ) : (
        <View style={styles.iconBtnSpacer} />
      )}

      <View style={styles.center}>
        <View style={styles.avatarBlock}>
          {loading ? (
            <Skeleton width={44} height={44} borderRadius={22} />
          ) : (
            <>
              <Image source={avatarSource} style={styles.avatar} contentFit="cover" />
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv. {level}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.greetingBlock}>
          {loading ? (
            <Skeleton width={120} height={16} borderRadius={Radius.sm} />
          ) : (
            <Text style={styles.greeting} numberOfLines={1}>
              Hi, {firstName}!
            </Text>
          )}
          <View style={styles.pillRow}>
            {tierLoading ? (
              <Skeleton width={100} height={22} borderRadius={Radius.md} />
            ) : (
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText} numberOfLines={1}>
                  {lexiconTier}
                </Text>
              </View>
            )}
            {loading ? (
              <Skeleton width={48} height={22} borderRadius={Radius.md} />
            ) : (
              <View style={styles.streakPill}>
                <Text style={styles.streakFlame}>🔥</Text>
                <Text style={styles.streakCount}>{streakCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/notifications' as never)}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <SymbolView name={ICON_BELL} size={18} tintColor={Brand.primaryDark} />
        {unreadCount > 0 && <View style={styles.bellDot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBtnSpacer: {
    width: 40,
  },
  iconBtnPressed: {
    opacity: 0.75,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.accentBlue,
    borderWidth: 1.5,
    borderColor: Brand.cardBg,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    overflow: 'hidden',
  },
  avatarBlock: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Brand.primaryLight,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: Brand.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: Brand.cardBg,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  greetingBlock: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    flexWrap: 'wrap',
  },
  tierPill: {
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    maxWidth: 140,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.accentOrangeLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    gap: 2,
  },
  streakFlame: {
    fontSize: 11,
  },
  streakCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.accentOrange,
  },
});
