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
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Sync i18n service when user settings change
  React.useEffect(() => {
    if (!isUpdating && settings.locale !== i18nService.getCurrentLocale()) {
      i18nService.setLocale(settings.locale).catch(console.error);
    }
  }, [settings.locale, isUpdating]);

  const setLocale = React.useCallback(async (locale: Locale) => {
    setIsUpdating(true);
    try {
      // Only update UserSettings, i18n will follow automatically
      await setUserLocale(locale);
    } catch (error) {
      console.error('Failed to set locale:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [setUserLocale]);

  return {
    currentLocale: settings.locale,
    setLocale,
    availableLocales: i18nService.getAvailableLocales(),
    getLocaleDisplayName: i18nService.getLocaleDisplayName.bind(i18nService),
  };
}
