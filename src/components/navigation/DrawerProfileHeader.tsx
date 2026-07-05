import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { UserProfile } from '@/hooks/use-user';

type DrawerProfileHeaderProps = {
  user: UserProfile | null;
  onPress: () => void;
};

export function DrawerProfileHeader({ user, onPress }: DrawerProfileHeaderProps) {
  const name = user ? user.firstName : 'Learner';
  const email = user ? user.email : 'learner@example.com';
  
  // Since UserProfile doesn't have a plan field, we stub it as "Free Plan".
  // In a production environment, this would be read from user.tier or user.plan.
  const isPro = false; 
  const planLabel = isPro ? 'Pro Member' : 'Free Plan';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`View profile for ${name}. Current tier: ${planLabel}`}
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={
            user?.avatarUrl
              ? { uri: user.avatarUrl }
              : require('@/assets/images/avatar.png')
          }
          style={styles.avatar}
          contentFit="cover"
        />
      </View>
      <View style={styles.infoWrapper}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
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
    borderColor: Brand.primaryLight, // soft purple border
    padding: 2,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
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
