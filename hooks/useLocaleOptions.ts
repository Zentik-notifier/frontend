import { AppIcons } from '@/constants/Icons';
import { useLanguageSync } from './useLanguageSync';
import { InlinePickerOption } from '@/components/ui';

/**
 * Hook that provides locale options for pickers
 * Reuses the same locale system as the language selector
 */
export function useLocaleOptions(): InlinePickerOption<string>[] {
  const { availableLocales, getLocaleDisplayName } = useLanguageSync();
  
  return availableLocales.map(locale => ({
    value: locale,
    label: getLocaleDisplayName(locale),
    icon: "language" as keyof typeof AppIcons,
  }));
}
