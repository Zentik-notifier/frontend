import { i18nService } from '@/services/i18n';
import { Translation } from '@/types/translations.generated';
import React from 'react';

export type Locale = 'en-EN' | 'it-IT';

// Date picker locale type (react-native-paper-dates)
export type DatePickerLocale = 'en' | 'it';

// Map app locale to date picker locale
export const localeToDatePickerLocale: Record<Locale, DatePickerLocale> = {
  'en-EN': 'en',
  'it-IT': 'it',
};

// Helper type to get the value type for a given translation key path
export type GetTranslationValue<T extends string> = T extends keyof Translation
  ? Translation[T] extends string
  ? string
  : Translation[T]
  : string;

type Join<K, P> = K extends string | number
  ? P extends string | number
  ? `${K}.${P}`
  : never
  : never;

type PathType<T> = {
  [K in keyof T]: T[K] extends object
  ? K extends string | number
  ? T[K] extends any[]
  ? K
  : K | Join<K, PathType<T[K]>>
  : never
  : K;
}[keyof T];

export type TranslationKeyPath = PathType<Translation>;

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
