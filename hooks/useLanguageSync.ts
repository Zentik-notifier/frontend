import { useAppContext } from '@/contexts/AppContext';
import { i18nService } from '@/services/i18n';
import { Locale } from '@/types/i18n';
import React from 'react';

/**
 * Hook that synchronizes language settings between UserSettings and I18nService
 * UserSettings is the source of truth, I18nService follows it
 */
export function useLanguageSync() {
  const {
    userSettings: {
      settings, setLocale: setUserLocale
    },
  } = useAppContext();

  const setLocale = React.useCallback(async (locale: Locale) => {
    try {
      await setUserLocale(locale);
      await i18nService.setLocale(locale);
    } catch (error) {
      console.error('Failed to set locale:', error);
      throw error;
    }
  }, [setUserLocale]);

  return {
    currentLocale: settings.locale ?? 'en-EN',
    setLocale,
    availableLocales: i18nService.getAvailableLocales(),
    getLocaleDisplayName: i18nService.getLocaleDisplayName.bind(i18nService),
  };
}
