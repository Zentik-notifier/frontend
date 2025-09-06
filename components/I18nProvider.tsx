import { i18nService } from '@/services/i18n';
import { userSettings } from '@/services/user-settings';
import { Locale } from '@/types/i18n';
import React from 'react';

interface I18nContextType {
  locale: Locale;
  isInitialized: boolean;
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for internationalization context
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = React.useState<Locale>(i18nService.getCurrentLocale());
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    // First initialize user settings, then set the locale in i18n service
    const initializeI18n = async () => {
      try {
        // Load user settings first
        const settings = await userSettings.initialize();
        
        // Set the locale from user settings to i18n service
        await i18nService.setLocale(settings.locale);
        
        // Update state
        setLocale(settings.locale);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        // Fallback to default locale
        setIsInitialized(true);
      }
    };

    initializeI18n();

    // Subscribe to locale changes
    const unsubscribe = i18nService.subscribe(setLocale);

    return unsubscribe;
  }, []);

  const contextValue: I18nContextType = {
    locale,
    isInitialized,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 */
export function useI18nContext(): I18nContextType {
  const context = React.useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useI18nContext must be used within an I18nProvider');
  }
  
  return context;
}
