import React, { useEffect, useState } from 'react';
import { type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoiceQuickStartSheet } from '@/components/navigation/VoiceQuickStartSheet';
import { Brand, Radius, TabBarHeight, TabBarFabSize } from '@/constants/theme';
import { useVoiceStart } from '@/context/voice-start-context';
import { useUserProfile } from '@/hooks/useUserProfile';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type TabConfig = {
  routeName: string;
  label: string;
  icon: SymbolName;
  isAvatar?: boolean;
};

const LEFT_TABS: TabConfig[] = [
  {
    routeName: 'index',
    label: 'Home',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    routeName: 'practice',
    label: 'Modules',
    icon: { ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' },
  },
];

const RIGHT_TABS: TabConfig[] = [
  {
    routeName: 'vocab',
    label: 'Vault',
    icon: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  },
  {
    routeName: 'profile',
    label: 'Profile',
    icon: { ios: 'person.fill', android: 'person', web: 'person' },
    isAvatar: true,
  },
];

const MIC_ICON: SymbolName = { ios: 'mic.fill', android: 'mic', web: 'mic' };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CenterVoiceFab({ onPress }: { onPress: () => void }) {
  const reducedMotion = useReducedMotion() ?? false;
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    if (reducedMotion) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [reducedMotion, glow]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1 + glow.value * 0.12 }],
  }));

  return (
    <View style={styles.fabSlot} pointerEvents="box-none">
      <Animated.View style={[styles.fabGlow, glowStyle]} pointerEvents="none" />
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 260 });
        }}
        style={[styles.fab, fabStyle]}
        accessibilityRole="button"
        accessibilityLabel="Start voice session"
      >
        <View style={styles.fabInnerHighlight} />
        <SymbolView name={MIC_ICON} size={26} tintColor="#FFFFFF" />
      </AnimatedPressable>
    </View>
  );
}

type TabButtonProps = {
  config: TabConfig;
  focused: boolean;
  onPress: () => void;
  avatarUri?: string | null;
};

function TabButton({ config, focused, onPress, avatarUri }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={config.label}
    >
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        {config.isAvatar ? (
          <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require('@/assets/images/avatar.png')
            }
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <SymbolView
            name={config.icon}
            size={20}
            tintColor={focused ? Brand.primary : Brand.grayText}
          />
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{config.label}</Text>
    </Pressable>
  );
}

export function CustomBottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useUserProfile();
  const { scenarioCaseStudyId } = useVoiceStart();
  const [sheetVisible, setSheetVisible] = useState(false);

  const activeRoute = state.routes[state.index]?.name;

  const navigateTo = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleVoicePress = () => {
    if (scenarioCaseStudyId) {
      router.push(`/session/${scenarioCaseStudyId}` as never);
      return;
    }
    setSheetVisible(true);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, SpacingCompat),
            height: TabBarHeight + Math.max(insets.bottom, SpacingCompat),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.bar}>
          <View style={styles.sideCluster}>
            {LEFT_TABS.map((tab) => (
              <TabButton
                key={tab.routeName}
                config={tab}
                focused={activeRoute === tab.routeName}
                onPress={() => navigateTo(tab.routeName)}
              />
            ))}
          </View>

          <View style={styles.fabSpacer} />

          <View style={styles.sideCluster}>
            {RIGHT_TABS.map((tab) => (
              <TabButton
                key={tab.routeName}
                config={tab}
                focused={activeRoute === tab.routeName}
                onPress={() => navigateTo(tab.routeName)}
                avatarUri={tab.isAvatar ? profile?.avatar_url : undefined}
              />
            ))}
          </View>

          <CenterVoiceFab onPress={handleVoicePress} />
        </View>
      </View>

      <VoiceQuickStartSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

const SpacingCompat = 8;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.08)',
    borderBottomWidth: 0,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 14,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${Brand.bgGradientStart}88 100%)`,
    ...Platform.select({
      ios: { marginBottom: 2 },
      default: { marginBottom: 0 },
    }),
  },
  sideCluster: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  fabSpacer: {
    width: TabBarFabSize + 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 52,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.primaryLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Brand.grayText,
  },
  tabLabelActive: {
    color: Brand.primary,
    fontWeight: '800',
  },
  fabSlot: {
    position: 'absolute',
    left: '50%',
    marginLeft: -(TabBarFabSize / 2),
    top: -(TabBarFabSize * 0.34),
    width: TabBarFabSize,
    height: TabBarFabSize,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fabGlow: {
    position: 'absolute',
    width: TabBarFabSize + 18,
    height: TabBarFabSize + 18,
    borderRadius: (TabBarFabSize + 18) / 2,
    backgroundColor: Brand.primaryLight,
  },
  fab: {
    width: TabBarFabSize,
    height: TabBarFabSize,
    borderRadius: TabBarFabSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(145deg, ${Brand.primaryLight} 0%, ${Brand.primary} 50%, ${Brand.primaryDark} 100%)`,
    backgroundColor: Brand.primary,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  fabInnerHighlight: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
