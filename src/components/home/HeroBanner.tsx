import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type HeroBannerProps = {
  greetingName: string;
  onStartPress: () => void;
};

export function HeroBanner({ onStartPress }: HeroBannerProps) {
  const micIcon: SymbolName = { ios: 'mic.fill', android: 'mic', web: 'mic' };

  return (
    <View style={styles.card}>
      <View style={styles.gradientBg} />
      <View style={styles.innerHighlight} />

      <View style={styles.content}>
        <Text style={styles.kicker}>AI Fluency Coach</Text>
        <Text style={styles.heading}>Learn Smarter with{'\n'}AI-Powered Guidance</Text>
        <Text style={styles.subtext}>
          Real-time voice practice tailored to your goals.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={onStartPress}
          accessibilityRole="button"
          accessibilityLabel="Start with AI — open scenario picker"
        >
          <SymbolView name={micIcon} size={16} tintColor="#FFFFFF" />
          <Text style={styles.ctaLabel}>Start with AI</Text>
        </Pressable>
      </View>

      <View style={styles.mascotContainer} pointerEvents="none">
        <Image
          source={require('@/assets/images/coach-explaining.png')}
          style={styles.mascot}
          contentFit="contain"
          accessibilityLabel="PravabloyAI coach"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginHorizontal: Spacing.three,
    minHeight: 168,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(135deg, ${Brand.bgGradientStart} 0%, #DDD6FE 55%, ${Brand.primaryBadgeBg} 100%)`,
    backgroundColor: Brand.bgGradientStart,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)`,
  },
  content: {
    padding: Spacing.four,
    paddingRight: 130,
    gap: Spacing.one,
    zIndex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 19,
    fontWeight: '800',
    color: Brand.primaryDark,
    lineHeight: 26,
  },
  subtext: {
    fontSize: 12,
    fontWeight: '500',
    color: Brand.grayText,
    lineHeight: 17,
    marginBottom: Spacing.one,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    backgroundColor: Brand.primaryDark,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two + 2,
    marginTop: Spacing.one,
  },
  ctaButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mascotContainer: {
    position: 'absolute',
    right: -4,
    bottom: -8,
    width: 140,
    height: 160,
    zIndex: 0,
  },
  mascot: {
    width: 140,
    height: 160,
  },
});
