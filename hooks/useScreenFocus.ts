import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

/**
 * Hook per gestire eventi di focus/blur della schermata
 * Utile per ottimizzare performance e gestire lifecycle
 */
export function useScreenFocus(options: {
  onFocus?: () => void;
  onBlur?: () => void;
  enableLogging?: boolean;
}) {
  const { onFocus, onBlur, enableLogging = false } = options;
  const isFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Schermata in focus
      isFocusedRef.current = true;
      if (enableLogging) {
        // console.log('📱 Screen focused');
      }
      onFocus?.();

      return () => {
        // Schermata in blur
        isFocusedRef.current = false;
        if (enableLogging) {
          // console.log('📱 Screen blurred');
        }
        onBlur?.();
      };
    }, [onFocus, onBlur, enableLogging])
  );

  return {
    isFocused: isFocusedRef.current,
  };
}
