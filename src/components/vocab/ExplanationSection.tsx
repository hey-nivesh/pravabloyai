/**
 * ExplanationSection — The teaching section beneath the word card.
 *
 * Renders:
 *  - Plain-language definition in the user's preferred language
 *  - A styled quote card for the example sentence + inline audio button
 *  - A usage tip / nuance callout box
 *  - The coach character in an "explaining" pose alongside
 *
 * All content is visible as text — nothing is audio-only (accessibility).
 */

import React from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ComponentProps,
} from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type ExplanationSectionProps = {
  definition: string;
  exampleSentence: string;
  usageTip: string;
  /** True while the example sentence audio is loading/playing */
  exampleAudioPlaying: boolean;
  exampleAudioLoading: boolean;
  onPlayExampleAudio: () => void;
};

export function ExplanationSection({
  definition,
  exampleSentence,
  usageTip,
  exampleAudioPlaying,
  exampleAudioLoading,
  onPlayExampleAudio,
}: ExplanationSectionProps) {
  const playIcon: SymbolName = {
    ios: 'play.fill',
    android: 'play_arrow',
    web: 'play_arrow',
  };
  const pauseIcon: SymbolName = {
    ios: 'pause.fill',
    android: 'pause',
    web: 'pause',
  };
  const lightbulbIcon: SymbolName = {
    ios: 'lightbulb.fill',
    android: 'lightbulb',
    web: 'lightbulb',
  };

  return (
    <View style={styles.container}>
      {/* ── Row: coach + definition ─────────────────────────────────────── */}
      <View style={styles.coachRow}>
        {/* Coach in explaining pose */}
        <View style={styles.coachWrap} pointerEvents="none">
          <Image
            source={require('@/assets/images/coach-explaining.png')}
            style={styles.coachImage}
            contentFit="contain"
            accessibilityLabel="Vocabulary coach explaining"
          />
        </View>

        {/* Definition bubble */}
        <View style={styles.definitionBubble}>
          <Text style={styles.sectionLabel}>DEFINITION</Text>
          <Text
            style={styles.definitionText}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {definition}
          </Text>
        </View>
      </View>

      {/* ── Example sentence ────────────────────────────────────────────── */}
      <View style={styles.exampleCard}>
        {/* Decorative quote mark */}
        <Text style={styles.quoteMark}>"</Text>

        <View style={styles.exampleContent}>
          <Text style={styles.exampleText}>{exampleSentence}</Text>

          {/* Inline audio button */}
          <Pressable
            onPress={onPlayExampleAudio}
            style={({ pressed }) => [
              styles.exampleAudioBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              exampleAudioPlaying
                ? 'Pause example sentence audio'
                : 'Play example sentence audio'
            }
          >
            {exampleAudioLoading ? (
              <ActivityIndicator size="small" color={Brand.primary} />
            ) : (
              <SymbolView
                name={exampleAudioPlaying ? pauseIcon : playIcon}
                size={12}
                tintColor={Brand.primary}
              />
            )}
            <Text style={styles.exampleAudioLabel}>
              {exampleAudioPlaying ? 'Pause' : 'Listen'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Usage tip callout ────────────────────────────────────────────── */}
      <View style={styles.tipBox}>
        <View style={styles.tipHeader}>
          <SymbolView name={lightbulbIcon} size={13} tintColor={Brand.accentAmber} />
          <Text style={styles.tipLabel}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>{usageTip}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },

  // ── Coach + definition row ────────────────────────────────────────────────
  coachRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  coachWrap: {
    width: 72,
    height: 80,
    flexShrink: 0,
  },
  coachImage: {
    width: 72,
    height: 80,
  },
  definitionBubble: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.10)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Brand.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  definitionText: {
    fontSize: 14,
    color: Brand.primaryDark,
    lineHeight: 21,
    fontWeight: '500',
  },

  // ── Example sentence card ────────────────────────────────────────────────
  exampleCard: {
    backgroundColor: Brand.primaryBadgeBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.12)',
    position: 'relative',
    overflow: 'hidden',
  },
  quoteMark: {
    position: 'absolute',
    top: -8,
    left: 10,
    fontSize: 72,
    fontWeight: '900',
    color: Brand.primary,
    opacity: 0.1,
    lineHeight: 72,
  },
  exampleContent: {
    gap: Spacing.two,
  },
  exampleText: {
    fontSize: 14,
    color: Brand.primaryDark,
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  exampleAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    alignSelf: 'flex-start',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.15)',
  },
  exampleAudioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.primary,
  },
  pressed: {
    opacity: 0.75,
  },

  // ── Usage tip ────────────────────────────────────────────────────────────
  tipBox: {
    backgroundColor: Brand.accentAmberBg,
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    gap: Spacing.one + 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.accentAmber,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 13,
    color: '#78350F', // Warm dark amber for legibility on amber bg
    lineHeight: 20,
    fontWeight: '500',
  },
});
