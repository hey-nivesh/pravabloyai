import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ICON_MAP: SymbolName = { ios: 'map.fill', android: 'map', web: 'map' };

export function JourneyMapEntryCard() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/journey-map' as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Open fluency journey map"
    >
      <View style={styles.iconBadge}>
        <SymbolView name={ICON_MAP} size={22} tintColor={Brand.primary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.eyebrow}>Fluency Journey</Text>
        <Text style={styles.title}>Explore Your Skill Path</Text>
        <Text style={styles.subtitle}>From grammar foundations to the interview summit</Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={Brand.grayText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.two + 2,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Brand.primaryBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    color: Brand.grayText,
  },
});
