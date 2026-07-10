import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useRootNavigationState, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { StreakActivityRecorder } from '@/components/StreakActivityRecorder';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { HomeDataProvider } from '@/context/home-data-context';
import { VoiceStartProvider } from '@/context/voice-start-context';

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
  const navigationState = useRootNavigationState();
  const navigationReady = Boolean(navigationState?.key);

  useEffect(() => {
    if (isLoading || !navigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, segments, router, navigationReady]);

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
      <HomeDataProvider>
        <VoiceStartProvider>
          <RootLayoutNav />
        </VoiceStartProvider>
      </HomeDataProvider>
    </AuthProvider>
  );
}
