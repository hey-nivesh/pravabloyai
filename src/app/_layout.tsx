import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { StreakActivityRecorder } from '@/components/StreakActivityRecorder';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

/**
 * Inner component that has access to both expo-router hooks (useSegments, useRouter)
 * and the auth context (useAuth). Must be a child of AuthProvider.
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for the initial session check to finish

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // No session and not already on an auth screen → redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Session exists but still on an auth screen → redirect into the app
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <StreakActivityRecorder />
      <Slot />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
