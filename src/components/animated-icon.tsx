import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { SplashScene } from '@/components/splash/SplashScene';
import { useHomeData } from '@/context/home-data-context';
import { SPLASH_MIN_DURATION_MS, useSplashReadiness } from '@/hooks/use-splash-readiness';

const EXIT_CONTENT_MS = 350;
const EXIT_OVERLAY_MS = 400;

export function AnimatedSplashOverlay() {
  const { tiles, allReady: resourcesReady, timedOut } = useSplashReadiness();
  const { ready: homeReady } = useHomeData();
  const allReady = resourcesReady && homeReady;

  const [nativeHidden, setNativeHidden] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [allowTouches, setAllowTouches] = useState(false);
  const exitStarted = useRef(false);
  const mountTime = useRef(Date.now());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    SplashScreen.hideAsync()
      .catch(() => {
        // Native splash may already be hidden during fast refresh.
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) {
          setNativeHidden(true);
        }
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) setMinElapsed(true);
    }, SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!nativeHidden) return;
    const canExit = (allReady && minElapsed) || timedOut;
    if (!canExit || exitStarted.current) return;

    exitStarted.current = true;
    setExiting(true);
    setAllowTouches(true);

    const elapsed = Date.now() - mountTime.current;
    const remainingMin = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);
    const delay = timedOut && !allReady ? 0 : remainingMin;

    const timer = setTimeout(() => {
      if (mountedRef.current) setVisible(false);
    }, delay + EXIT_CONTENT_MS + EXIT_OVERLAY_MS);

    return () => clearTimeout(timer);
  }, [allReady, minElapsed, nativeHidden, timedOut]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(EXIT_OVERLAY_MS)}
      pointerEvents={allowTouches ? 'none' : 'auto'}
      style={styles.splashOverlay}
    >
      <SplashScene tiles={tiles} homeReady={homeReady} exiting={exiting} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
