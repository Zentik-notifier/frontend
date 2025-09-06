import React, { createContext, useCallback, useContext, useRef } from 'react';

interface NavigationOptimizationContextType {
  // Cache globale per stati persistenti
  persistentCache: Map<string, any>;
  
  // Funzioni per gestione cache
  setCacheValue: (key: string, value: any) => void;
  getCacheValue: (key: string) => any;
  clearCacheValue: (key: string) => void;
  clearAllCache: () => void;
  
  // Stato di navigazione
  isNavigating: boolean;
  setNavigating: (navigating: boolean) => void;
}

const NavigationOptimizationContext = createContext<NavigationOptimizationContextType | undefined>(undefined);

interface NavigationOptimizationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider per ottimizzazioni di navigazione e gestione cache persistente
 * Mantiene stati e dati in memoria durante la navigazione
 */
export function NavigationOptimizationProvider({ children }: NavigationOptimizationProviderProps) {
  // Cache globale persistente
  const persistentCache = useRef<Map<string, any>>(new Map()).current;
  
  // Stato di navigazione
  const isNavigatingRef = useRef(false);

  // Funzioni per gestione cache
  const setCacheValue = useCallback((key: string, value: any) => {
    persistentCache.set(key, value);
    // console.log(`🗄️ Cache set for key: ${key}`);
  }, [persistentCache]);

  const getCacheValue = useCallback((key: string) => {
    const value = persistentCache.get(key);
    // if (value !== undefined) {
    //   console.log(`🗄️ Cache hit for key: ${key}`);
    // }
    return value;
  }, [persistentCache]);

  const clearCacheValue = useCallback((key: string) => {
    const deleted = persistentCache.delete(key);
    if (deleted) {
      console.log(`🗄️ Cache cleared for key: ${key}`);
    }
  }, [persistentCache]);

  const clearAllCache = useCallback(() => {
    const size = persistentCache.size;
    persistentCache.clear();
    console.log(`🗄️ All cache cleared (${size} entries)`);
  }, [persistentCache]);

  const setNavigating = useCallback((navigating: boolean) => {
    isNavigatingRef.current = navigating;
    console.log(`🧭 Navigation state: ${navigating ? 'START' : 'END'}`);
  }, []);

  const contextValue: NavigationOptimizationContextType = {
    persistentCache,
    setCacheValue,
    getCacheValue,
    clearCacheValue,
    clearAllCache,
    isNavigating: isNavigatingRef.current,
    setNavigating,
  };

  return (
    <NavigationOptimizationContext.Provider value={contextValue}>
      {children}
    </NavigationOptimizationContext.Provider>
  );
}

/**
 * Hook per accedere al contesto di ottimizzazione navigazione
 */
export function useNavigationOptimization() {
  const context = useContext(NavigationOptimizationContext);
  if (!context) {
    throw new Error('useNavigationOptimization must be used within NavigationOptimizationProvider');
  }
  return context;
}
