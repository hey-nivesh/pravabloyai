import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useUser } from '@/hooks/use-user';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userResult = useUser();
  const user = userResult.status === 'authenticated' ? userResult.user : null;

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={Brand.primaryDark}
          />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
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

          <Text style={styles.name}>{user?.firstName ?? 'Learner'}</Text>
          <Text style={styles.email}>{user?.email ?? 'learner@example.com'}</Text>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.statTile}>
              <SymbolView
                name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                size={22}
                tintColor={Brand.accentOrange}
              />
              <Text style={styles.statNumber}>{user?.streakCount ?? 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statTile}>
              <SymbolView
                name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                size={22}
                tintColor={Brand.primary}
              />
              <Text style={styles.statNumber}>Free</Text>
              <Text style={styles.statLabel}>Current Plan</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.navigate('/subscription')}
          style={({ pressed }) => [styles.upgradeBtn, pressed && styles.upgradeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Upgrade membership to Pro"
        >
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </Pressable>
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.four,
  },
  profileCard: {
    width: '100%',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Brand.primaryLight,
    padding: 3,
    backgroundColor: Brand.cardBg,
    marginBottom: Spacing.three,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginBottom: Spacing.half,
  },
  email: {
    fontSize: 14,
    color: Brand.grayText,
    marginBottom: Spacing.four,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(76, 14, 158, 0.08)',
    marginBottom: Spacing.four,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    width: '100%',
  },
  statTile: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: Spacing.half,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  statLabel: {
    fontSize: 11,
    color: Brand.grayText,
  },
  upgradeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Brand.primary,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  upgradeBtnPressed: {
    opacity: 0.85,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
