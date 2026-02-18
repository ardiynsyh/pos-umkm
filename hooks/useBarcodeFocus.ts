'use client';
import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeFocusOptions {
  autoFocusDelay?: number;
}

export function useBarcodeFocus(options: UseBarcodeFocusOptions = {}) {
  const { autoFocusDelay = 2000 } = options;
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleActivity = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(focusInput, autoFocusDelay);
  }, [autoFocusDelay, focusInput]);

  useEffect(() => {
    focusInput();
    const events = ['click', 'keydown', 'mousemove'];
    events.forEach(e => document.addEventListener(e, handleActivity));
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [focusInput, handleActivity]);

  return { inputRef, focusInput };
}