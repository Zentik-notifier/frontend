import { Translation } from '@/types/translations.generated';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettings } from './useSettings';
import enTranslations from '@/locales/en-EN.json';
import itTranslations from '@/locales/it-IT.json';

export type Locale = 'en-EN' | 'it-IT';

// Date picker locale type (react-native-paper-dates)
export type DatePickerLocale = 'en' | 'it';

// Map app locale to date picker locale
export const localeToDatePickerLocale: Record<Locale, DatePickerLocale> = {
  'en-EN': 'en',
  'it-IT': 'it',
};

// Translations map
const translations: Record<Locale, Translation> = {
  'en-EN': enTranslations,
  'it-IT': itTranslations,
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
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Replace parameters in translation string
 */
function replaceParams(translation: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, translation);
}

/**
 * Hook to use internationalization in React components
 * Automatically syncs with settings service locale
 */
export function useI18n(): UseI18nReturn {
  const { settings } = useSettings();
  const locale = settings.locale as Locale;

  const t = useCallback(<T extends TranslationKeyPath>(
    key: T,
    params?: Record<string, string | number>
  ): GetTranslationValue<T> => {
    const translation = getNestedValue(translations[locale], key);

    if (typeof translation !== 'string') {
      console.warn(`Translation not found for key: ${key}`);
      return key as unknown as GetTranslationValue<T>;
    }

    // Replace parameters if provided
    if (params) {
      return replaceParams(translation, params) as GetTranslationValue<T>;
    }

    return translation as GetTranslationValue<T>;
  }, [locale]);

  const availableLocales = useMemo(() => Object.keys(translations) as Locale[], []);

  const getLocaleDisplayName = useCallback((loc: Locale): string => {
    const displayNames: Record<Locale, string> = {
      'en-EN': 'English',
      'it-IT': 'Italiano',
    };
    return displayNames[loc] || loc;
  }, []);

  return {
    locale,
    t,
    availableLocales,
    getLocaleDisplayName,
  };
}
