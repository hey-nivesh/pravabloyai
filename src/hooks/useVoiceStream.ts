import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createAudioPlayer, 
  getRecordingPermissionsAsync, 
  requestRecordingPermissionsAsync, 
  setAudioModeAsync, 
  useAudioRecorder, 
  useAudioRecorderState, 
  type AudioPlayer 
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseVoiceStreamProps {
  onAiSpeechStart?: () => void;
  onAiSpeechEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onTranscriptReceived?: (text: string, isFinal: boolean) => void;
  onInterrupted?: () => void;
}

export function useVoiceStream(props: UseVoiceStreamProps = {}) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [aiAmplitude, setAiAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]); // Base64 audio chunks queue
  const currentSoundRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const audioRecorder = useAudioRecorder({
    android: {
      extension: '.wav',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.wav',
      audioQuality: 127,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
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

  // Use refs to avoid stale closures in event listeners
  const statusRef = useRef<VoiceStatus>('idle');
  const userSpeakingRef = useRef(false);
  const propsRef = useRef(props);

  // Sync refs with state/props on render
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    userSpeakingRef.current = userSpeaking;
  }, [userSpeaking]);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  // Cleanup helper
  const cleanupAudio = async () => {
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
      if (currentSoundRef.current) {
        currentSoundRef.current.release();
        currentSoundRef.current = null;
      }
      isPlayingRef.current = false;
      audioQueueRef.current = [];
    } catch (e) {
      console.warn('Error cleaning up audio:', e);
    }
  };

  // Play next chunk in queue
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

    const base64Chunk = audioQueueRef.current.shift();
    if (!base64Chunk) {
      isPlayingRef.current = false;
      return;
    }

    try {
      // Save chunk to local temp file to play with expo-av
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
      if (!cacheDir) {
        throw new Error('No writable directory available');
      }
      const fileUri = `${cacheDir}ai_chunk_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64Chunk, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const player = createAudioPlayer({ uri: fileUri });
      currentSoundRef.current = player;

      // Simulate AI speaking amplitude fluctuations
      const ampInterval = setInterval(() => {
        if (isPlayingRef.current) {
          setAiAmplitude(Math.random() * 0.8 + 0.2); // Fluctuate between 0.2 and 1.0
        } else {
          clearInterval(ampInterval);
        }
      }, 100);

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          clearInterval(ampInterval);
          setAiAmplitude(0);
          try {
            player.release();
          } catch (err) {
            console.warn('Failed to release sound:', err);
          }
          currentSoundRef.current = null;
          isPlayingRef.current = false;
          // Delete cache file
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          // Play next in queue
          playNextChunk();
          subscription.remove();
        }
      });

      player.play();
    } catch (e) {
      console.warn('Playback chunk failed:', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // Interruption / Barge-in: immediately stop AI audio playback
  const handleBargeIn = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length > 0) {
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      setAiSpeaking(false);
      propsRef.current.onAiSpeechEnd?.();
      setAiAmplitude(0);

      if (currentSoundRef.current) {
        try {
          currentSoundRef.current.release();
          currentSoundRef.current = null;
        } catch (e) {
          console.warn('Failed to release sound during barge-in', e);
        }
      }

      // Notify backend if socket is active
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ event: 'interrupted' }));
      }

      propsRef.current.onInterrupted?.();
    }
  }, []);

  // Configure and start recording mic
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission not granted.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (e) {
      console.warn('Failed to start audio recording:', e);
      setError('Could not access microphone.');
    }
  }, [audioRecorder]);

  // Monitor volume amplitude & handle sending audio chunks
  useEffect(() => {
    if (recorderState.isRecording) {
      // Normalize volume levels from meter (usually -160 to 0 dB)
      const db = recorderState.metering ?? -160;
      const normAmp = Math.max(0, (db + 160) / 160); // 0.0 to 1.0 range
      setAmplitude(normAmp);

      const isUserNowSpeaking = normAmp > 0.35;
      if (isUserNowSpeaking && !userSpeakingRef.current) {
        setUserSpeaking(true);
        propsRef.current.onSpeechStart?.();
        handleBargeIn(); // Stop AI if user starts speaking
      } else if (!isUserNowSpeaking && userSpeakingRef.current) {
        setUserSpeaking(false);
        propsRef.current.onSpeechEnd?.();
      }

      // To ensure fully functioning WS loop, we send a keepalive voice packet:
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && recorderState.durationMillis % 500 < 100) {
        socketRef.current.send(
          JSON.stringify({
            event: 'audio',
            payload: {
              base64: 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA', // Mini silent WAV
            },
          })
        );
      }
    }
  }, [recorderState.isRecording, recorderState.metering, recorderState.durationMillis, handleBargeIn]);

  // Connect to websocket gateway
  const connect = useCallback((caseStudyId: string) => {
    setStatus('connecting');
    setError(null);
    reconnectAttemptsRef.current = 0;

    const gatewayUrl = process.env.EXPO_PUBLIC_VOICE_GATEWAY_URL ?? 'wss://api.pravabloy.ai/ws/voice-session';
    const wsUrl = `${gatewayUrl}?caseStudyId=${caseStudyId}`;

    const setupSocket = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        // Send initial connection init
        ws.send(JSON.stringify({ event: 'start', payload: { caseStudyId } }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'audio') {
            // Add base64 chunk to queue and play
            audioQueueRef.current.push(data.payload.base64);
            if (!isPlayingRef.current) {
              playNextChunk();
            }
          } else if (data.event === 'transcript') {
            const { text, sender, isFinal } = data.payload;
            const senderTyped = sender === 'user' ? 'user' : 'ai';
            
            setTranscript((prev) => {
              // If there's an existing partial transcript from the same sender, update it
              const last = prev[prev.length - 1];
              if (last && last.sender === senderTyped) {
                const updated = [...prev];
                updated[updated.length - 1] = { sender: senderTyped, text };
                return updated;
              }
              return [...prev, { sender: senderTyped, text }];
            });

            if (propsRef.current.onTranscriptReceived) {
              propsRef.current.onTranscriptReceived(text, isFinal);
            }
          } else if (data.event === 'interrupted') {
            handleBargeIn();
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setError('Connection error occurred.');
      };

      ws.onclose = () => {
        if (statusRef.current === 'connected' && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setStatus('reconnecting');
          reconnectAttemptsRef.current += 1;
          setTimeout(setupSocket, 2000); // Wait 2s before retry
        } else if (statusRef.current !== 'idle') {
          setStatus('error');
          setError('Disconnected from server.');
        }
      };
    };

    setupSocket();
    startRecording();
  }, [playNextChunk, startRecording, handleBargeIn]);

  // Disconnect WebSocket and clean up
  const disconnect = useCallback(async () => {
    setStatus('idle');
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    await cleanupAudio();
  }, []);

  // Helper to send a text manual fallback message
  const sendMessage = useCallback((text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: 'text', payload: { text } }));
      
      setTranscript((prev) => [...prev, { sender: 'user', text }]);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // MOCK SIMULATION FOR OFFLINE / TESTING LOOPS
  // Allows testing the screen flows fully when WebSocket is unavailable.
  const simulateAISpeak = useCallback((text: string) => {
    setAiSpeaking(true);
    propsRef.current.onAiSpeechStart?.();
    setTranscript((prev) => [...prev, { sender: 'ai', text }]);

    let step = 0;
    const interval = setInterval(() => {
      if (step > 30) {
        clearInterval(interval);
        setAiSpeaking(false);
        propsRef.current.onAiSpeechEnd?.();
        setAiAmplitude(0);
      } else {
        setAiAmplitude(Math.random() * 0.7 + 0.3);
        step++;
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
    connect,
    disconnect,
    sendMessage,
    simulateAISpeak,
    handleBargeIn,
  };
}
