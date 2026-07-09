import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/home/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type HomeStatsRowProps = {
  totalMinutes: number;
  sessionsCompleted: number;
  loading?: boolean;
};

const ARROW: SymbolName = {
  ios: 'arrow.up.right',
  android: 'north_east',
  web: 'north_east',
};

export function HomeStatsRow({ totalMinutes, sessionsCompleted, loading }: HomeStatsRowProps) {
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.row}>
        <Skeleton height={110} borderRadius={Radius.xl} style={{ flex: 1 }} />
        <Skeleton height={110} borderRadius={Radius.xl} style={{ flex: 1 }} />
      </View>
    );
  }

  const hours = totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : null;

  return (
    <View style={styles.row}>
      <StatCard
        icon={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
        iconBg={Brand.accentOrangeLight}
        iconColor={Brand.accentOrange}
        value={hours ? `${hours} Hours` : `${Math.round(totalMinutes)} min`}
        label="Total Practice Time"
        onPress={() => router.push('/history' as never)}
      />
      <StatCard
        icon={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
        iconBg={Brand.primaryBadgeBg}
        iconColor={Brand.primary}
        value={`${sessionsCompleted}`}
        label="Sessions Completed"
        onPress={() => router.push('/history' as never)}
      />
    </View>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  onPress,
}: {
  icon: SymbolName;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <SymbolView name={icon} size={20} tintColor={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.fab}>
        <SymbolView name={ARROW} size={14} tintColor={Brand.primaryDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 2,
  },
  card: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    minHeight: 110,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.primaryDark,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.grayText,
    lineHeight: 15,
    paddingRight: Spacing.four,
  },
  fab: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});
