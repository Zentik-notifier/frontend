import { useNavigationOptimization } from '@/components/NavigationOptimizationProvider';
import { useCallback, useState } from 'react';

/**
 * Hook per mantenere stato persistente tra navigazioni
 * Lo stato viene preservato in memoria anche quando il componente viene smontato
 * Utilizza il NavigationOptimizationProvider per la cache globale
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) {
  const { getCacheValue, setCacheValue, clearCacheValue } = useNavigationOptimization();
  
  // Inizializza con valore dalla cache o valore iniziale
  const [state, setState] = useState<T>(() => {
    const cachedValue = getCacheValue(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    return initialValue;
  });

  // Funzione per aggiornare stato e cache
  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newState = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      setCacheValue(key, newState);
      return newState;
    });
  }, [key, setCacheValue]);

  // Funzione per pulire cache
  const clearPersistentState = useCallback(() => {
    clearCacheValue(key);
    setState(initialValue);
  }, [key, initialValue, clearCacheValue]);

  // Funzione per verificare se esiste in cache
  const hasPersistedValue = useCallback(() => {
    const cachedValue = getCacheValue(key);
    return cachedValue !== undefined;
  }, [key, getCacheValue]);

  return {
    state,
    setState: setPersistentState,
    clearState: clearPersistentState,
    hasPersistedValue: hasPersistedValue(),
  };
}
