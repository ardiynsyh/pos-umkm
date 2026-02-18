'use client';
import { useCallback, useRef } from 'react';

export function useAudioFeedback() {
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);

  if (typeof window !== 'undefined' && !successAudioRef.current) {
    successAudioRef.current = new Audio('/sounds/beep.mp3');
    successAudioRef.current.volume = 0.5;
    errorAudioRef.current = new Audio('/sounds/error.mp3');
    errorAudioRef.current.volume = 0.5;
  }

  const playSuccess = useCallback(() => {
    successAudioRef.current?.play().catch(console.warn);
  }, []);

  const playError = useCallback(() => {
    errorAudioRef.current?.play().catch(console.warn);
  }, []);

  return { playSuccess, playError };
}