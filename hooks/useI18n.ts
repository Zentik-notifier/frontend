import { i18nService } from '@/services/i18n';
import { GetTranslationValue, Locale, TranslationKeyPath } from '@/types/i18n';
import React from 'react';

export interface UseI18nReturn {
  /**
   * Current locale
   */
  locale: Locale;
  
  /**
   * Translation function
   */
  t: <T extends TranslationKeyPath>(key: T, params?: Record<string, string | number>) => GetTranslationValue<T>;
  
  /**
   * Get available locales
   */
  availableLocales: Locale[];
  
  /**
   * Get locale display name
   */
  getLocaleDisplayName: (locale: Locale) => string;
}

/**
 * Hook to use internationalization in React components
 */
export function useI18n(): UseI18nReturn {
  const [locale, setLocaleState] = React.useState<Locale>(i18nService.getCurrentLocale());

  React.useEffect(() => {
    // Initialize i18n service
    i18nService.initialize().then(setLocaleState);

    // Subscribe to locale changes
    const unsubscribe = i18nService.subscribe(setLocaleState);

    return unsubscribe;
  }, []);

  const t = React.useCallback(<T extends TranslationKeyPath>(
    key: T, 
    params?: Record<string, string | number>
  ): GetTranslationValue<T> => {
    return i18nService.t(key, params);
  }, [locale]); // Re-create when locale changes

  return {
    locale,
    t,
    availableLocales: i18nService.getAvailableLocales(),
    getLocaleDisplayName: i18nService.getLocaleDisplayName.bind(i18nService),
  };
}
