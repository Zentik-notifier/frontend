import { useAppContext } from '@/contexts/AppContext';
import { i18nService } from '@/services/i18n';
import React from 'react';
import { Locale } from './useI18n';

/**
 * Hook that synchronizes language settings between user-settings and I18nService
 * user-settings is the source of truth for locale (which syncs with auth-storage for App Groups support)
 */
export function useLanguageSync() {
  const {
    userSettings: {
      getLocale: getUserLocale,
      setLocale: setUserLocale
    },
  } = useAppContext();
  const [currentLocale, setCurrentLocale] = React.useState<Locale>('en-EN');

  // Load locale from user-settings on mount
  React.useEffect(() => {
    const loadLocale = () => {
      const storedLocale = getUserLocale();
      const locale: Locale = (storedLocale === 'it-IT' || storedLocale === 'en-EN') ? storedLocale : 'en-EN';
      setCurrentLocale(locale);
    };
    loadLocale();
  }, [getUserLocale]);

  const setLocale = React.useCallback(async (locale: Locale) => {
    try {
      await setUserLocale(locale);
      await i18nService.setLocale(locale);
      setCurrentLocale(locale);
    } catch (error) {
      console.error('Failed to set locale:', error);
      throw error;
    }
  }, [setUserLocale]);

  return {
    currentLocale,
    setLocale,
    availableLocales: i18nService.getAvailableLocales(),
    getLocaleDisplayName: i18nService.getLocaleDisplayName.bind(i18nService),
  };
}
