import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createAudioPlayer, 
  getRecordingPermissionsAsync, 
  requestRecordingPermissionsAsync, 
  setAudioModeAsync, 
  useAudioRecorder, 
  useAudioRecorderState, 
  useAudioStream,
  type AudioPlayer 
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type RecorderState = 'idle' | 'preparing' | 'recording' | 'stopping' | 'released';

export interface UseVoiceStreamProps {
  onAiSpeechStart?: () => void;
  onAiSpeechEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onTranscriptReceived?: (text: string, isFinal: boolean) => void;
  onInterrupted?: () => void;
}

// ─── Pure JS Base64 utilities (no Buffer, no atob — environment-safe) ──────────
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LUT: number[] = new Array(256).fill(-1);
for (let i = 0; i < BASE64_CHARS.length; i++) BASE64_LUT[BASE64_CHARS.charCodeAt(i)] = i;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    const val = (b1 << 16) | (b2 << 8) | b3;
    result += BASE64_CHARS[(val >> 18) & 63];
    result += BASE64_CHARS[(val >> 12) & 63];
    result += i + 1 < len ? BASE64_CHARS[(val >> 6) & 63] : '=';
    result += i + 2 < len ? BASE64_CHARS[val & 63] : '=';
  }
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const str = base64.replace(/=+$/, '');
  const len = str.length;
  const bufferLength = Math.floor(len * 0.75);
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_LUT[str.charCodeAt(i)] ?? 0;
    const c2 = BASE64_LUT[str.charCodeAt(i + 1)] ?? 0;
    const c3 = BASE64_LUT[str.charCodeAt(i + 2)] ?? 0;
    const c4 = BASE64_LUT[str.charCodeAt(i + 3)] ?? 0;
    const val = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;
    bytes[p++] = (val >> 16) & 255;
    if (p < bufferLength) bytes[p++] = (val >> 8) & 255;
    if (p < bufferLength) bytes[p++] = val & 255;
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    const val = (b1 << 16) | (b2 << 8) | b3;
    result += BASE64_CHARS[(val >> 18) & 63];
    result += BASE64_CHARS[(val >> 12) & 63];
    result += i + 1 < len ? BASE64_CHARS[(val >> 6) & 63] : '=';
    result += i + 2 < len ? BASE64_CHARS[val & 63] : '=';
  }
  return result;
}

// ─── PCM → WAV container (44-byte RIFF/WAV header) ─────────────────────────────
function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  try {
    const pcmBytes = base64ToUint8Array(pcmBase64);
    const pcmLength = pcmBytes.length;
    const wavBuffer = new ArrayBuffer(44 + pcmLength);
    const view = new DataView(wavBuffer);
    const u8 = new Uint8Array(wavBuffer);

    // RIFF header
    view.setUint32(0, 0x52494646, false);   // "RIFF"
    view.setUint32(4, 36 + pcmLength, true); // file size - 8
    view.setUint32(8, 0x57415645, false);   // "WAVE"
    // fmt chunk
    view.setUint32(12, 0x666d7420, false);  // "fmt "
    view.setUint32(16, 16, true);            // fmt chunk size
    view.setUint16(20, 1, true);             // PCM = 1
    view.setUint16(22, 1, true);             // mono
    view.setUint32(24, sampleRate, true);    // sample rate
    view.setUint32(28, sampleRate * 2, true);// byte rate
    view.setUint16(32, 2, true);             // block align (1ch × 2 bytes)
    view.setUint16(34, 16, true);            // bits per sample
    // data chunk
    view.setUint32(36, 0x64617461, false);  // "data"
    view.setUint32(40, pcmLength, true);     // data size

    // Copy PCM
    u8.set(pcmBytes, 44);

    return uint8ArrayToBase64(u8);
  } catch (err) {
    console.error('[pcmBase64ToWavBase64] Conversion failed:', err);
    return pcmBase64; // Fallback: return as-is
  }
}

