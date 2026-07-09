import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { Skeleton } from '@/components/home/Skeleton';
import { useUserProfile, getFirstName, formatMemberSince } from '@/hooks/useUserProfile';
import { uploadAvatarImage, CloudinaryUploadError } from '@/services/cloudinaryUpload';
import { supabase } from '@/lib/supabase';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, loading, refetch } = useUserProfile();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;

  // ─── Derived display values ──────────────────────────────────────────────

  const firstName = getFirstName(profile, user?.email);
  const fullName = profile?.full_name ?? firstName;
  const email = user?.email ?? '';
  const streakCount = profile?.streak_count ?? 0;
  const isPro = profile?.subscription_tier === 'pro';
  const tierLabel = isPro ? 'Pro' : 'Free';
  const memberSince = formatMemberSince(profile?.created_at);
  const avatarSource = profile?.avatar_url
    ? { uri: profile.avatar_url }
    : require('@/assets/images/avatar.png');

  // ─── Avatar upload flow ──────────────────────────────────────────────────

  const handleAvatarPress = async () => {
    if (uploading || !user) return;

    // 1. Request media library permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library in Settings to change your avatar.',
        [{ text: 'OK' }],
      );
      return;
    }

    // 2. Open picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const picked = result.assets[0];

    // 3. Upload via server proxy (falls back to direct Cloudinary on failure)
    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadAvatarImage(
        {
          uri: picked.uri,
          base64: picked.base64 ?? null,
          mimeType: picked.mimeType ?? null,
        },
        user.id,
      );

      // Server proxy persists avatar_url; ensure DB is updated if direct Cloudinary fallback was used
      await supabase
        .from('users')
        .update({ avatar_url: result.secureUrl, avatar_public_id: result.publicId })
        .eq('id', user.id);

      await refetch();
    } catch (err) {
      let message = 'Something went wrong uploading your avatar. Please try again.';
      if (err instanceof CloudinaryUploadError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.backBtn} />
          <Skeleton width={120} height={22} borderRadius={Radius.sm} />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <View style={styles.profileCard}>
            <Skeleton width={106} height={106} borderRadius={53} style={{ marginBottom: Spacing.three }} />
            <Skeleton width={160} height={24} borderRadius={Radius.sm} style={{ marginBottom: Spacing.half }} />
            <Skeleton width={200} height={16} borderRadius={Radius.sm} style={{ marginBottom: Spacing.four }} />
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Skeleton height={80} borderRadius={Radius.md} style={{ flex: 1 }} />
              <Skeleton height={80} borderRadius={Radius.md} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

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

          {/* ── Avatar with upload badge ── */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarContainer}>
              {/* The avatar image, dimmed while uploading */}
              <Image
                source={avatarSource}
                style={[styles.avatar, uploading && styles.avatarUploading]}
                contentFit="cover"
              />

              {/* Spinner overlay during upload */}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color={Brand.primary} />
                </View>
              )}
            </View>

            {/* Camera badge — hidden while uploading */}
            {!uploading && (
              <View style={styles.cameraBadge} accessibilityElementsHidden>
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  size={12}
                  tintColor="#FFFFFF"
                />
              </View>
            )}
          </Pressable>

          {/* Upload error */}
          {uploadError ? (
            <Text style={styles.uploadError} accessibilityRole="alert">
              {uploadError}
            </Text>
          ) : null}

          {/* Name */}
          <Text style={styles.name}>{fullName}</Text>

          {/* Email */}
          <Text style={styles.email}>{email}</Text>

          {/* Member since */}
          {memberSince ? (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          ) : null}

          <View style={styles.divider} />

          {/* Stats row */}
          <View style={styles.statRow}>
            {/* Streak tile */}
            <View style={styles.statTile}>
              <SymbolView
                name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                size={22}
                tintColor={Brand.accentOrange}
              />
              <Text style={styles.statNumber}>{streakCount}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            {/* Tier tile */}
            <View style={styles.statTile}>
              <SymbolView
                name={{ ios: isPro ? 'star.fill' : 'star', android: isPro ? 'grade' : 'star', web: isPro ? 'grade' : 'star' }}
                size={22}
                tintColor={isPro ? Brand.primary : Brand.grayText}
              />
              <View style={[styles.tierBadge, isPro ? styles.tierBadgePro : styles.tierBadgeFree]}>
                <Text style={[styles.tierBadgeText, isPro ? styles.tierBadgeTextPro : styles.tierBadgeTextFree]}>
                  {tierLabel}
                </Text>
              </View>
              <Text style={styles.statLabel}>Current Plan</Text>
            </View>
          </View>
        </View>

        {/* Upgrade CTA (only shown on Free tier) */}
        {!isPro && (
          <Pressable
            onPress={() => router.navigate('/subscription')}
            style={({ pressed }) => [styles.upgradeBtn, pressed && styles.upgradeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Upgrade membership to Pro"
          >
            <SymbolView
              name={{ ios: 'star.fill', android: 'grade', web: 'grade' }}
              size={16}
              tintColor="#FFFFFF"
            />
            <Text style={styles.upgradeText}>Upgrade to Pro</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarWrapper: {
    marginBottom: Spacing.three,
    position: 'relative',
  },
  avatarContainer: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: Brand.primaryLight,
    padding: 3,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarUploading: {
    opacity: 0.45,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Brand.cardBg,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadError: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  // ── Text ─────────────────────────────────────────────────────────────────
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginBottom: Spacing.half,
  },
  email: {
    fontSize: 14,
    color: Brand.grayText,
  },
  memberSince: {
    fontSize: 12,
    color: Brand.grayText,
    marginTop: Spacing.half,
    marginBottom: Spacing.three,
    opacity: 0.7,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(76, 14, 158, 0.08)',
    marginVertical: Spacing.three,
  },
  // ── Stats row ─────────────────────────────────────────────────────────────
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
  tierBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  tierBadgeFree: {
    backgroundColor: Brand.accentGreenLight,
  },
  tierBadgePro: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tierBadgeTextFree: {
    color: Brand.accentGreen,
  },
  tierBadgeTextPro: {
    color: Brand.primary,
  },
  // ── Upgrade button ────────────────────────────────────────────────────────
  upgradeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Brand.primary,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
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
