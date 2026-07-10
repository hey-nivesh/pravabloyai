/**
 * VoiceSessionScreen  ·  app/session/[caseStudyId].tsx
 * ──────────────────────────────────────────────────────
 * Real-time bi-directional voice conversation screen for PravabloyAI.
 *
 * Architecture:
 *   useVoiceStream() hook ─► WebSocket relay (voiceGateway.ts) ─► Gemini Live API
 *
 * UI Sections:
 *   1. Header  — back button + scenario title + session timer
 *   2. Mascot  — floating 3D avatar, glow-ring driven by AI amplitude
 *   3. Waveform — 28-bar animated pulse synced to AI/user audio
 *   4. Status  — connection status badge with animated indicator
 *   5. Transcript — scrollable chat bubbles (user ↔ AI)
 *   6. Controls — Mute/Unmute toggle + End Session button
 *
 * Theme: #FFFFFF background · #7F22FD Electric Purple · #4C0E9E Royal Purple
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { CASE_STUDIES, type CaseStudy } from '@/constants/case-studies';
import { useVoiceStream } from '@/hooks/useVoiceStream';
import MascotAvatar from '@/components/session/MascotAvatar';
import WaveformVisualizer from '@/components/session/WaveformVisualizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  lavender: '#F3EEFF',
  lavendertint: '#EDE9FE',
  purple: '#7F22FD',
  purpleDark: '#4C0E9E',
  purpleGlow: '#A855F7',
  purpleRing: '#D8B4FE',
  textMain: '#1A0533',
  textSub: '#6B28C7',
  textMuted: '#9CA3AF',
  userBubble: '#7F22FD',
  aiBubble: '#F3EEFF',
  aiText: '#4C0E9E',
  statusGreen: '#10B981',
  statusOrange: '#F59E0B',
  statusRed: '#EF4444',
  border: '#EDE9FE',
  white: '#FFFFFF',
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function statusColor(
  status: string,
): { dot: string; label: string; text: string } {
  switch (status) {
    case 'connected':
      return { dot: C.statusGreen, label: 'Live', text: C.statusGreen };
    case 'connecting':
      return { dot: C.statusOrange, label: 'Connecting…', text: C.statusOrange };
    case 'reconnecting':
      return { dot: C.statusOrange, label: 'Reconnecting…', text: C.statusOrange };
    case 'error':
      return { dot: C.statusRed, label: 'Connection lost', text: C.statusRed };
    default:
      return { dot: C.textMuted, label: 'Ready', text: C.textMuted };
  }
}

// ─── Pulsing status dot ────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.35 + 0.65 / scale.value,
  }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotOuter, animStyle, { backgroundColor: color }]} />
      <View style={[styles.dotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Transcript bubble ─────────────────────────────────────────────────────────
interface BubbleProps {
  sender: 'user' | 'ai';
  text: string;
}
const TranscriptBubble = React.memo(function TranscriptBubble({
  sender,
  text,
}: BubbleProps) {
  const isUser = sender === 'user';
  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify()}
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}
    >
      <Text
        style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}
      >
        {text}
      </Text>
    </Animated.View>
  );
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function VoiceSessionScreen() {
  const router = useRouter();
  const { caseStudyId } = useLocalSearchParams<{ caseStudyId: string }>();
  const insets = useSafeAreaInsets();

  const caseStudy: CaseStudy =
    CASE_STUDIES.find((cs) => cs.id === caseStudyId) ?? CASE_STUDIES[0];

  // ── Voice hook ────────────────────────────────────────────────────────────
  const {
    status,
    aiSpeaking,
    userSpeaking,
    amplitude,
    aiAmplitude,
    transcript,
    error,
    isMuted,
    sessionId,
    connect,
    disconnect,
    endSession,
    toggleMute,
  } = useVoiceStream();

  // ── Session timer ─────────────────────────────────────────────────────────
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(
        () => setElapsedSecs((s) => s + 1),
        1000,
      );
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // ── Auto-connect on mount ─────────────────────────────────────────────────
  useEffect(() => {
    connect(caseStudy.id);
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll transcript ────────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (transcript.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [transcript.length]);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    const activeSessionId = sessionId;
    await endSession();
    await disconnect();
    if (activeSessionId) {
      router.replace({
        pathname: '/session/analysis/[sessionId]',
        params: { sessionId: activeSessionId, caseStudyId: caseStudy.id },
      });
      return;
    }
    router.back();
  }, [caseStudy.id, disconnect, endSession, router, sessionId]);

  // ── Derived waveform source ───────────────────────────────────────────────
  // Show AI waveform when AI is speaking, otherwise show user's mic level.
  const waveformAmplitude = aiSpeaking ? aiAmplitude : amplitude;
  const waveformColor = aiSpeaking ? C.purple : C.purpleGlow;
  const waveformActive = aiSpeaking || userSpeaking;

  // ── Status indicator ──────────────────────────────────────────────────────
  const { dot: dotColor, label: statusLabel } = statusColor(status);
  const isConnecting = status === 'connecting' || status === 'reconnecting';

  // ── Mute button scale feedback ────────────────────────────────────────────
  const muteScale = useSharedValue(1);
  const muteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: muteScale.value }],
  }));

  const onMutePress = useCallback(() => {
    muteScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 8 }),
    );
    toggleMute();
  }, [toggleMute]);

  // ── End button press animation ────────────────────────────────────────────
  const endScale = useSharedValue(1);
  const endAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: endScale.value }],
  }));

  const onEndPress = useCallback(() => {
    endScale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 8 }),
    );
    handleEnd();
  }, [handleEnd]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Lavender background blobs ── */}
      <View style={styles.bgBlob1} pointerEvents="none" />
      <View style={styles.bgBlob2} pointerEvents="none" />

      {/* ── Header ── */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === 'android' ? insets.top + 8 : insets.top + 4,
          },
        ]}
      >
        <Pressable
          onPress={handleEnd}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <View style={styles.backBtnInner}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {caseStudy.title}
          </Text>
          <Text style={styles.headerSub}>{caseStudy.contextLine}</Text>
        </View>

        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formatTime(elapsedSecs)}</Text>
        </View>
      </Animated.View>

      {/* ── Status bar ── */}
      <Animated.View
        entering={FadeIn.delay(200).duration(350)}
        style={styles.statusRow}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={C.statusOrange} style={{ marginRight: 6 }} />
        ) : (
          <PulseDot color={dotColor} />
        )}
        <Text style={[styles.statusText, { color: dotColor }]}>
          {statusLabel}
        </Text>

        {error ? (
          <Text style={styles.errorText} numberOfLines={1}>
            {' · '}
            {error}
          </Text>
        ) : null}
      </Animated.View>

      {/* ── Mascot + Waveform zone ── */}
      <Animated.View
        entering={FadeInUp.delay(150).duration(500).springify()}
        style={styles.avatarZone}
      >
        {/* Mascot avatar */}
        <MascotAvatar
          aiAmplitude={aiAmplitude}
          aiSpeaking={aiSpeaking}
          size={152}
        />

        {/* Waveform — below avatar */}
        <View style={styles.waveformWrap}>
          <WaveformVisualizer
            amplitude={waveformAmplitude}
            color={waveformColor}
            barCount={28}
            height={56}
            active={waveformActive}
          />
        </View>

        {/* Speaking label */}
        <Animated.View style={styles.speakingLabel}>
          {aiSpeaking && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.speakingText}
            >
              🎙️ PravabloyAI is speaking…
            </Animated.Text>
          )}
          {!aiSpeaking && userSpeaking && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[styles.speakingText, { color: C.purpleGlow }]}
            >
              🎤 You're speaking…
            </Animated.Text>
          )}
          {!aiSpeaking && !userSpeaking && status === 'connected' && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[styles.speakingText, { color: C.textMuted }]}
            >
              Listening…
            </Animated.Text>
          )}
        </Animated.View>
      </Animated.View>

      {/* ── Transcript ── */}
      <Animated.View
        entering={SlideInDown.delay(300).duration(450).springify()}
        style={styles.transcriptCard}
      >
        <View style={styles.transcriptHeader}>
          <View style={styles.transcriptDot} />
          <Text style={styles.transcriptLabel}>Live Transcript</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.transcriptScroll}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {transcript.length === 0 && status === 'connected' && (
            <Text style={styles.emptyTranscript}>
              The conversation will appear here…
            </Text>
          )}
          {transcript.length === 0 && isConnecting && (
            <View style={styles.emptyConnecting}>
              <ActivityIndicator size="small" color={C.purple} />
              <Text style={[styles.emptyTranscript, { marginTop: 8 }]}>
                Starting session…
              </Text>
            </View>
          )}
          {transcript.map((turn, idx) => (
            <TranscriptBubble
              key={idx}
              sender={turn.sender}
              text={turn.text}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Controls ── */}
      <Animated.View
        entering={SlideInDown.delay(400).duration(450).springify()}
        style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Mute toggle */}
        <Animated.View style={muteAnimStyle}>
          <Pressable
            onPress={onMutePress}
            style={[
              styles.muteBtn,
              isMuted
                ? styles.muteBtnMuted
                : styles.muteBtnActive,
            ]}
            accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            accessibilityRole="button"
          >
            <Text style={styles.muteBtnIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text
              style={[
                styles.muteBtnLabel,
                { color: isMuted ? C.textMuted : C.white },
              ]}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* End session button */}
        <Animated.View style={endAnimStyle}>
          <Pressable
            onPress={onEndPress}
            style={styles.endBtn}
            accessibilityLabel="End session"
            accessibilityRole="button"
          >
            <Text style={styles.endBtnIcon}>⏹</Text>
            <Text style={styles.endBtnLabel}>End Session</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Background blobs
  bgBlob1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.lavendertint,
    opacity: 0.55,
  },
  bgBlob2: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.lavendertint,
    opacity: 0.45,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
  },
  backBtn: {
    marginRight: 8,
  },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.lavendertint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: C.purple,
    marginTop: -2,
    fontWeight: '300',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textMain,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 1,
  },
  timerBadge: {
    backgroundColor: C.lavendertint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.purpleRing,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.purple,
    fontVariant: ['tabular-nums'],
  },

  // Status row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dotWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  dotOuter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: C.statusRed,
    flex: 1,
  },

  // Mascot zone
  avatarZone: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  waveformWrap: {
    marginTop: 20,
    width: SCREEN_WIDTH - 48,
    backgroundColor: C.lavender,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  speakingLabel: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  speakingText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.purple,
    letterSpacing: 0.2,
  },

  // Transcript card
  transcriptCard: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
    // Shadow
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.lavender,
  },
  transcriptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.purple,
    marginRight: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.purpleDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    padding: 12,
    gap: 8,
  },
  emptyTranscript: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 14,
    marginTop: 16,
  },
  emptyConnecting: {
    alignItems: 'center',
    marginTop: 16,
  },

  // Bubbles
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: C.userBubble,
    borderBottomRightRadius: 5,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: C.aiBubble,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: C.purpleRing,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: C.white,
    fontWeight: '500',
  },
  bubbleTextAi: {
    color: C.aiText,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },

  // Mute button
  muteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radius.full,
    gap: 8,
    minWidth: 130,
    // Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  muteBtnActive: {
    backgroundColor: C.purple,
    shadowColor: C.purple,
    shadowOpacity: 0.45,
  },
  muteBtnMuted: {
    backgroundColor: C.lavendertint,
    borderWidth: 1.5,
    borderColor: C.purpleRing,
    shadowColor: C.purple,
    shadowOpacity: 0.1,
  },
  muteBtnIcon: {
    fontSize: 18,
  },
  muteBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // End button
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radius.full,
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    minWidth: 130,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  endBtnIcon: {
    fontSize: 16,
    color: '#DC2626',
  },
  endBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
});
