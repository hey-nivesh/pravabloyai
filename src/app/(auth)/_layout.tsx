import { Stack } from 'expo-router';

/**
 * (auth) route group layout.
 * Simple Stack navigator — all auth screens manage their own headers
 * via AuthHeaderBand, so the native header is hidden.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="legal" />
    </Stack>
  );
}
