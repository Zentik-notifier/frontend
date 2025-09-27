// Internationalization exports - cleaned up for progressive implementation
export { I18nProvider, useI18nContext } from '@/components/I18nProvider';
export { useI18n } from '@/hooks/useI18n';
export { useLanguageSync } from '@/hooks/useLanguageSync';
export { i18nService } from '@/services/i18n';

// Types
export type { GetTranslationValue, Locale, Translation, TranslationKey, TranslationKeyPath } from '@/types/i18n';
