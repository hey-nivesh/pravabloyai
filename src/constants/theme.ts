/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** PravabloyAI brand palette — always light-theme tokens, not scheme-aware */
export const Brand = {
  /** Electric purple — primary CTAs, active icons, mic button */
  primary: '#7F22FD',
  /** Deep purple — headings, pressed states */
  primaryDark: '#4C0E9E',
  /** Soft purple used as hero-banner inner highlight */
  primaryLight: '#A855F7',
  /** Background gradient start (top) */
  bgGradientStart: '#E8DCFC',
  /** Background gradient end (bottom) */
  bgGradientEnd: '#FFFFFF',
  /** Streaks, success states, vocab badge */
  accentGreen: '#10B981',
  /** Light green tint for icon badge backgrounds */
  accentGreenLight: '#D1FAE5',
  /** Secondary text / subtitles */
  grayText: '#6B7280',
  /** Warm orange — flame / streak indicator */
  accentOrange: '#F97316',
  /** Light orange tint */
  accentOrangeLight: '#FFEDD5',
  /** Card/tile surfaces */
  cardBg: '#FFFFFF',
  /** Soft purple-tinted shadow color (for elevation effect) */
  shadowColor: '#7F22FD',
  /** Purple tint icon badge background */
  primaryBadgeBg: '#EDE9FE',
  /** Blue tint icon badge */
  accentBlueBg: '#DBEAFE',
  accentBlue: '#3B82F6',
  /** Chart/progress icon badge */
  accentAmberBg: '#FEF3C7',
  accentAmber: '#F59E0B',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
