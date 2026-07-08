import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  AccessibilityInfo,
  Modal,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { createAudioPlayer, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, type AudioPlayer } from 'expo-audio';

import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { CASE_STUDIES, CaseStudy } from '../(drawer)/practice';
import { useVoiceStream } from '@/hooks/useVoiceStream';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// We import Lottie dynamically to prevent crash if not installed/configured properly
let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch (e) {
  console.warn('Lottie is not available, falling back to Reanimated placeholders.');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VoiceSessionScreen() {
  const router = useRouter();
  const { caseStudyId } = useLocalSearchParams<{ caseStudyId: string }>();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const { session: authSession } = useAuth();

  // Find the selected scenario
  const caseStudy = CASE_STUDIES.find((cs) => cs.id === caseStudyId) || CASE_STUDIES[0];

  // Screen flow state: 1 = Ready, 2 = Live, 3 = Feedback
  const [screenState, setScreenState] = useState<1 | 2 | 3>(1);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(15); // Stub entitlement
  const [showTranscript, setShowTranscript] = useState(true);
  
  // Post-session feedback loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedPhrases, setSavedPhrases] = useState<string[]>([]);
  const [saveVaultAnimated, setSaveVaultAnimated] = useState(false);
  const [activeVoiceSessionId, setActiveVoiceSessionId] = useState<string | null>(null);
  const [analyticsReport, setAnalyticsReport] = useState<any | null>(null);

  // Audio Pronunciation sound reference
  const pronunciationSoundRef = useRef<AudioPlayer | null>(null);
  const pronunciationReleasedRef = useRef(false); // double-release guard

  // Reanimated shared values
  const orbScale = useSharedValue(1);
  const orbGlow = useSharedValue(0.5);
  const userVolume = useSharedValue(0);
  const aiVolume = useSharedValue(0);

  // Feedback stage values
  const fluencyProgress = useSharedValue(0);
  const wpmDialAnim = useSharedValue(0);

  // Circular progress indicator styles (moved to top-level to avoid hook violation)
  const animatedFluencyStyle = useAnimatedStyle(() => {
    return {
      opacity: fluencyProgress.value,
      transform: [{ scale: interpolate(fluencyProgress.value, [0, 1], [0.8, 1]) }],
    };
  });

  const animatedDialStyle = useAnimatedStyle(() => {
    const rotation = interpolate(wpmDialAnim.value, [0, 1], [-90, 90]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  // Audio amplitude monitoring
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Voice hook
  const voice = useVoiceStream({
    onAiSpeechStart: () => {
      aiVolume.value = withRepeat(withTiming(1, { duration: 300 }), -1, true);
    },
    onAiSpeechEnd: () => {
      aiVolume.value = withTiming(0, { duration: 200 });
    },
    onSpeechStart: () => {
      userVolume.value = withRepeat(withTiming(1, { duration: 250 }), -1, true);
    },
    onSpeechEnd: () => {
      userVolume.value = withTiming(0, { duration: 200 });
    },
    onInterrupted: () => {
      // Barge-in cut off AI ripples
      aiVolume.value = withTiming(0, { duration: 100 });
      AccessibilityInfo.announceForAccessibility('AI response interrupted.');
    },
    onTranscriptReceived: (text, isFinal) => {
      if (isFinal) {
        AccessibilityInfo.announceForAccessibility(`Transcript: ${text}`);
      }
    },
  });

  // Handle ambient breathing for Orb in State 1
  useEffect(() => {
    if (screenState === 1) {
      if (isReducedMotion) {
        orbScale.value = 1;
        orbGlow.value = 0.8;
      } else {
        orbScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 2000 }),
            withTiming(0.94, { duration: 2000 })
          ),
          -1,
          true
        );
        orbGlow.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 2000 }),
            withTiming(0.4, { duration: 2000 })
          ),
          -1,
          true
        );
      }
    } else {
      cancelAnimation(orbScale);
      cancelAnimation(orbGlow);
    }
  }, [screenState, isReducedMotion]);

  // Keep track of session elapsed time in State 2
  useEffect(() => {
    if (screenState === 2) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          if (prev >= 600) { // Limit session to 10 min
            handleEndSession();
            return prev;
          }
          return prev + 1;
        });
        setMinutesRemaining((prev) => Math.max(0, prev - 1 / 60));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screenState]);

  // Handle TTS / vocabulary word pronunciation
  const playWordPronunciation = async (word: string) => {
    try {
      // Release any existing player (guarded against double-release)
      if (pronunciationSoundRef.current && !pronunciationReleasedRef.current) {
        pronunciationReleasedRef.current = true;
        try { pronunciationSoundRef.current.remove(); } catch {}
        pronunciationSoundRef.current = null;
      }
      pronunciationReleasedRef.current = false;
      AccessibilityInfo.announceForAccessibility(`Pronouncing: ${word}`);

      // Stub word pronunciation — plays a short chime (replace with real TTS URL from backend)
      const player = createAudioPlayer({ uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' });
      pronunciationSoundRef.current = player;
      pronunciationReleasedRef.current = false;
      player.play();

      // Stop the chime after 1.5 seconds
      setTimeout(() => {
        if (pronunciationSoundRef.current === player && !pronunciationReleasedRef.current) {
          pronunciationReleasedRef.current = true;
          try { player.remove(); } catch {}
          pronunciationSoundRef.current = null;
        }
      }, 1500);

    } catch (e) {
      console.warn('Word pronunciation playback failed', e);
    }
  };

  // Check microphone permissions
  const handleStartAttempt = async () => {
    const permission = await getRecordingPermissionsAsync();
    if (permission.status !== 'granted') {
      setShowPermissionModal(true);
    } else {
      void startVoiceSession();
    }
  };

  const requestMicPermissions = async () => {
    setShowPermissionModal(false);
    const askPermission = await requestRecordingPermissionsAsync();
    if (askPermission.status === 'granted') {
      void startVoiceSession();
    } else {
      AccessibilityInfo.announceForAccessibility('Microphone permission denied.');
    }
  };

  const startVoiceSession = async () => {
    setScreenState(2);
    const sid = await voice.connect(caseStudy.id);
    setActiveVoiceSessionId(sid);
    AccessibilityInfo.announceForAccessibility('Session started. Start speaking.');
  };

  const handleEndSession = () => {
    voice.disconnect();
    setScreenState(3);
    AccessibilityInfo.announceForAccessibility('Analyzing your conversation. Please wait.');

    setIsAnalyzing(true);
    setAnalyticsReport(null);

    const sid = activeVoiceSessionId;
    const userId = authSession?.user?.id;
    if (!sid) {
      setIsAnalyzing(false);
      // Fallback animations
      fluencyProgress.value = withSpring(0.86, { damping: 12 });
      wpmDialAnim.value = withSpring(0.2, { damping: 10 });
      return;
    }

    void (async () => {
      const startedAt = Date.now();
      const timeoutMs = 20000;
      let report: any | null = null;

      // Poll until the backend finishes writing analytics_reports.
      while (Date.now() - startedAt < timeoutMs) {
        try {
          const q = supabase
            .from('analytics_reports')
            .select('*')
            .eq('voice_session_id', sid)
            .order('created_at', { ascending: false })
            .limit(1);

          const { data } = userId ? await q.eq('user_id', userId) : await q;

          if (data && data.length > 0) {
            report = data[0];
            break;
          }
        } catch (e) {
          // ignore and retry
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      setAnalyticsReport(report);
      setIsAnalyzing(false);

      const full = report?.full_report ?? {};
      const score = Number(report?.score ?? full.overallScore ?? 86);
      const fillerCount = Number(report?.filler_count ?? full.fillerWordsCount ?? 0);

      // Stage results animations
      fluencyProgress.value = withSpring(Math.max(0, Math.min(1, score / 100)), { damping: 12 });
      wpmDialAnim.value = withSpring(Math.max(0, Math.min(1, fillerCount / 10)), { damping: 10 });

      AccessibilityInfo.announceForAccessibility(
        `Analysis ready. Your Fluency score is ${Math.round(score)} percent.`,
      );
    })();
  };

  // Reset and restart practice
  const handleRestart = () => {
    setScreenState(1);
    setElapsedTime(0);
    voice.disconnect();
    setActiveVoiceSessionId(null);
    setAnalyticsReport(null);
  };

  // Save phrases animation / handler
  const handleSavePhrase = (phrase: string) => {
    if (savedPhrases.includes(phrase)) return;
    setSavedPhrases((prev) => [...prev, phrase]);
    setSaveVaultAnimated(true);
    AccessibilityInfo.announceForAccessibility(`Saved "${phrase}" to Vocab Vault.`);
    setTimeout(() => setSaveVaultAnimated(false), 1000);
  };

  // Reanimated style definitions
  const breathingOrbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: orbScale.value }],
      shadowOpacity: orbGlow.value,
      shadowRadius: interpolate(orbGlow.value, [0.4, 0.8], [12, 30]),
    };
  });

  const liveOrbStyle = useAnimatedStyle(() => {
    const scaleFactor = 1 + voice.amplitude * 0.35 + (voice.aiSpeaking ? voice.aiAmplitude * 0.25 : 0);
    return {
      transform: [{ scale: scaleFactor }],
      shadowColor: voice.aiSpeaking ? '#A855F7' : Brand.primary,
      shadowOpacity: 0.8,
      shadowRadius: 20 + scaleFactor * 10,
    };
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatMinutes = (min: number) => {
    return `${Math.ceil(min)} min left today`;
  };

  // Render State 1: Ready Screen
  const renderReadyState = () => {
    return (
      <View style={styles.stateContainer}>
        {/* Scenario Header Info */}
        <View style={styles.briefHeader}>
          <Text style={styles.contextLabel}>{caseStudy.contextLine}</Text>
          <Text style={styles.titleText}>{caseStudy.title}</Text>
        </View>

        {/* Breathing Voice Orb */}
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.voiceOrb, breathingOrbStyle]}>
            <SymbolView
              name={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }}
              size={56}
              tintColor="#FFFFFF"
            />
          </Animated.View>
          <Text style={styles.orbStatusText}>Start Conversation</Text>
        </View>

        {/* Suggested RAG vocabulary pills */}
        <View style={styles.vocabSuggestionSection}>
          <Text style={styles.sectionTitle}>Warm-up Key Vocabulary</Text>
          <Text style={styles.sectionSub}>Tap to hear correct native pronunciation</Text>
          <View style={styles.pillRow}>
            {caseStudy.suggestions.map((word) => (
              <Pressable
                key={word}
                style={({ pressed }) => [styles.vocabPill, pressed && styles.vocabPillPressed]}
                onPress={() => playWordPronunciation(word)}
                accessibilityRole="button"
                accessibilityLabel={`Pronounce ${word}`}
              >
                <SymbolView
                  name={{ ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }}
                  size={12}
                  tintColor={Brand.primary}
                />
                <Text style={styles.vocabPillText}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionFooter}>
          <Pressable
            style={({ pressed }) => [styles.micButton, pressed && styles.micButtonPressed]}
            onPress={handleStartAttempt}
            accessibilityRole="button"
            accessibilityLabel="Start coaching voice session"
          >
            <SymbolView
              name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
              size={36}
              tintColor="#FFFFFF"
            />
          </Pressable>
          <Text style={styles.micButtonLabel}>Tap to Start Speaking</Text>
        </View>

        {/* Custom Pre-Permission Card Modal */}
        <Modal
          visible={showPermissionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPermissionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconBadge}>
                <SymbolView
                  name={{ ios: 'mic.badge.plus', android: 'mic', web: 'mic' }}
                  size={32}
                  tintColor={Brand.primary}
                />
              </View>
              <Text style={styles.permissionTitle}>Microphone Access Required</Text>
              <Text style={styles.permissionDesc}>
                PravabloyAI uses Gemini Live audio streaming to analyze your spoken grammar, pronunciation, and pacing in real time. We do not store your private audio recordings.
              </Text>
              <Pressable
                style={styles.modalCta}
                onPress={requestMicPermissions}
                accessibilityRole="button"
                accessibilityLabel="Grant microphone access"
              >
                <Text style={styles.modalCtaText}>Grant Access</Text>
              </Pressable>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowPermissionModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel permission request"
              >
                <Text style={styles.modalCancelText}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Render State 2: Live Conversation Screen
  const renderLiveState = () => {
    const isReconnecting = voice.status === 'reconnecting';
    const isError = voice.status === 'error';

    return (
      <View style={styles.stateContainer}>
        {/* Top Info Bar */}
        <View style={styles.liveHeader}>
          <View style={styles.timerContainer}>
            <View style={styles.liveIndicator} />
            <Text style={styles.timerText}>{formatTimer(elapsedTime)}</Text>
          </View>

          <Text style={styles.entitlementText}>{formatMinutes(minutesRemaining)}</Text>
        </View>

        {/* Amplitude-Reactive Dynamic Voice Orb */}
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.activeVoiceOrb, liveOrbStyle]}>
            {/* Ripples when AI or user speaks */}
            {(voice.aiSpeaking || voice.userSpeaking) && (
              <View style={[StyleSheet.absoluteFill, styles.orbRippleOutline]} />
            )}
            <ImageMascot />
          </Animated.View>
          <Text style={styles.liveOrbStatus}>
            {voice.aiSpeaking
              ? 'Gemini is speaking...'
              : voice.userSpeaking
              ? 'Listening to you...'
              : 'Go ahead, speak!'}
          </Text>

          {/* ── Live Pacing Indicator ─────────────────────────────────────── */}
          {voice.livePacing && (
            <View style={styles.pacingRow}>
              <View
                style={[
                  styles.pacingDot,
                  // Amber if fillers are spiking (≥3) or WPM is very fast (>180) or very slow (<60) or pause detected
                  (voice.livePacing.fillerCount >= 3 ||
                    voice.livePacing.wpm > 180 ||
                    (voice.livePacing.wpm > 0 && voice.livePacing.wpm < 60) ||
                    voice.livePacing.pauseFlag)
                    ? styles.pacingDotAmber
                    : styles.pacingDotGreen,
                ]}
              />
              <Text style={styles.pacingLabel}>
                {voice.livePacing.wpm > 0 ? `${voice.livePacing.wpm} wpm` : 'Pacing'}
                {voice.livePacing.fillerCount > 0 ? ` · ${voice.livePacing.fillerCount} fillers` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Live Subtitle Transcript strip */}
        <View style={styles.transcriptSection}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptTitle}>Live Transcript</Text>
            <Pressable
              onPress={() => setShowTranscript(!showTranscript)}
              accessibilityRole="button"
              accessibilityLabel={showTranscript ? 'Hide transcript' : 'Show transcript'}
            >
              <SymbolView
                name={showTranscript ? { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye.fill', android: 'visibility', web: 'visibility' }}
                size={16}
                tintColor={Brand.primary}
              />
            </Pressable>
          </View>

          {showTranscript && (
            <ScrollView
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptList}
              ref={(ref) => ref?.scrollToEnd({ animated: true })}
            >
              {voice.transcript.length === 0 ? (
                <Text style={styles.emptyTranscript}>Say something to start the conversation...</Text>
              ) : (
                voice.transcript.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubble,
                      item.sender === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatBubbleText,
                        item.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Reconnect overlay */}
        {isReconnecting && (
          <View style={styles.overlayReconnect}>
            <View style={styles.reconnectCard}>
              <SymbolView
                name={{ ios: 'arrow.clockwise.circle', android: 'sync', web: 'sync' }}
                size={36}
                tintColor={Brand.primary}
              />
              <Text style={styles.reconnectText}>Reconnecting gateway...</Text>
            </View>
          </View>
        )}

        {/* Error / Retry overlay */}
        {isError && (
          <View style={styles.overlayReconnect}>
            <View style={styles.reconnectCard}>
              <SymbolView
                name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                size={36}
                tintColor="#EF4444"
              />
              <Text style={styles.reconnectText}>Connection failed</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={async () => {
                  const sid = await voice.connect(caseStudy.id);
                  setActiveVoiceSessionId(sid);
                }}
              >
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer controls */}
        <View style={styles.liveFooter}>
          {/* Vocab Pills relocated/shrunk */}
          <View style={styles.shrunkPillsRow}>
            {caseStudy.suggestions.slice(0, 2).map((word) => (
              <Pressable
                key={word}
                style={styles.shrunkPill}
                onPress={() => voice.sendMessage(word)}
                accessibilityRole="button"
                accessibilityLabel={`Insert phrase: ${word}`}
              >
                <Text style={styles.shrunkPillText}>{word}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.endSessionBtn, pressed && styles.endSessionBtnPressed]}
            onPress={handleEndSession}
            accessibilityRole="button"
            accessibilityLabel="End session and view report"
          >
            <SymbolView
              name={{ ios: 'phone.down.fill', android: 'call_end', web: 'call_end' }}
              size={18}
              tintColor="#FFFFFF"
            />
            <Text style={styles.endSessionText}>End Session</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render State 3: Post-Session Analysis Screen
  const renderFeedbackState = () => {
    if (isAnalyzing) {
      return (
        <View style={styles.loadingStateContainer}>
          {LottieView ? (
            <LottieView
              source={{ uri: 'https://lottie.host/49195b42-bd97-4c8d-bd95-234cf748d56b/8Nsk5N0K2P.json' }}
              autoPlay
              loop
              style={styles.lottieBrain}
            />
          ) : (
            <View style={styles.reanimatedLoader}>
              <SymbolView
                name={{ ios: 'brain.head.profile', android: 'psychology', web: 'psychology' }}
                size={64}
                tintColor={Brand.primary}
              />
            </View>
          )}
          <Text style={styles.loadingTitle}>Analyzing your conversation...</Text>
          <Text style={styles.loadingSubtitle}>
            Our AI is evaluating your vocabulary richness, pacing, and grammatical coherence.
          </Text>
        </View>
      );
    }

    const report = analyticsReport;
    const full = report?.full_report ?? {};
    const score = Number(report?.score ?? full.overallScore ?? 86);
    const fillerCount = Number(report?.filler_count ?? full.fillerWordsCount ?? 0);
    const grammarCorrections = report?.grammar_corrections ?? full.grammarCorrections ?? [];
    const vocabularyFeedback =
      report?.vocab_feedback ?? full.vocabularyFeedback ?? 'Great job! Continue practicing daily.';

    const fluencyLabel =
      score >= 85 ? 'Proficient' : score >= 70 ? 'Developing' : 'Getting Started';

    type GrammarGap = {
      said: string;
      better: string;
      explanation: string;
      audioUrl: string;
    };

    const grammarGaps: GrammarGap[] = (grammarCorrections ?? []).map((c: any) => ({
      said: String(c.original ?? ''),
      better: String(c.corrected ?? ''),
      explanation: String(c.explanation ?? ''),
      // Lightweight client-side pronunciation fallback (can be replaced with backend TTS later).
      audioUrl: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(String(c.corrected ?? c.original ?? ''))}&type=2`,
    }));
    return (
      <ScrollView
        style={styles.feedbackScroll}
        contentContainerStyle={[styles.feedbackContent, { paddingBottom: insets.bottom + Spacing.five }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration Badges Lottie confetti */}
        {LottieView && (
          <LottieView
            source={{ uri: 'https://lottie.host/e0ccfa0b-99f2-45e0-880c-26d9c6be220f/2m4vKskOsw.json' }}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}

        <Text style={styles.feedbackTitle}>Practice Completed! 🎉</Text>
        <View style={styles.reportAvatarRow}>
          <View style={styles.reportAvatarWrap}>
            <Image
              source={require('@/assets/images/avatar.png')}
              style={styles.reportAvatar}
              accessibilityLabel="AI coach avatar"
            />
          </View>
        </View>
        <Text style={styles.feedbackSubtitle}>Excellent progress today! Here is your speech performance report.</Text>

        {/* 1. Overall Fluency Score */}
        <Animated.View style={[styles.reportCard, animatedFluencyStyle]}>
          <Text style={styles.cardHeading}>Overall Fluency Score</Text>
          <View style={styles.fluencyContainer}>
            <View style={styles.circleProgressPlaceholder}>
              <Text style={styles.fluencyScoreNum}>{Math.round(score)}%</Text>
              <Text style={styles.fluencyLabel}>{fluencyLabel}</Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreDetailText}>🗯️ Filler words: {fillerCount}</Text>
              <Text style={styles.scoreDetailText}>🧩 Grammar corrections: {grammarGaps.length}</Text>
              <Text style={styles.scoreDetailText}>🧠 AI coach feedback loaded</Text>
            </View>
          </View>
        </Animated.View>

        {/* 2. Filler Words / Delivery Gauge */}
        <View style={styles.reportCard}>
          <Text style={styles.cardHeading}>Filler Words Detected</Text>
          <View style={styles.wpmContainer}>
            <View style={styles.speedometerContainer}>
              <View style={styles.gaugeBack} />
              <Animated.View style={[styles.gaugeNeedle, animatedDialStyle]} />
              <Text style={styles.gaugeVal}>{fillerCount}</Text>
              <Text style={styles.gaugeLabel}>Filler Words</Text>
            </View>
            <View style={styles.pacingExplanation}>
              <View
                style={[
                  styles.pacingStatusBadge,
                  { backgroundColor: fillerCount <= 2 ? Brand.accentGreenLight : Brand.accentAmberBg },
                ]}
              >
                <Text
                  style={[
                    styles.pacingStatusText,
                    { color: fillerCount <= 2 ? Brand.accentGreen : Brand.accentAmber },
                  ]}
                >
                  {fillerCount <= 2 ? 'Clean Delivery' : 'Needs Pausing'}
                </Text>
              </View>
              <Text style={styles.pacingDesc}>
                You used {fillerCount} filler word(s). Try pausing briefly instead of using fillers like
                “um”, “like”, or “you know”.
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Grammar Gaps list */}
        <View style={styles.reportCard}>
          <Text style={styles.cardHeading}>Key Grammar Adjustments</Text>
          <Text style={styles.cardSubtitle}>Compare your speech and tap the speaker to hear correct phrasing.</Text>
          
          <View style={styles.gapsList}>
            {grammarGaps.length === 0 ? (
              <Text style={styles.emptyTranscript}>No major grammar corrections detected in this session.</Text>
            ) : (
              grammarGaps.map((gap, i) => (
                <View key={i} style={styles.gapCard}>
                  <View style={styles.gapRowSaid}>
                    <Text style={styles.gapLabel}>You said:</Text>
                    <Text style={styles.gapTextSaid}>"{gap.said}"</Text>
                  </View>

                  <View style={styles.gapRowBetter}>
                    <View style={styles.betterTitleRow}>
                      <Text style={styles.betterLabel}>Recommended alternative:</Text>
                      <Pressable
                        style={styles.audioPlayBtn}
                        onPress={async () => {
                          try {
                            if (pronunciationSoundRef.current) {
                              pronunciationSoundRef.current.release();
                              pronunciationSoundRef.current = null;
                            }
                            const player = createAudioPlayer({ uri: gap.audioUrl });
                            pronunciationSoundRef.current = player;
                            player.play();
                          } catch {}
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Listen to pronunciation alternative"
                      >
                        <SymbolView
                          name={{ ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }}
                          size={14}
                          tintColor={Brand.primary}
                        />
                      </Pressable>
                    </View>
                    <Text style={styles.gapTextBetter}>"{gap.better}"</Text>

                    {!!gap.explanation && (
                      <Text style={styles.gapExplanationText}>
                        {gap.explanation}
                      </Text>
                    )}
                  </View>

                  {/* Save to Vault Action */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveVaultPill,
                      savedPhrases.includes(gap.better) && styles.saveVaultPillSaved,
                      pressed && styles.saveVaultPillPressed,
                    ]}
                    onPress={() => handleSavePhrase(gap.better)}
                    accessibilityRole="button"
                    accessibilityLabel="Save phrase to vocabulary vault"
                  >
                    <SymbolView
                      name={
                        savedPhrases.includes(gap.better)
                          ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                          : { ios: 'folder.badge.plus', android: 'create_new_folder', web: 'create_new_folder' }
                      }
                      size={13}
                      tintColor={savedPhrases.includes(gap.better) ? Brand.accentGreen : Brand.primary}
                    />
                    <Text
                      style={[
                        styles.saveVaultText,
                        savedPhrases.includes(gap.better) && { color: Brand.accentGreen },
                      ]}
                    >
                      {savedPhrases.includes(gap.better) ? 'Saved in Vault' : 'Save to Vocab Vault'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* 4. Lexicon Level Badge */}
        <View style={styles.reportCard}>
          <Text style={styles.cardHeading}>Lexicon Leveling</Text>
          <View style={styles.lexiconContainer}>
            <View style={styles.lexiconBadge}>
              <SymbolView
                name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                size={32}
                tintColor={Brand.accentAmber}
              />
            </View>
            <View style={styles.lexiconDetails}>
              <Text style={styles.lexiconRankName}>{score >= 85 ? 'Level Up: Diplomatic Communicator' : score >= 70 ? 'Level Up: Confident Speaker' : 'Level Up: Smart Starter'}</Text>
              <Text style={styles.lexiconRankSub}>
                {`Your vocabulary + clarity improved based on your conversation. Keep practicing daily.`}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Encouraging Closing Voice Summary */}
        <View style={styles.reportCard}>
          <Text style={styles.cardHeading}>AI Coach Summary</Text>
          <View style={styles.summaryVoiceRow}>
            <Pressable
              style={styles.summaryPlayOrb}
              onPress={async () => {
                try {
                  if (pronunciationSoundRef.current) {
                    pronunciationSoundRef.current.release();
                    pronunciationSoundRef.current = null;
                  }
                  const player = createAudioPlayer({ uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' });
                  pronunciationSoundRef.current = player;
                  player.play();
                } catch {}
              }}
              accessibilityRole="button"
              accessibilityLabel="Play coach summary audio"
            >
              <SymbolView
                name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                size={18}
                tintColor={Brand.primary}
              />
            </Pressable>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryBubbleText}>
                {`"${vocabularyFeedback}"`}
              </Text>
            </View>
          </View>
        </View>

        {/* Save confirm vault flying indicator */}
        {saveVaultAnimated && (
          <View style={styles.vaultFlyContainer}>
            <SymbolView
              name={{ ios: 'lock.square.stack.fill', android: 'folder_special', web: 'folder_special' }}
              size={48}
              tintColor={Brand.primary}
            />
            <Text style={styles.vaultFlyText}>Phrases locked in Vault!</Text>
          </View>
        )}

        {/* CTAs */}
        <View style={styles.feedbackFooter}>
          <Pressable
            style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}
            onPress={handleRestart}
            accessibilityRole="button"
            accessibilityLabel="Practice this scenario again"
          >
            <Text style={styles.primaryCtaText}>Practice Again</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.secondaryCtaPressed]}
            onPress={() => router.replace('/practice' as never)}
            accessibilityRole="button"
            accessibilityLabel="Return to practice dashboard"
          >
            <Text style={styles.secondaryCtaText}>Back to Scenarios</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.gradientBg]} />

      {/* Main header standard */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : insets.top + Spacing.two }]}>
        <Pressable
          onPress={() => {
            voice.disconnect();
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            tintColor={Brand.primaryDark}
          />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {screenState === 3 ? 'Session Report' : caseStudy.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Render states */}
      {screenState === 1 && renderReadyState()}
      {screenState === 2 && renderLiveState()}
      {screenState === 3 && renderFeedbackState()}
    </View>
  );
}

// Chibi Mascot graphic or Voice Orb fallback
function ImageMascot() {
  return (
    <View style={styles.mascotBg}>
      <Image
        source={require('@/assets/images/avatar.png')}
        style={styles.mascotImage}
        accessibilityLabel="Mascot avatar"
      />
    </View>
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
    experimental_backgroundImage: `linear-gradient(160deg, ${Brand.bgGradientStart} 0%, ${Brand.bgGradientEnd} 65%)`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
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
  backBtnPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
    flex: 1,
    textAlign: 'center',
  },

  // ── Common State Layout ──────────────────────────────────────────────
  stateContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },

  // ── STATE 1: Ready Briefing ──────────────────────────────────────────
  briefHeader: {
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  contextLabel: {
    fontSize: 12,
    color: Brand.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.five,
    gap: Spacing.three,
  },
  voiceOrb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  activeVoiceOrb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  orbRippleOutline: {
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: 80,
    margin: -10,
  },
  orbStatusText: {
    fontSize: 13,
    color: Brand.primaryDark,
    fontWeight: '600',
  },
  vocabSuggestionSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  sectionSub: {
    fontSize: 12,
    color: Brand.grayText,
    marginTop: -Spacing.one,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  vocabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: Radius.sm,
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.15)',
  },
  vocabPillPressed: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  vocabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.primaryDark,
  },
  actionFooter: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  micButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  micButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.primary,
  },

  // ── STATE 2: Live Conversation ──────────────────────────────────────
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  entitlementText: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '600',
  },
  liveOrbStatus: {
    fontSize: 14,
    color: Brand.primary,
    fontWeight: '700',
  },
  mascotBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  transcriptSection: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginVertical: Spacing.three,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(76, 14, 158, 0.06)',
    maxHeight: 250,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptList: {
    gap: Spacing.two,
  },
  emptyTranscript: {
    fontSize: 12,
    color: Brand.grayText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  chatBubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
    borderRadius: Radius.md,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: Brand.primaryBadgeBg,
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  chatBubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userBubbleText: {
    color: Brand.primaryDark,
    fontWeight: '500',
  },
  aiBubbleText: {
    color: '#374151',
  },
  shrunkPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  shrunkPill: {
    backgroundColor: Brand.cardBg,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.08)',
  },
  shrunkPillText: {
    fontSize: 11,
    color: Brand.primary,
    fontWeight: '600',
  },
  liveFooter: {
    width: '100%',
    alignItems: 'center',
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  endSessionBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  endSessionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlayReconnect: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  reconnectCard: {
    backgroundColor: Brand.cardBg,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  reconnectText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  retryBtn: {
    marginTop: Spacing.two,
    backgroundColor: Brand.primary,
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // ── Permission modal explainer ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(76, 14, 158, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  permissionCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.four + 2,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: Spacing.three,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  permissionIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Brand.primaryBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalCta: {
    backgroundColor: Brand.primary,
    width: '100%',
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  modalCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalCancel: {
    width: '100%',
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Brand.grayText,
    fontWeight: '600',
    fontSize: 13,
  },

  // ── STATE 3: Feedback Screen ─────────────────────────────────────────
  loadingStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  lottieBrain: {
    width: 150,
    height: 150,
  },
  reanimatedLoader: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Brand.primaryBadgeBg,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 18,
  },
  feedbackScroll: {
    flex: 1,
  },
  feedbackContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  feedbackSubtitle: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
  },
  reportAvatarRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: -Spacing.one,
  },
  reportAvatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(250,250,250,0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.18)',
  },
  reportAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  reportCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginBottom: Spacing.two,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Brand.grayText,
    marginTop: -Spacing.one,
    marginBottom: Spacing.three,
  },
  fluencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  circleProgressPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fluencyScoreNum: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  fluencyLabel: {
    fontSize: 10,
    color: Brand.primary,
    fontWeight: '700',
  },
  scoreDetails: {
    flex: 1,
    gap: 6,
  },
  scoreDetailText: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '600',
  },
  wpmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  speedometerContainer: {
    width: 100,
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gaugeBack: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: Brand.primaryBadgeBg,
    borderBottomWidth: 0,
    position: 'absolute',
    bottom: 0,
  },
  gaugeNeedle: {
    width: 6,
    height: 44,
    backgroundColor: Brand.primary,
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    transformOrigin: 'bottom center',
  },
  gaugeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.primaryDark,
    zIndex: 2,
  },
  gaugeLabel: {
    fontSize: 9,
    color: Brand.grayText,
    fontWeight: '700',
  },
  pacingExplanation: {
    flex: 1,
    gap: 4,
  },
  pacingStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one / 2,
    borderRadius: Radius.sm,
  },
  pacingStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pacingDesc: {
    fontSize: 12,
    color: Brand.grayText,
    lineHeight: 16,
  },
  gapsList: {
    gap: Spacing.three,
  },
  gapCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(76, 14, 158, 0.04)',
  },
  gapRowSaid: {
    gap: 2,
  },
  gapRowBetter: {
    gap: 2,
  },
  gapLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  gapTextSaid: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  betterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  betterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.accentGreen,
  },
  audioPlayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.primaryBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gapTextBetter: {
    fontSize: 13,
    color: Brand.primaryDark,
    fontWeight: '600',
  },
  gapExplanationText: {
    marginTop: Spacing.one,
    fontSize: 12,
    color: Brand.grayText,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  saveVaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.cardBg,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.15)',
    marginTop: Spacing.one,
  },
  saveVaultPillSaved: {
    borderColor: Brand.accentGreen,
    backgroundColor: Brand.accentGreenLight,
  },
  saveVaultPillPressed: {
    opacity: 0.8,
  },
  saveVaultText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
  },
  lexiconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  lexiconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Brand.accentAmberBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lexiconDetails: {
    flex: 1,
    gap: 2,
  },
  lexiconRankName: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  lexiconRankSub: {
    fontSize: 12,
    color: Brand.grayText,
    lineHeight: 16,
  },
  summaryVoiceRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  summaryPlayOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.primaryBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryBubbleText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  vaultFlyContainer: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderColor: Brand.primary,
    zIndex: 100,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  vaultFlyText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  feedbackFooter: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    width: '100%',
  },
  primaryCta: {
    flex: 1,
    backgroundColor: Brand.primary,
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryCta: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    paddingVertical: Spacing.three - 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 14, 158, 0.15)',
  },
  secondaryCtaPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  secondaryCtaText: {
    color: Brand.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // ── Live Pacing Indicator ─────────────────────────────────────────
  pacingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
  },
  pacingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pacingDotGreen: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 3,
  },
  pacingDotAmber: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 3,
  },
  pacingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});
