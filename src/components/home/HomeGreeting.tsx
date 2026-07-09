import { StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';

type HomeGreetingProps = {
  firstName: string;
  loading?: boolean;
};

export function HomeGreeting({ firstName, loading }: HomeGreetingProps) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton width="70%" height={28} borderRadius={Radius.sm} />
        <Skeleton width="90%" height={16} borderRadius={Radius.sm} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hello}>
        Hello, <Text style={styles.name}>{firstName}!</Text>
      </Text>
      <Text style={styles.subline}>
        Level up your fluency with <Text style={styles.brand}>PravabloyAI</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  hello: {
    fontSize: 26,
    fontWeight: '700',
    color: Brand.primaryDark,
    letterSpacing: -0.5,
  },
  name: {
    color: Brand.primary,
  },
  subline: {
    fontSize: 14,
    color: Brand.grayText,
    fontWeight: '500',
    lineHeight: 20,
  },
  brand: {
    color: Brand.primary,
    fontWeight: '700',
  },
});
