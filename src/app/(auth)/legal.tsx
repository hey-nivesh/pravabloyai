/**
 * Legal screen — src/app/(auth)/legal.tsx
 *
 * Placeholder Terms & Conditions screen.
 *
 * ⚠️  PLACEHOLDER — Replace this stub with your actual legal content
 *     before publishing the app to the App Store / Google Play.
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'android'
    ? insets.top + Spacing.two
    : insets.top + Spacing.three;

  return (
    <View style={styles.root}>
      {/* @ts-ignore */}
      <View style={[StyleSheet.absoluteFill, styles.bgGradient]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => router.back()}
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
        <Text style={styles.headerTitle}>Terms &amp; Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* ⚠️ PLACEHOLDER — replace with your actual legal content */}
          <Text style={styles.badge}>⚠️ Placeholder Content</Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>
            By accessing or using PravabloyAI, you agree to be bound by these
            Terms and Conditions and our Privacy Policy. If you disagree with
            any part of these terms, you may not use our service.
          </Text>

          <Text style={styles.sectionTitle}>2. Use of the Service</Text>
          <Text style={styles.body}>
            PravabloyAI is an AI-powered language learning and speaking
            practice platform. You agree to use the service only for lawful
            purposes and in accordance with these Terms.
          </Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.body}>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account.
          </Text>

          <Text style={styles.sectionTitle}>4. Privacy</Text>
          <Text style={styles.body}>
            Your use of PravabloyAI is also governed by our Privacy Policy,
            which is incorporated into these Terms by reference.
          </Text>

          <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
          <Text style={styles.body}>
            All content, features, and functionality of the PravabloyAI
            service are the exclusive property of PravabloyAI and its
            licensors.
          </Text>

          <Text style={styles.sectionTitle}>6. Disclaimer</Text>
          <Text style={styles.body}>
            The service is provided "as is" without warranties of any kind.
            PravabloyAI does not guarantee that the service will be
            error-free or uninterrupted.
          </Text>

          <Text style={styles.sectionTitle}>7. Contact</Text>
          <Text style={styles.body}>
            If you have any questions about these Terms, please contact us at{' '}
            <Text style={styles.link}>legal@pravabloy.ai</Text>
          </Text>

          <View style={styles.divider} />
          <Text style={styles.updatedText}>Last updated: July 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientEnd,
  },
  bgGradient: {
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 40%)`,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
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
  },
  backBtnPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    padding: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
    gap: Spacing.two,
  },
  badge: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginTop: Spacing.three,
  },
  body: {
    fontSize: 14,
    color: Brand.grayText,
    lineHeight: 22,
  },
  link: {
    color: Brand.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: Spacing.three,
  },
  updatedText: {
    fontSize: 12,
    color: Brand.grayText,
    textAlign: 'center',
    opacity: 0.6,
  },
});
