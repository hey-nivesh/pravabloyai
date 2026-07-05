import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Brand, Spacing } from '@/constants/theme';

type BentoGridProps = {
  /** Section heading text — e.g. "Practice Modes" */
  title: string;
  /** Route href for the "See all" link — will be pushed via expo-router */
  seeAllHref: string;
  /** BentoTile children arranged in a 3-column flex row */
  children: ReactNode;
};

/**
 * Section layout wrapper for bento-grid tile groups.
 *
 * Renders a row header (title + "See all" link) above a 3-column horizontal
 * tile row. Pass BentoTile children directly.
 */
export function BentoGrid({ title, seeAllHref, children }: BentoGridProps) {
  const router = useRouter();

  function handleSeeAll() {
    // Routes such as /practice may not exist yet — cast to any to bypass
    // expo-router typed-routes check until those screens are created.
    router.push(seeAllHref as never);
  }

  return (
    <View style={styles.section}>
      {/* Section header row */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={handleSeeAll}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={`See all ${title}`}
        >
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {/* 3-column tile row */}
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: Brand.grayText,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
});
