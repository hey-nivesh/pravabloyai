/**
 * Login screen — src/app/(auth)/login.tsx
 *
 * Layout (mirrors reference structure, adapted to PravabloyAI brand):
 *  ┌─────────────────────────────┐
 *  │  AuthHeaderBand (logo)      │
 *  ├─────────────────────────────┤
 *  │  "Welcome back!" heading    │
 *  │  Email field                │
 *  │  Password field (show/hide) │
 *  │  [Remember me]  [Forgot pw] │
 *  │  [      Log In      ]       │
 *  │  ─────── or ────────        │
 *  │     [G]        []          │
 *  │  Don't have an account?     │
 *  │  Sign up now ↗              │
 *  └─────────────────────────────┘
 *
 * Auth: supabase.auth.signInWithPassword
 * On success: AuthProvider's onAuthStateChange handles the redirect automatically.
 */

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { AuthHeaderBand } from '@/components/auth/AuthHeaderBand';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// ─── Error message mapping ────────────────────────────────────────────────────

function friendlyAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('wrong password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(friendlyAuthError(authError.message));
      }
      // On success: supabase.auth.onAuthStateChange fires → AuthProvider updates
      // session → root _layout.tsx routing guard redirects to /(drawer).
      // No manual navigation needed here.
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialError = (message: string) => {
    setError(message);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Background */}
      {/* @ts-ignore */}
      <View style={[StyleSheet.absoluteFill, styles.bgGradient]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.five },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header band — no back button on Login (it's the auth root) */}
          <AuthHeaderBand />

          {/* Form card */}
          <View style={styles.card}>

            {/* Heading */}
            <Text style={styles.heading}>Welcome back!</Text>
            <Text style={styles.subheading}>
              Sign in to continue your learning journey.
            </Text>

            {/* ── Fields ─────────────────────────────────────────────────── */}
            <View style={styles.fields}>
              <AuthTextField
                leadingIcon={{
                  ios: 'envelope.fill',
                  android: 'email',
                  web: 'email',
                }}
                placeholder="Email address"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                accessibilityLabel="Email address"
              />

              <AuthTextField
                ref={passwordRef}
                leadingIcon={{
                  ios: 'lock.fill',
                  android: 'lock',
                  web: 'lock',
                }}
                placeholder="Password"
                isPassword
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                accessibilityLabel="Password"
              />
            </View>

            {/* ── Remember me + Forgot password ──────────────────────────── */}
            <View style={styles.rememberRow}>
              <Pressable
                style={styles.rememberLeft}
                onPress={() => setRememberMe((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Remember me"
              >
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ true: Brand.primary, false: '#E5E7EB' }}
                  thumbColor="#FFFFFF"
                  style={styles.switch}
                />
                <Text style={styles.rememberLabel}>Remember me</Text>
              </Pressable>

              <Link href="/(auth)/login" asChild>
                {/* 
                  TODO: Create /(auth)/forgot-password screen.
                  For now, this is a placeholder link back to login.
                  Replace href with '/(auth)/forgot-password' when built.
                */}
                <Pressable accessibilityRole="link" accessibilityLabel="Forgot password">
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </Link>
            </View>

            {/* ── Inline error ───────────────────────────────────────────── */}
            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Primary button ─────────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </Pressable>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Social login label ─────────────────────────────────────── */}
            <Text style={styles.socialLabel}>Login with</Text>

            {/* ── Social buttons ─────────────────────────────────────────── */}
            <View style={styles.socialRow}>
              <SocialAuthButton provider="google" onError={handleSocialError} />
              <SocialAuthButton provider="apple" onError={handleSocialError} />
            </View>

            {/* ── Switch to Sign Up ──────────────────────────────────────── */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Sign up now">
                  <Text style={styles.switchLink}>Sign up now</Text>
                </Pressable>
              </Link>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    experimental_backgroundImage: `linear-gradient(180deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 40%)`,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Form card ──────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: Brand.bgGradientEnd,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },

  // ── Heading ───────────────────────────────────────────────────────────────
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.primaryDark,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    marginTop: -Spacing.two,
    marginBottom: Spacing.one,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fields: {
    gap: Spacing.two + 4,
  },

  // ── Remember me row ───────────────────────────────────────────────────────
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    marginTop: -Spacing.one,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  rememberLabel: {
    fontSize: 13,
    color: Brand.grayText,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.primary,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: -Spacing.one,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryBtn: {
    height: 54,
    backgroundColor: Brand.primary,
    borderRadius: Radius.lg, // 24px
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: Spacing.one,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.one,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: Brand.grayText,
    fontWeight: '500',
  },

  // ── Social ────────────────────────────────────────────────────────────────
  socialLabel: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    marginTop: -Spacing.one,
    marginBottom: -Spacing.one,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },

  // ── Switch link ───────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: Spacing.two,
  },
  switchText: {
    fontSize: 14,
    color: Brand.grayText,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
});
