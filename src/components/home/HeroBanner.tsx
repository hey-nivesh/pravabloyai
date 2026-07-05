import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type HeroBannerProps = {
  /** First name shown in the greeting — e.g. "Alex" */
  greetingName: string;
  /** Called when the "Start Speaking" CTA is tapped */
  onStartPress: () => void;
};

/**
 * Full-width hero banner card on the Home screen.
 *
 * - Purple gradient background (primary → primaryDark) via experimental_backgroundImage
 * - Floating mascot asset overlapping the bottom-right edge for a 3D-depth effect
 * - Inner highlight layer simulates a raised/lifted 3D surface
 * - White pill CTA button that calls onStartPress to navigate to the practice picker
 */
export function HeroBanner({ greetingName, onStartPress }: HeroBannerProps) {
  const micIcon: SymbolName = { ios: 'mic.fill', android: 'mic', web: 'mic' };

  return (
    <View style={styles.card}>
      {/* Purple gradient background */}
      <View style={styles.gradientBg} />

      {/* Inner highlight layer — simulates a 3D "raised" surface */}
      <View style={styles.innerHighlight} />

      {/* Content column */}
      <View style={styles.content}>
        <Text style={styles.greeting}>Hey {greetingName}! 🎙️</Text>
        <Text style={styles.heading}>Ready to practice{'\n'}speaking today?</Text>
        <Text style={styles.subtext}>5 minutes a day builds real fluency.</Text>

        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={onStartPress}
          accessibilityRole="button"
          accessibilityLabel="Start Speaking — open scenario picker"
        >
          <SymbolView name={micIcon} size={16} tintColor={Brand.primary} />
          <Text style={styles.ctaLabel}>Start Speaking</Text>
        </Pressable>
      </View>

      {/* Floating mascot — overlaps the bottom-right edge for depth */}
      <View style={styles.mascotContainer} pointerEvents="none">
        <Image
          source={require('@/assets/images/avatar.png')}
          style={styles.mascot}
          contentFit="contain"
          accessibilityLabel="PravabloyAI mascot"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'visible',
    marginHorizontal: Spacing.three,
    minHeight: 172,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — experimental_backgroundImage is supported in RN 0.76+ / Expo SDK 57
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.primary} 0%, #5e1bc2e2 100%)`,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)`,
  },
  content: {
    padding: Spacing.four,
    paddingRight: 116,
    gap: Spacing.one + 2,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: Spacing.one,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    marginTop: Spacing.one,
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  mascotContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 124,
    height: 144,
  },
  mascot: {
    width: 124,
    height: 144,
  },
});
