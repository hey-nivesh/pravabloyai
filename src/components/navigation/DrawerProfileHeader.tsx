import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { Skeleton } from '@/components/home/Skeleton';
import type { UserProfileRow } from '@/hooks/useUserProfile';

// ─── Props ────────────────────────────────────────────────────────────────────

type DrawerProfileHeaderProps = {
  /** The public.users profile row — null while loading */
  profile: UserProfileRow | null;
  /** Auth user email — used as fallback display */
  email: string | null | undefined;
  /** True while useUserProfile is still loading */
  loading: boolean;
  /** Called when the whole header is pressed */
  onPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawerProfileHeader({
  profile,
  email,
  loading,
  onPress,
}: DrawerProfileHeaderProps) {
  // ── Skeleton state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton width={64} height={64} borderRadius={32} style={{ marginRight: Spacing.three }} />
        <View style={styles.infoWrapper}>
          <Skeleton width={120} height={17} borderRadius={Radius.sm} style={{ marginBottom: Spacing.half }} />
          <Skeleton width={160} height={12} borderRadius={Radius.sm} style={{ marginBottom: Spacing.one }} />
          <Skeleton width={72} height={20} borderRadius={Spacing.one + 2} />
        </View>
      </View>
    );
  }

  // ── Derived display values ──────────────────────────────────────────────
  const rawName = profile?.full_name ?? '';
  const displayName = rawName
    ? rawName.split(' ')[0]
    : email?.split('@')[0] ?? 'Learner';

  const displayEmail = email ?? 'learner@example.com';
  const isPro = profile?.subscription_tier === 'pro';
  const planLabel = isPro ? 'Pro Member' : 'Free Plan';

  const avatarSource = profile?.avatar_url
    ? { uri: profile.avatar_url }
    : require('@/assets/images/avatar.png');

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`View profile for ${displayName}. Current tier: ${planLabel}`}
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={avatarSource}
          style={styles.avatar}
          contentFit="cover"
        />
      </View>

      <View style={styles.infoWrapper}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {displayEmail}
        </Text>
        <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
          <Text style={[styles.badgeText, isPro ? styles.badgeTextPro : styles.badgeTextFree]}>
            {planLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.four + 8,
    backgroundColor: Brand.cardBg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: Spacing.three,
  },
  pressed: {
    opacity: 0.9,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Brand.primaryLight,
    padding: 2,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  infoWrapper: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  email: {
    fontSize: 12,
    color: Brand.grayText,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.one + 2,
    marginTop: Spacing.half,
  },
  badgeFree: {
    backgroundColor: Brand.accentGreenLight,
  },
  badgePro: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextFree: {
    color: Brand.accentGreen,
  },
  badgeTextPro: {
    color: Brand.primary,
  },
});
