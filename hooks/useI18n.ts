import { Translation } from '@/types/translations.generated';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { settingsService } from '@/services/settings-service';
import enTranslations from '@/locales/en-EN.json';

export type Locale = 'en-EN' | 'it-IT';

// Date picker locale type (react-native-paper-dates)
export type DatePickerLocale = 'en' | 'it';

// Map app locale to date picker locale
export const localeToDatePickerLocale: Record<Locale, DatePickerLocale> = {
  'en-EN': 'en',
  'it-IT': 'it',
};

const translationsCache: Record<Locale, Translation | null> = {
  'en-EN': enTranslations,
  'it-IT': null,
};

const loadPromises: Partial<Record<Locale, Promise<void>>> = {};

export function loadLocale(locale: Locale): Promise<void> {
  if (translationsCache[locale]) return Promise.resolve();
  if (locale === 'en-EN') return Promise.resolve();

  if (loadPromises[locale]) return loadPromises[locale]!;

  loadPromises[locale] =
    locale === 'it-IT'
      ? import('@/locales/it-IT.json').then((mod) => {
        translationsCache['it-IT'] = mod.default;
        delete loadPromises['it-IT'];
      })
      : Promise.resolve();

  return loadPromises[locale]!;
}

export async function ensureLocaleLoaded(locale: Locale): Promise<void> {
  await loadLocale(locale);
}

function getTranslationForLocale(locale: Locale): Translation {
  return translationsCache[locale] ?? translationsCache['en-EN']!;
}

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
  locale: Locale;
  t: <T extends TranslationKeyPath>(key: T, params?: Record<string, string | number>) => GetTranslationValue<T>;
  availableLocales: Locale[];
  getLocaleDisplayName: (locale: Locale) => string;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function replaceParams(translation: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, translation);
}

export function useI18n(): UseI18nReturn {
  const [locale, setLocale] = useState<Locale>('en-EN');
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setLocaleLoaded] = useState(true);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const initSubscription = settingsService.isInitialized$.subscribe((initialized) => {
      isInitializedRef.current = initialized;
      setIsInitialized(initialized);

      if (initialized) {
        const initialSettings = settingsService.getSettings();
        setLocale(initialSettings.locale as Locale);
      }
    });

    const settingsSubscription = settingsService.userSettings$.subscribe((settings) => {
      if (isInitializedRef.current) {
        setLocale(settings.locale as Locale);
      }
    });

    return () => {
      initSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || locale === 'en-EN') {
      setLocaleLoaded(true);
      return;
    }

    setLocaleLoaded(false);
    loadLocale(locale).then(() => setLocaleLoaded(true));
  }, [locale, isInitialized]);

  const t = useCallback(<T extends TranslationKeyPath>(
    key: T,
    params?: Record<string, string | number>
  ): GetTranslationValue<T> => {
    const currentLocale = isInitialized ? locale : 'en-EN';
    return translateInstant(currentLocale, key, params);
  }, [locale, isInitialized]);

  const availableLocales = useMemo(() => (['en-EN', 'it-IT'] as Locale[]), []);

  const getLocaleDisplayName = useCallback((loc: Locale): string => {
    const displayNames: Record<Locale, string> = {
      'en-EN': 'English',
      'it-IT': 'Italiano',
    };
    return displayNames[loc] || loc;
  }, []);

  return {
    locale: isInitialized ? locale : 'en-EN',
    t,
    availableLocales,
    getLocaleDisplayName,
  };
}

export function translateInstant<T extends TranslationKeyPath>(
  locale: Locale,
  key: T,
  params?: Record<string, string | number>
): GetTranslationValue<T> {
  const currentLocale: Locale = locale || 'en-EN';
  const translationObj = getTranslationForLocale(currentLocale);
  const translation = getNestedValue(translationObj, key);

  if (typeof translation !== 'string') {
    console.warn(`Translation not found for key: ${key}`);
    return key as unknown as GetTranslationValue<T>;
  }

  if (params) {
    return replaceParams(translation, params) as GetTranslationValue<T>;
  }

  return translation as GetTranslationValue<T>;
}
