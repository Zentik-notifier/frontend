import { useI18n, Locale } from './useI18n';
import { useSettings } from './useSettings';
import { useCallback } from 'react';

/**
 * Hook that provides language settings and sync functionality
 * @deprecated Use useI18n directly instead - it's now fully reactive
 */
export function useLanguageSync() {
  const { locale, availableLocales, getLocaleDisplayName } = useI18n();
  const { setLocale: settingsSetLocale } = useSettings();

  const setLocale = useCallback(async (newLocale: Locale) => {
    try {
      await settingsSetLocale(newLocale);
    } catch (error) {
      console.error('Failed to set locale:', error);
      throw error;
    }
  }, [settingsSetLocale]);

  return {
    currentLocale: locale,
    setLocale,
    availableLocales,
    getLocaleDisplayName,
  };
}
