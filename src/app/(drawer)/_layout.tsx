import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from 'react-native';

import { DrawerContent } from '@/components/navigation/DrawerContent';
import { Colors, Brand, Radius } from '@/constants/theme';

export default function DrawerLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(76, 14, 158, 0.4)', // Low-opacity primaryDark scrim
        drawerStyle: {
          width: 310,
          backgroundColor: Brand.bgGradientStart, // Lavender tint
          borderTopRightRadius: Radius.xl, // 28
          borderBottomRightRadius: Radius.xl, // 28
          borderWidth: 0,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: 'Home' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="practice" options={{ title: 'Practice' }} />
      <Drawer.Screen name="vocab" options={{ title: 'Vocab' }} />
      <Drawer.Screen name="progress" options={{ title: 'Progress' }} />
      <Drawer.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Drawer.Screen name="history" options={{ title: 'History' }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="subscription" options={{ title: 'Subscription' }} />
      <Drawer.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Drawer.Screen name="help" options={{ title: 'Help' }} />
      <Drawer.Screen name="daily-challenge" options={{ title: 'Daily Challenge' }} />
      <Drawer.Screen name="journey-map" options={{ title: 'Fluency Journey' }} />
    </Drawer>
  );
}
