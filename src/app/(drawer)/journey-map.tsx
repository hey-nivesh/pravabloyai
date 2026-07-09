import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GamificationScreenHeader } from '@/components/gamification/GamificationScreenHeader';
import { Skeleton } from '@/components/home/Skeleton';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useJourneyMap, type JourneyNode, type JourneyNodeId } from '@/hooks/useJourneyMap';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const MAP_WIDTH = 340;
const MAP_HEIGHT = 520;

const NODE_LAYOUT: Record<JourneyNodeId, { x: number; y: number }> = {
  grammar_foundations: { x: 70, y: 430 },
  vocabulary_grove: { x: 120, y: 340 },
  casual_cove: { x: 170, y: 250 },
  executive_boardroom: { x: 220, y: 170 },
  negotiation_arena: { x: 270, y: 100 },
  mock_interview_summit: { x: 170, y: 40 },
};

function nodeIcon(id: JourneyNodeId): SymbolName {
  switch (id) {
    case 'grammar_foundations':
      return { ios: 'text.book.closed.fill', android: 'menu_book', web: 'menu_book' };
    case 'vocabulary_grove':
      return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
    case 'casual_cove':
      return { ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' };
    case 'executive_boardroom':
      return { ios: 'briefcase.fill', android: 'work', web: 'work' };
    case 'negotiation_arena':
      return { ios: 'scale.3d', android: 'balance', web: 'balance' };
    case 'mock_interview_summit':
      return { ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' };
    default:
      return { ios: 'star.fill', android: 'star', web: 'star' };
  }
}

function buildPath(): string {
  const order: JourneyNodeId[] = [
    'grammar_foundations',
    'vocabulary_grove',
    'casual_cove',
    'executive_boardroom',
    'negotiation_arena',
    'mock_interview_summit',
  ];
  const points = order.map((id) => NODE_LAYOUT[id]);
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q ${cx} ${prev.y} ${curr.x} ${curr.y}`;
  }
  return d;
}

export default function JourneyMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { nodes, currentNodeId, avatarUrl, loading, error } = useJourneyMap();

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [zoomLevel, setZoomLevel] = useState(1);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(2, Math.max(0.6, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      setZoomLevel(scale.value);
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const mapAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const adjustZoom = useCallback(
    (delta: number) => {
      const next = Math.min(2, Math.max(0.6, zoomLevel + delta));
      setZoomLevel(next);
      scale.value = withTiming(next, { duration: 200 });
      savedScale.value = next;
    },
    [zoomLevel, scale, savedScale],
  );

  const pathD = useMemo(() => buildPath(), []);
  const topPadding = Platform.OS === 'android' ? insets.top : insets.top + Spacing.two;
  const mapContainerWidth = Math.min(screenWidth - Spacing.three * 2, MaxContentWidth);

  const handleNodePress = (node: JourneyNode) => {
    if (node.status === 'locked') {
      Alert.alert('Locked', node.unlockHint);
      return;
    }
    if (node.categoryRoute) {
      router.push(node.categoryRoute as never);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      <View style={{ paddingTop: topPadding }}>
        <GamificationScreenHeader title="Fluency Journey" />
      </View>

      <View style={[styles.mapWrapper, { width: mapContainerWidth }]}>
        {loading ? (
          <Skeleton height={MAP_HEIGHT} borderRadius={Radius.xl} />
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <GestureDetector gesture={composed}>
              <Animated.View style={[styles.mapCanvas, mapAnimStyle]}>
                <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={styles.pathSvg}>
                  <Path
                    d={pathD}
                    stroke={Brand.primaryLight}
                    strokeWidth={6}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="0"
                    opacity={0.5}
                  />
                  <Path
                    d={pathD}
                    stroke={Brand.primary}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                  />
                </Svg>

                {nodes.map((node) => (
                  <MapNode
                    key={node.id}
                    node={node}
                    isCurrent={node.id === currentNodeId}
                    isBoss={node.id === 'mock_interview_summit'}
                    avatarUrl={avatarUrl}
                    onPress={() => handleNodePress(node)}
                  />
                ))}
              </Animated.View>
            </GestureDetector>

            <View style={styles.zoomControls}>
              <Pressable
                onPress={() => adjustZoom(0.2)}
                style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomPressed]}
                accessibilityLabel="Zoom in"
              >
                <Text style={styles.zoomBtnText}>+</Text>
              </Pressable>
              <Pressable
                onPress={() => adjustZoom(-0.2)}
                style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomPressed]}
                accessibilityLabel="Zoom out"
              >
                <Text style={styles.zoomBtnText}>−</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <ScrollView
        horizontal={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.four }}
      >
        <View style={styles.legend}>
          <LegendItem color={Brand.primary} label="Completed" />
          <LegendItem color={Brand.primaryLight} label="Current" />
          <LegendItem color="#D1D5DB" label="Locked" />
        </View>
      </ScrollView>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function MapNode({
  node,
  isCurrent,
  isBoss,
  avatarUrl,
  onPress,
}: {
  node: JourneyNode;
  isCurrent: boolean;
  isBoss: boolean;
  avatarUrl: string | null;
  onPress: () => void;
}) {
  const pos = NODE_LAYOUT[node.id];
  const reducedMotion = useReducedMotion() ?? false;
  const pulse = useSharedValue(1);

  const locked = node.status === 'locked';
  const completed = node.status === 'completed';

  useEffect(() => {
    if (isCurrent && !reducedMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        false,
      );
    }
  }, [isCurrent, reducedMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isCurrent && !reducedMotion ? pulse.value : 1 }],
  }));

  const size = isBoss ? 64 : 52;
  const icon = nodeIcon(node.id);
  const lockIcon: SymbolName = { ios: 'lock.fill', android: 'lock', web: 'lock' };
  const checkIcon: SymbolName = { ios: 'checkmark', android: 'check', web: 'check' };

  const avatarSource = avatarUrl
    ? { uri: avatarUrl }
    : require('@/assets/images/avatar.png');

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.nodeContainer,
        { left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size + 36 },
      ]}
    >
      {isCurrent && (
        <View style={styles.avatarPin}>
          <Image source={avatarSource} style={styles.avatarPinImage} contentFit="cover" />
        </View>
      )}

      <Animated.View
        style={[
          styles.nodeCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: locked ? 0.45 : 1,
          },
          completed && styles.nodeCompleted,
          isCurrent && styles.nodeCurrent,
          isBoss && styles.nodeBoss,
          pulseStyle,
        ]}
      >
        {locked ? (
          <SymbolView name={lockIcon} size={isBoss ? 22 : 18} tintColor={Brand.grayText} />
        ) : completed ? (
          <SymbolView name={checkIcon} size={isBoss ? 22 : 18} tintColor="#FFFFFF" />
        ) : (
          <SymbolView name={icon} size={isBoss ? 24 : 20} tintColor={isCurrent ? '#FFFFFF' : Brand.primary} />
        )}
        <View style={styles.nodeNumberBadge}>
          <Text style={styles.nodeNumberText}>{node.number}</Text>
        </View>
      </Animated.View>

      <Text
        style={[styles.nodeLabel, locked && styles.nodeLabelLocked]}
        numberOfLines={2}
      >
        {node.shortLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bgGradientStart,
  },
  gradientBg: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    experimental_backgroundImage: `linear-gradient(180deg, ${Brand.bgGradientStart} 0%, #F3E8FF 50%, ${Brand.bgGradientEnd} 100%)`,
  },
  mapWrapper: {
    flex: 1,
    alignSelf: 'center',
    marginHorizontal: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    minHeight: MAP_HEIGHT + 40,
    borderWidth: 1,
    borderColor: Brand.primaryBadgeBg,
  },
  mapCanvas: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
  pathSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  nodeContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  avatarPin: {
    position: 'absolute',
    top: -28,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.primary,
    backgroundColor: Brand.cardBg,
    overflow: 'hidden',
  },
  avatarPinImage: {
    width: '100%',
    height: '100%',
  },
  nodeCircle: {
    backgroundColor: Brand.cardBg,
    borderWidth: 3,
    borderColor: Brand.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeCompleted: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primaryDark,
  },
  nodeCurrent: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primaryLight,
  },
  nodeBoss: {
    borderWidth: 4,
    borderColor: Brand.accentAmber,
  },
  nodeNumberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Brand.primaryDark,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  nodeNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  nodeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: Brand.primaryDark,
    textAlign: 'center',
    maxWidth: 72,
  },
  nodeLabelLocked: {
    color: Brand.grayText,
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    gap: Spacing.one + 2,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  zoomPressed: {
    opacity: 0.8,
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: Brand.primaryDark,
    lineHeight: 24,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: Brand.grayText,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    padding: Spacing.three,
    fontSize: 13,
  },
});
