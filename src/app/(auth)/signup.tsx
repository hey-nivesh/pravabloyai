/**
 * Sign Up screen — src/app/(auth)/signup.tsx
 *
 * Layout:
 *  ┌─────────────────────────────┐
 *  │  AuthHeaderBand (← back)    │
 *  ├─────────────────────────────┤
 *  │  "Create an account" heading│
 *  │  [Email]       [Phone]  ← segmented control
 *  │                             │
 *  │  Email flow:                │
 *  │    Email field              │
 *  │    Password field           │
 *  │    Confirm Password field   │
 *  │                             │
 *  │  Phone flow:                │
 *  │    Phone field              │
 *  │    (OTP step inline)        │
 *  │                             │
 *  │  ☑ I agree to Terms         │
 *  │  [      Sign Up      ]      │
 *  │  ─────── or ────────        │
 *  │     [G]        []           │
 *  │  Already have an account?   │
 *  │  Log In                     │
 *  └─────────────────────────────┘
 *
 * Auth:
 *  - Email: supabase.auth.signUp
 *  - Phone: supabase.auth.signInWithOtp (sends SMS OTP)
 *  - OTP verify: supabase.auth.verifyOtp
 *
 * NOTE: Phone auth requires Twilio configured in your Supabase project.
 * If not configured, the phone tab will still work UI-wise but Supabase
 * will return an error which is surfaced inline.
 */

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { AuthHeaderBand } from '@/components/auth/AuthHeaderBand';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type SignUpMethod = 'email' | 'phone';
type PhasePhone = 'input' | 'otp';

// ─── Error helpers ────────────────────────────────────────────────────────────

