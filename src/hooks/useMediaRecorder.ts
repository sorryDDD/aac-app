import { useCallback, useEffect, useRef, useState } from 'react';
import { canUseAudioRecorder, mediaUnavailableMessage, preferredAudioMimeType } from '../utils/mediaSupport';

export type RecorderStatus = 'idle' | 'recording' | 'ready' | 'error';

export function useMediaRecorder(initialBlob?: Blob) {
  const [status, setStatus] = useState<RecorderStatus>(initialBlob ? 'ready' : 'idle');
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(initialBlob);
  const [error, setError] = useState<string>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setAudioBlob(initialBlob);
    setStatus(initialBlob ? 'ready' : 'idle');
    setElapsedMs(0);
  }, [initialBlob]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!canUseAudioRecorder()) {
      setStatus('error');
      setError(mediaUnavailableMessage('microphone'));
      return;
    }

    try {
      setError(undefined);
      setElapsedMs(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = preferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        clearTimer();
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/mp4' });
        setAudioBlob(recordedBlob);
        setStatus('ready');
        stopTracks();
      });

      recorder.addEventListener('error', () => {
        clearTimer();
        stopTracks();
        setStatus('error');
        setError('녹음 중 오류가 발생했습니다.');
      });

      recorder.start();
      startedAtRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startedAtRef.current);
      }, 150);
      setStatus('recording');
    } catch (recordingError) {
      clearTimer();
      stopTracks();
      setStatus('error');
      setError(recordingError instanceof Error ? recordingError.message : '마이크 권한을 확인해 주세요.');
    }
  }, [clearTimer, stopTracks]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    clearTimer();
    stopTracks();
    recorderRef.current = null;
    chunksRef.current = [];
    setAudioBlob(undefined);
    setElapsedMs(0);
    setStatus('idle');
    setError(undefined);
  }, [clearTimer, stopTracks]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
    };
  }, [clearTimer, stopTracks]);

  return {
    status,
    audioBlob,
    error,
    elapsedMs,
    startRecording,
    stopRecording,
    resetRecording
  };
}
