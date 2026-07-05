/**
 * SocialAuthButton — circular white button for OAuth providers.
 *
 * Supports: 'google' | 'apple'
 *
 * OAuth flow (Supabase + expo-web-browser):
 *   1. Call supabase.auth.signInWithOAuth with skipBrowserRedirect: true
 *   2. Open the returned URL in WebBrowser.openAuthSessionAsync
 *   3. On success, Supabase's onAuthStateChange fires automatically
 *      via the deep-link redirect back into the app (scheme: pravabloyai)
 *
 * The redirect URI uses expo-linking.createURL so it works in both
 * Expo Go (exp://) and standalone builds (pravabloyai://).
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Ensure the browser session is properly cleaned up when the app resumes
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'google' | 'apple';

type SocialAuthButtonProps = {
  provider: Provider;
  onError?: (message: string) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_META: Record<
  Provider,
  { label: string; iconText: string; iconColor: string; ariaLabel: string }
> = {
  google: {
    label: 'G',
    iconText: 'G',
    iconColor: '#4285F4',
    ariaLabel: 'Continue with Google',
  },
  apple: {
    label: '',
    iconText: '',
    iconColor: '#000000',
    ariaLabel: 'Continue with Apple',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SocialAuthButton({ provider, onError }: SocialAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const meta = PROVIDER_META[provider];

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Build the redirect URI that Supabase will redirect back to after OAuth
      const redirectTo = Linking.createURL('/(drawer)');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // skipBrowserRedirect: true means Supabase gives us the URL
          // instead of auto-opening a browser — we control it via WebBrowser
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        onError?.('Could not start sign-in. Please try again.');
        return;
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          // Exchange the auth code — onAuthStateChange will fire automatically
          await supabase.auth.exchangeCodeForSession(result.url);
        }
      }
    } catch {
      onError?.('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // On iOS, use the native Apple logo SF Symbol; on Android/web, fall back to text
  const renderIcon = () => {
    if (provider === 'apple' && Platform.OS === 'ios') {
      return (
        <SymbolView
          name="apple.logo"
          size={22}
          tintColor="#000000"
        />
      );
    }
    if (provider === 'apple') {
      // Unicode apple symbol (private-use area, renders on most systems)
      return (
        <Text style={[styles.iconText, { fontSize: 20, color: meta.iconColor }]}>
          {'\uF8FF'}
        </Text>
      );
    }
    // Google: bold "G" in brand blue
    return (
      <Text style={[styles.iconText, { color: meta.iconColor }]}>
        {meta.iconText}
      </Text>
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel={meta.ariaLabel}
      disabled={loading}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={Brand.grayText} />
        ) : (
          renderIcon()
        )}
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  inner: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
});
