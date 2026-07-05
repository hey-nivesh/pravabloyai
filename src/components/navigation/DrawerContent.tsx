import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { DrawerContentComponentProps } from 'expo-router/drawer';
import { SymbolView } from 'expo-symbols';
import Constants from 'expo-constants';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { DrawerProfileHeader } from './DrawerProfileHeader';
import { DrawerNavItem } from './DrawerNavItem';

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  const { signOut } = useAuth();
  const { user, profile, loading } = useUserProfile();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleNavigate = (route: string) => {
    // Close drawer first for smooth transition
    props.navigation.closeDrawer();
    router.navigate(route as any);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            props.navigation.closeDrawer();
            await signOut();
            // AuthProvider's onAuthStateChange will set session → null,
            // which triggers the routing guard in _layout.tsx to redirect
            // to /(auth)/login automatically.
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Helper to determine if a route is active
  const isRouteActive = (route: string) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      {/* Scrollable list content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header section - wrapped with safe area inset at the top */}
        <View style={{ paddingTop: insets.top }}>
          <DrawerProfileHeader
            profile={profile}
            email={user?.email}
            loading={loading}
            onPress={() => handleNavigate('/profile')}
          />
        </View>

        {/* Navigation list */}
        <View style={styles.navList}>
          <DrawerNavItem
            label="Home"
            icon={{ ios: 'house.fill', android: 'home', web: 'home' }}
            isActive={isRouteActive('/') && pathname !== '/explore'}
            onPress={() => handleNavigate('/')}
            accessibilityLabel="Navigate to Home Dashboard"
          />

          <DrawerNavItem
            label="Practice Modes"
            icon={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' }}
            isActive={isRouteActive('/practice')}
            onPress={() => handleNavigate('/practice')}
            accessibilityLabel="Navigate to Practice Modes Scenario Picker"
          />

          <DrawerNavItem
            label="Vocab Vault"
            icon={{ ios: 'books.vertical.fill', android: 'book', web: 'book' }}
            isActive={isRouteActive('/vocab')}
            onPress={() => handleNavigate('/vocab')}
            accessibilityLabel="Navigate to Vocabulary Vault"
          />

          <DrawerNavItem
            label="Progress"
            icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
            isActive={isRouteActive('/progress')}
            onPress={() => handleNavigate('/progress')}
            accessibilityLabel="Navigate to Progress Dashboard"
          />

          <DrawerNavItem
            label="Analytics Report"
            icon={{ ios: 'doc.text.magnifyingglass', android: 'analytics', web: 'analytics' }}
            isActive={isRouteActive('/analytics')}
            onPress={() => handleNavigate('/analytics')}
            accessibilityLabel="Navigate to Analytics Report"
          />

          <DrawerNavItem
            label="Session History"
            icon={{ ios: 'clock.fill', android: 'history', web: 'history' }}
            isActive={isRouteActive('/history')}
            onPress={() => handleNavigate('/history')}
            accessibilityLabel="Navigate to Session History"
          />

          <DrawerNavItem
            label="Notifications Settings"
            icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            isActive={isRouteActive('/notifications')}
            onPress={() => handleNavigate('/notifications')}
            accessibilityLabel="Navigate to Notifications Settings"
          />

          <DrawerNavItem
            label="Upgrade to Pro"
            icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
            isActive={isRouteActive('/subscription')}
            onPress={() => handleNavigate('/subscription')}
            accessibilityLabel="Upgrade to premium membership subscription"
            rightBadge="PRO"
            isSpecialUpgrade={true}
          />

          <DrawerNavItem
            label="Privacy & Data Controls"
            icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            isActive={isRouteActive('/privacy')}
            onPress={() => handleNavigate('/privacy')}
            accessibilityLabel="Navigate to Privacy and Data Controls"
          />

          <DrawerNavItem
            label="Help & Support"
            icon={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
            isActive={isRouteActive('/help')}
            onPress={() => handleNavigate('/help')}
            accessibilityLabel="Navigate to Help and Support"
          />
        </View>
      </ScrollView>

      {/* Pinned Bottom Area */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        
        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign out of the application"
        >
          <View style={styles.signOutIconBg}>
            <SymbolView 
              name={{ ios: 'rectangle.portrait.and.arrow.right.fill', android: 'logout', web: 'logout' }} 
              size={14} 
              tintColor="#EF4444" 
            />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version Display */}
        <Text style={styles.versionText}>v{appVersion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart, // lavender tint background
  },
  scrollContent: {
    flexGrow: 1,
  },
  navList: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(76, 14, 158, 0.08)',
    marginBottom: Spacing.two,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)', // light red/danger tint
    gap: Spacing.three,
  },
  signOutPressed: {
    opacity: 0.75,
  },
  signOutIconBg: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm - 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 11,
    color: Brand.grayText,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: Spacing.one,
  },
});
