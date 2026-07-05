/**
 * AuthHeaderBand — gradient header section reused by Login and Sign Up.
 *
 * Renders:
 *  - bgGradientStart → bgGradientEnd gradient background band
 *  - Optional back-button (top-left)
 *  - Centered PravabloyAI wordmark logo
 *  - Small avatar accent image (bottom-right, subtle decorative)
 */

import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Brand, Spacing } from '@/constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

type AuthHeaderBandProps = {
  /** If provided, renders a circular back button in the top-left */
  onBack?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthHeaderBand({ onBack }: AuthHeaderBandProps) {
  const insets = useSafeAreaInsets();

  // Android: system bars handle top inset separately
  const topPad = Platform.OS === 'android' ? insets.top + Spacing.two : insets.top + Spacing.three;

  return (
    <View style={[styles.band, { paddingTop: topPad }]}>
      {/* Gradient wash */}
      {/* @ts-ignore — experimental_backgroundImage supported on RN 0.76+ / Expo SDK 57 */}
      <View style={[StyleSheet.absoluteFill, styles.gradient]} />

      {/* Back button (optional) */}
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={Brand.primaryDark}
          />
        </Pressable>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}

      {/* Centered logo */}
      <View style={styles.logoWrapper}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="PravabloyAI"
        />
      </View>

      {/* Right placeholder to keep logo centered */}
      <View style={styles.backBtnPlaceholder} />

      {/* Decorative avatar accent — bottom-right, small and subtle */}
      <View style={styles.accentWrapper} pointerEvents="none">
        <Image
          source={require('@/assets/images/avatar.png')}
          style={styles.accentImage}
          resizeMode="contain"
          accessibilityLabel=""
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  band: {
    width: '100%',
    height: 180,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    overflow: 'hidden',
    backgroundColor: Brand.bgGradientStart,
  },
  gradient: {
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 100%)`,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
    flexShrink: 0,
    zIndex: 2,
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  backBtnPlaceholder: {
    width: 40,
    flexShrink: 0,
  },
  logoWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.two,
    zIndex: 2,
  },
  logo: {
    width: 180,
    height: 52,
  },
  accentWrapper: {
    position: 'absolute',
    bottom: -10,
    right: -8,
    zIndex: 1,
  },
  accentImage: {
    width: 72,
    height: 72,
    opacity: 0.18,
  },
});
