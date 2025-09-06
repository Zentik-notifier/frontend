import { GetTranslationValue, Locale, Translation } from '@/types/i18n';

// Import translations
import enTranslations from '@/locales/en-EN.json';
import itTranslations from '@/locales/it-IT.json';

const translations: Record<Locale, Translation> = {
  'en-EN': enTranslations as Translation,
  'it-IT': itTranslations as Translation,
};

const DEFAULT_LOCALE: Locale = 'en-EN';

class I18nService {
  private currentLocale: Locale = DEFAULT_LOCALE;
  private listeners: Set<(locale: Locale) => void> = new Set();

  /**
   * Initialize i18n service (locale will be set by UserSettings)
   */
  async initialize(): Promise<Locale> {
    return this.currentLocale;
  }

  /**
   * Get current locale
   */
  getCurrentLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * Set current locale (internal use only - follows UserSettings)
   */
  async setLocale(locale: Locale): Promise<void> {
    if (!this.isValidLocale(locale)) {
      throw new Error(`Invalid locale: ${locale}`);
    }

    this.currentLocale = locale;
    // Notify listeners so UI updates
    this.notifyListeners();
  }

  /**
   * Get translation for a key
   */
  t<T extends string>(key: T, params?: Record<string, string | number>): GetTranslationValue<T> {
    const translation = this.getNestedValue(translations[this.currentLocale], key);
    
    if (typeof translation !== 'string') {
      console.warn(`Translation not found for key: ${key}`);
      return key as unknown as GetTranslationValue<T>;
    }

    // Replace parameters if provided
    if (params) {
      return this.replaceParams(translation, params) as GetTranslationValue<T>;
    }

    return translation as GetTranslationValue<T>;
  }

  /**
   * Get all available locales
   */
  getAvailableLocales(): Locale[] {
    return Object.keys(translations) as Locale[];
  }

  /**
   * Get locale display name
   */
  getLocaleDisplayName(locale: Locale): string {
    const displayNames: Record<Locale, string> = {
      'en-EN': 'English',
      'it-IT': 'Italiano',
    };
    return displayNames[locale] || locale;
  }

  /**
   * Subscribe to locale changes
   */
  subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if locale is valid
   */
  private isValidLocale(locale: string): locale is Locale {
    return locale in translations;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Replace parameters in translation string
   */
  private replaceParams(translation: string, params: Record<string, string | number>): string {
    return Object.entries(params).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, translation);
  }

  /**
   * Notify listeners of locale changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentLocale);
      } catch (error) {
        console.error('Error notifying i18n listener:', error);
      }
    });
  }
}

// Export singleton instance
export const i18nService = new I18nService();
