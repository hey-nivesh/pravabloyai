import { type ReactNode, useMemo, useState } from 'react';
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
  /** Keep 3 items visible until "See all" is pressed */
  collapsedCount?: number;
  /** Expand inline instead of route navigation */
  expandInline?: boolean;
};

/**
 * Section layout wrapper for bento-grid tile groups.
 *
 * Renders a row header (title + "See all" link) above a 3-column horizontal
 * tile row. Pass BentoTile children directly.
 */
export function BentoGrid({
  title,
  seeAllHref,
  children,
  collapsedCount = 3,
  expandInline = true,
}: BentoGridProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  const hasOverflow = childArray.length > collapsedCount;
  const visibleChildren = expandInline && !expanded ? childArray.slice(0, collapsedCount) : childArray;

  function handleSeeAll() {
    if (expandInline && hasOverflow) {
      setExpanded((prev) => !prev);
      return;
    }
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
          accessibilityLabel={`${expanded ? 'Show less' : 'See all'} ${title}`}
        >
          <Text style={styles.seeAll}>
            {expandInline && hasOverflow ? (expanded ? 'Show less' : 'See all') : 'See all'}
          </Text>
        </Pressable>
      </View>

      {/* 3-column tile row */}
      <View style={styles.grid}>{visibleChildren}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
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
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    rowGap: Spacing.two + 2,
  },
});