function friendlySignUpError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email is already registered. Try logging in instead.';
  }
  if (lower.includes('password') && lower.includes('characters')) {
    return 'Password must be at least 6 characters.';
  }
  if (lower.includes('invalid email') || lower.includes('invalid format')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('phone') && lower.includes('invalid')) {
    return 'Please enter a valid phone number with country code.';
  }
  if (lower.includes('otp') || lower.includes('token')) {
    return 'Invalid verification code. Please try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (lower.includes('sms') || lower.includes('twilio')) {
    return 'SMS sending is not configured yet. Please use email sign-up.';
  }
  return 'Something went wrong. Please try again.';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [method, setMethod] = useState<SignUpMethod>('email');

  // Email flow
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Phone flow
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phonePhase, setPhonePhase] = useState<PhasePhone>('input');

  // Shared
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEmailSignUp = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) return setError('Please enter your email address.');
    if (!password) return setError('Please enter a password.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!agreedToTerms) return setError('Please agree to the Terms & Conditions to continue.');

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(friendlySignUpError(authError.message));
      } else {
        // Supabase sends a confirmation email by default.
        // onAuthStateChange will fire automatically when confirmed.
        setSuccessMessage(
          'Account created! Check your email to confirm your address, then log in.',
        );
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async () => {
    setError(null);

    if (!phone.trim()) return setError('Please enter your phone number with country code (e.g. +1 555 000 0000).');
    if (!agreedToTerms) return setError('Please agree to the Terms & Conditions to continue.');

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });

      if (authError) {
        setError(friendlySignUpError(authError.message));
      } else {
        setPhonePhase('otp');
        setSuccessMessage(`We sent a verification code to ${phone.trim()}.`);
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);

    if (!otp.trim() || otp.length < 6) {
      return setError('Please enter the 6-digit code we sent to your phone.');
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms',
      });

      if (authError) {
        setError(friendlySignUpError(authError.message));
      }
      // On success: onAuthStateChange → AuthProvider updates → routing guard redirects
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    if (method === 'email') {
      handleEmailSignUp();
    } else if (phonePhase === 'input') {
      handlePhoneSignUp();
    } else {
      handleVerifyOtp();
    }
  };

  const handleSocialError = (message: string) => setError(message);

  const handleMethodChange = (newMethod: SignUpMethod) => {
    setMethod(newMethod);
    setError(null);
    setSuccessMessage(null);
    setPhonePhase('input');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const primaryBtnLabel = () => {
    if (loading) return null;
    if (method === 'phone' && phonePhase === 'otp') return 'Verify Code';
    return 'Sign Up';
  };

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
          {/* Header band — with back button */}
          <AuthHeaderBand onBack={() => router.back()} />

          {/* Form card */}
          <View style={styles.card}>

            {/* Heading */}
            <Text style={styles.heading}>Create an account</Text>
            <Text style={styles.subheading}>
              Start speaking with confidence today.
            </Text>

            {/* ── Segmented control ──────────────────────────────────────── */}
            <View style={styles.segmentedControl}>
              <Pressable
                style={[styles.segment, method === 'email' && styles.segmentActive]}
                onPress={() => handleMethodChange('email')}
                accessibilityRole="tab"
                accessibilityState={{ selected: method === 'email' }}
                accessibilityLabel="Sign up with email"
              >
                <Text
                  style={[
                    styles.segmentText,
                    method === 'email' && styles.segmentTextActive,
                  ]}
                >
                  Email
                </Text>
              </Pressable>

              <Pressable
                style={[styles.segment, method === 'phone' && styles.segmentActive]}
                onPress={() => handleMethodChange('phone')}
                accessibilityRole="tab"
                accessibilityState={{ selected: method === 'phone' }}
                accessibilityLabel="Sign up with phone"
              >
                <Text
                  style={[
                    styles.segmentText,
                    method === 'phone' && styles.segmentTextActive,
                  ]}
                >
                  Phone
                </Text>
              </Pressable>
            </View>

            {/* ── Field sets ─────────────────────────────────────────────── */}
            <View style={styles.fields}>
              {method === 'email' ? (
                <>
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
                    placeholder="Password (min. 6 characters)"
                    isPassword
                    textContentType="newPassword"
                    autoComplete="new-password"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(null); }}
                    accessibilityLabel="Password"
                  />

                  <AuthTextField
                    ref={confirmRef}
                    leadingIcon={{
                      ios: 'lock.shield.fill',
                      android: 'lock',
                      web: 'lock',
                    }}
                    placeholder="Confirm password"
                    isPassword
                    textContentType="newPassword"
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                    accessibilityLabel="Confirm password"
                  />
                </>
              ) : phonePhase === 'input' ? (
                // Phone: number input
                <AuthTextField
                  leadingIcon={{
                    ios: 'phone.fill',
                    android: 'phone',
                    web: 'phone',
                  }}
                  placeholder="Phone number (e.g. +1 555 000 0000)"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(null); }}
                  accessibilityLabel="Phone number"
                />
              ) : (
                // Phone: OTP verification step
                <>
                  {successMessage && (
                    <Text style={styles.otpInfo}>{successMessage}</Text>
                  )}
                  <AuthTextField
                    leadingIcon={{
                      ios: 'number',
                      android: 'tag',
                      web: 'tag',
                    }}
                    placeholder="6-digit verification code"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    value={otp}
                    onChangeText={(t) => { setOtp(t); setError(null); }}
                    accessibilityLabel="OTP verification code"
                    maxLength={6}
                  />
                  <Pressable
                    onPress={() => {
                      setPhonePhase('input');
                      setOtp('');
                      setSuccessMessage(null);
                      setError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change phone number"
                  >
                    <Text style={styles.changePhoneText}>← Change phone number</Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* ── Terms & Conditions ─────────────────────────────────────── */}
            <Pressable
              style={styles.termsRow}
              onPress={() => setAgreedToTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedToTerms }}
              accessibilityLabel="Agree to Terms and Conditions"
            >
              <View
                style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
              >
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Link href="/(auth)/legal" asChild>
                  <Text
                    style={styles.termsLink}
                    onPress={(e) => e.stopPropagation?.()}
                    accessibilityRole="link"
                    accessibilityLabel="Terms and Conditions"
                  >
                    Terms &amp; Conditions
                  </Text>
                </Link>
              </Text>
            </Pressable>

            {/* ── Inline error / success ────────────────────────────────── */}
            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : successMessage && method === 'email' ? (
              <View style={styles.successBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* ── Primary button ─────────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={method === 'phone' && phonePhase === 'otp' ? 'Verify code' : 'Sign up'}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>{primaryBtnLabel()}</Text>
              )}
            </Pressable>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Social label ───────────────────────────────────────────── */}
            <Text style={styles.socialLabel}>Sign up with</Text>

            {/* ── Social buttons ─────────────────────────────────────────── */}
            <View style={styles.socialRow}>
              <SocialAuthButton provider="google" onError={handleSocialError} />
              <SocialAuthButton provider="apple" onError={handleSocialError} />
            </View>

            {/* ── Switch to Login ────────────────────────────────────────── */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Log in">
                  <Text style={styles.switchLink}>Log In</Text>
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
    paddingTop: Spacing.four,
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

  // ── Segmented control ─────────────────────────────────────────────────────
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.grayText,
  },
  segmentTextActive: {
    color: Brand.primaryDark,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fields: {
    gap: Spacing.two + 4,
  },
  otpInfo: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 18,
  },
  changePhoneText: {
    fontSize: 13,
    color: Brand.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -Spacing.one,
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    marginTop: -Spacing.one,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  checkmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 14,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Brand.grayText,
    lineHeight: 20,
  },
  termsLink: {
    color: Brand.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Error / Success ───────────────────────────────────────────────────────
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
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: -Spacing.one,
  },
  successText: {
    fontSize: 13,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryBtn: {
    height: 54,
    backgroundColor: Brand.primary,
    borderRadius: Radius.lg,
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
