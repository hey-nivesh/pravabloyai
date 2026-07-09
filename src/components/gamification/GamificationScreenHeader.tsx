import { type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type GamificationScreenHeaderProps = {
  title: string;
  showBell?: boolean;
};

const ICON_BACK: SymbolName = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' };
const ICON_BELL: SymbolName = { ios: 'bell.fill', android: 'notifications', web: 'notifications' };

export function GamificationScreenHeader({ title, showBell = true }: GamificationScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <SymbolView name={ICON_BACK} size={20} tintColor={Brand.primaryDark} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {showBell ? (
        <Pressable
          onPress={() => router.push('/notifications' as never)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <SymbolView name={ICON_BELL} size={18} tintColor={Brand.primaryDark} />
        </Pressable>
      ) : (
        <View style={styles.iconBtnSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBtnSpacer: {
    width: 40,
  },
  pressed: {
    opacity: 0.75,
  },
});
