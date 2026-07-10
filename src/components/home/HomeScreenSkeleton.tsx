import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';

/** Full-page placeholder shown until all home data is prefetched. */
export function HomeScreenSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerCenter}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={styles.headerText}>
            <Skeleton width={120} height={16} borderRadius={Radius.sm} />
            <Skeleton width={160} height={22} borderRadius={Radius.sm} />
          </View>
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      <Skeleton height={28} borderRadius={Radius.sm} style={styles.block} />
      <Skeleton height={168} borderRadius={Radius.xl} style={styles.block} />
      <Skeleton height={120} borderRadius={Radius.xl} style={styles.block} />
      <Skeleton height={72} borderRadius={Radius.lg} style={styles.block} />
      <Skeleton height={100} borderRadius={Radius.xl} style={styles.block} />
      <Skeleton height={88} borderRadius={Radius.xl} style={styles.block} />
      <Skeleton height={140} borderRadius={Radius.lg} style={styles.block} />
      <Skeleton height={140} borderRadius={Radius.lg} style={styles.block} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  block: {
    width: '100%',
    backgroundColor: Brand.primaryBadgeBg,
  },
});