export function useVoiceStream(props: UseVoiceStreamProps = {}) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [aiAmplitude, setAiAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [livePacing, setLivePacing] = useState<{ wpm: number; fillerCount: number; pauseFlag: boolean } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]); // Base64 WAV audio chunks queue
  const currentSoundRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const receivedChunksRef = useRef(0);

  // ── Part A: Recorder state machine ──────────────────────────────────
  const recorderStateRef = useRef<RecorderState>('idle');
  const transitionState = useCallback((nextState: RecorderState) => {
    console.log(`[AudioRecorderState] ${recorderStateRef.current} -> ${nextState}`);
    recorderStateRef.current = nextState;
  }, []);

  // ── AudioRecorder (for permissions + metering fallback) ─────────────
  const audioRecorder = useAudioRecorder({
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
    ios: {
      audioQuality: 127,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
    isMeteringEnabled: true,
  });

  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // ── useAudioStream: real-time 16kHz mono int16 PCM capture ──────────
  // The onBuffer callback uses a ref so it can access the latest socket without
  // re-creating the stream on every render.
  const socketSendRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const userSpeakingRef = useRef(false);
  const handleBargeInRef = useRef<() => void>(() => {});

  const { stream: nativeStream, isStreaming: isAudioStreaming } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      // Send raw PCM ArrayBuffer over WebSocket directly
      if (socketSendRef.current) {
        socketSendRef.current(buffer.data);
      }

      // Calculate RMS amplitude for voice visualization
      const int16 = new Int16Array(buffer.data);
      let sumSq = 0;
      for (let i = 0; i < int16.length; i++) {
        sumSq += int16[i] * int16[i];
      }
      const rms = Math.sqrt(sumSq / Math.max(int16.length, 1));
      const norm = Math.min(1, rms / 6000);
      setAmplitude(norm);

      const isSpeaking = norm > 0.15;
      if (isSpeaking && !userSpeakingRef.current) {
        setUserSpeaking(true);
        propsRef.current.onSpeechStart?.();
        handleBargeInRef.current();
      } else if (!isSpeaking && userSpeakingRef.current) {
        setUserSpeaking(false);
        propsRef.current.onSpeechEnd?.();
      }
    },
  });

  const nativeStreamRef = useRef(nativeStream);
  const isAudioStreamingRef = useRef(isAudioStreaming);
  const audioRecorderRef = useRef(audioRecorder);

  useEffect(() => {
    nativeStreamRef.current = nativeStream;
    isAudioStreamingRef.current = isAudioStreaming;
    audioRecorderRef.current = audioRecorder;
  }, [nativeStream, isAudioStreaming, audioRecorder]);

  // ── Ref sync ─────────────────────────────────────────────────────────
  const statusRef = useRef<VoiceStatus>('idle');
  const propsRef = useRef(props);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { userSpeakingRef.current = userSpeaking; }, [userSpeaking]);
  useEffect(() => { propsRef.current = props; }, [props]);

  // ── Cleanup ──────────────────────────────────────────────────────────
  const cleanupAudio = useCallback(async () => {
    console.log('[cleanupAudio] Cleaning up. Recorder state:', recorderStateRef.current);

    // Stop stream — guard against already-released shared object
    try {
      if (isAudioStreamingRef.current) {
        nativeStreamRef.current?.stop();
        console.log('[cleanupAudio] AudioStream stopped.');
      }
    } catch (streamErr) {
      console.warn('[cleanupAudio] AudioStream already released or stopped:', streamErr);
    }

    // Stop recorder
    if (
      recorderStateRef.current === 'recording' ||
      recorderStateRef.current === 'preparing'
    ) {
      transitionState('stopping');
      try {
        await audioRecorderRef.current?.stop();
        console.log('[cleanupAudio] AudioRecorder stopped.');
      } catch (recorderErr) {
        console.warn('[cleanupAudio] AudioRecorder.stop() error:', recorderErr);
      } finally {
        transitionState('idle');
      }
    } else {
      console.log('[cleanupAudio] Recorder not active, skipping stop.');
    }

    // Release playback
    if (currentSoundRef.current) {
      try { currentSoundRef.current.remove(); } catch (_) {}
      currentSoundRef.current = null;
    }
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    socketSendRef.current = null;
  }, [transitionState]);

  // ── Playback ─────────────────────────────────────────────────────────
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setAiSpeaking(false);
      propsRef.current.onAiSpeechEnd?.();
      setAiAmplitude(0);
      return;
    }
    if (isPlayingRef.current) return;

    isPlayingRef.current = true;
    setAiSpeaking(true);
    propsRef.current.onAiSpeechStart?.();

    const pcmBase64 = audioQueueRef.current.shift();
    if (!pcmBase64) { isPlayingRef.current = false; return; }

    try {
      // Gemini returns raw 16-bit PCM at 24kHz — wrap in WAV container
      const wavBase64 = pcmBase64ToWavBase64(pcmBase64, 24000);

      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
      const fileUri = `${cacheDir}ai_chunk_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const player = createAudioPlayer({ uri: fileUri });
      currentSoundRef.current = player;

      const ampInterval = setInterval(() => {
        if (isPlayingRef.current) setAiAmplitude(Math.random() * 0.7 + 0.3);
        else clearInterval(ampInterval);
      }, 100);

      const sub = player.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) {
          clearInterval(ampInterval);
          setAiAmplitude(0);
          try { player.remove(); } catch (_) {}
          currentSoundRef.current = null;
          isPlayingRef.current = false;
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          sub.remove();
          playNextChunk();
        }
      });
      player.play();
    } catch (e) {
      console.warn('[playNextChunk] Playback error:', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // ── Barge-in ──────────────────────────────────────────────────────────
  const handleBargeIn = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length > 0) {
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      setAiSpeaking(false);
      propsRef.current.onAiSpeechEnd?.();
      setAiAmplitude(0);
      if (currentSoundRef.current) {
        try { currentSoundRef.current.remove(); } catch (_) {}
        currentSoundRef.current = null;
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ event: 'interrupted' }));
      }
      propsRef.current.onInterrupted?.();
    }
  }, []);

  // Keep barge-in ref current so the audio-stream callback can call it
  useEffect(() => { handleBargeInRef.current = handleBargeIn; }, [handleBargeIn]);

  // ── Start recording (state-machine-guarded) ───────────────────────────
  const startRecording = useCallback(async () => {
    console.log('[startRecording] State:', recorderStateRef.current);
    if (
      recorderStateRef.current === 'preparing' ||
      recorderStateRef.current === 'recording'
    ) {
      console.warn('[startRecording] Already active, skipping.');
      return;
    }
    if (recorderStateRef.current === 'stopping') {
      console.log('[startRecording] Waiting for stop...');
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 100));
        if ((recorderStateRef.current as string) === 'idle') break;
      }
    }

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setError('Microphone permission not granted.'); return; }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      transitionState('preparing');
      await audioRecorder.prepareToRecordAsync();
      transitionState('recording');
      await audioRecorder.record();

      // Start the real-time stream for binary PCM capture
      try {
        await nativeStreamRef.current?.start();
        console.log('[startRecording] AudioStream started.');
      } catch (streamErr) {
        console.warn('[startRecording] AudioStream.start() failed:', streamErr);
      }
    } catch (e) {
      console.error('[startRecording] Error:', e);
      transitionState('idle');
      setError('Could not access microphone.');
    }
  }, [transitionState]);

  // ── Disconnect ───────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    setStatus('idle');
    setLivePacing(null);
    socketSendRef.current = null;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    await cleanupAudio();
  }, [cleanupAudio]);

  // ── Connect ───────────────────────────────────────────────────────────
  const connect = useCallback(async (caseStudyId: string) => {
    console.log('[connect] Starting. Current status:', statusRef.current);

    // Always fully clean up before re-connecting
    await disconnect();

    setStatus('connecting');
    setError(null);
    reconnectAttemptsRef.current = 0;
    receivedChunksRef.current = 0;

    const gatewayUrl =
      process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://api.pravabloy.ai/ws/voice-session';

    // Fetch the Supabase access token so the gateway's requireAuth middleware accepts us
    let accessToken = '';
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      accessToken = sessionData?.session?.access_token ?? '';
    } catch (tokenErr) {
      console.warn('[connect] Failed to retrieve auth token:', tokenErr);
    }

    const wsUrl = `${gatewayUrl}?caseStudyId=${caseStudyId}${accessToken ? `&token=${accessToken}` : ''}`;
    console.log('[connect] WS URL (no token shown):', gatewayUrl + `?caseStudyId=${caseStudyId}&token=<redacted>`);

    const setupSocket = () => {
      console.log('[setupSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      // Wire up the send function used by the stream callback
      socketSendRef.current = (data: ArrayBuffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      };

      ws.onopen = () => {
        console.log('[WebSocket] Opened.');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        ws.send(JSON.stringify({ event: 'start', payload: { caseStudyId } }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'audio') {
            receivedChunksRef.current += 1;
            if (receivedChunksRef.current % 20 === 0) {
              console.log(`[WebSocket] Received ${receivedChunksRef.current} audio chunks`);
            }
            audioQueueRef.current.push(data.payload.base64);
            if (!isPlayingRef.current) playNextChunk();
          } else if (data.event === 'transcript') {
            const { text, sender, isFinal } = data.payload;
            const role = sender === 'user' ? 'user' : 'ai';
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last?.sender === role) {
                return [...prev.slice(0, -1), { sender: role, text }];
              }
              return [...prev, { sender: role, text }];
            });
            propsRef.current.onTranscriptReceived?.(text, isFinal);
          } else if (data.event === 'live_pacing') {
            setLivePacing(data.payload);
          } else if (data.event === 'interrupted') {
            handleBargeIn();
          } else if (data.event === 'error') {
            console.warn('[WebSocket] Server error:', data.payload?.message);
            setError(data.payload?.message ?? 'Server error');
          }
        } catch (err) {
          console.warn('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('[WebSocket] Error:', e);
        setError('Connection error occurred.');
      };

      ws.onclose = (e) => {
        console.log(`[WebSocket] Closed. Code=${e.code}, Reason=${e.reason}`);
        socketSendRef.current = null;
        if (
          statusRef.current === 'connected' &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          setStatus('reconnecting');
          reconnectAttemptsRef.current += 1;
          setTimeout(setupSocket, 2000);
        } else if (statusRef.current !== 'idle') {
          setStatus('error');
          setError('Disconnected from server.');
        }
      };
    };

    setupSocket();
    await startRecording();
  }, [disconnect, startRecording, playNextChunk, handleBargeIn]);

  // ── Metering from recorder (fallback amplitude when stream not running) ──
  useEffect(() => {
    if (recorderState.isRecording) {
      const db = recorderState.metering ?? -160;
      const norm = Math.max(0, (db + 160) / 160);
      // Only update if stream is not already providing amplitude
      if (!isAudioStreamingRef.current) {
        setAmplitude(norm);
        const isSpeaking = norm > 0.35;
        if (isSpeaking && !userSpeakingRef.current) {
          setUserSpeaking(true);
          propsRef.current.onSpeechStart?.();
          handleBargeIn();
        } else if (!isSpeaking && userSpeakingRef.current) {
          setUserSpeaking(false);
          propsRef.current.onSpeechEnd?.();
        }
      }
    }
  }, [recorderState.isRecording, recorderState.metering, handleBargeIn]);

  // ── Text message helper ───────────────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: 'text', payload: { text } }));
      setTranscript((prev) => [...prev, { sender: 'user', text }]);
    }
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  const disconnectRef = useRef(disconnect);
  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  useEffect(() => {
    return () => {
      disconnectRef.current();
    };
  }, []);

  // ── Mock simulation (offline testing) ────────────────────────────────
  const simulateAISpeak = useCallback((text: string) => {
    setAiSpeaking(true);
    propsRef.current.onAiSpeechStart?.();
    setTranscript((prev) => [...prev, { sender: 'ai', text }]);
    let step = 0;
    const interval = setInterval(() => {
      if (step++ > 30) {
        clearInterval(interval);
        setAiSpeaking(false);
        propsRef.current.onAiSpeechEnd?.();
        setAiAmplitude(0);
      } else {
        setAiAmplitude(Math.random() * 0.7 + 0.3);
      }
    }, 100);
  }, []);

  return {
    status,
    userSpeaking,
    aiSpeaking,
    transcript,
    amplitude,
    aiAmplitude,
    error,
    livePacing,
    connect,
    disconnect,
    sendMessage,
    simulateAISpeak,
    handleBargeIn,
  };
}
