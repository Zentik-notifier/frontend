import { useCallback, useMemo } from 'react';
import { dateFormatService } from '../services/date-format';
import { DatePickerLocale, localeToDatePickerLocale, useI18n } from './useI18n';
import { useUserSettings } from '@/services/user-settings';

/**
 * Hook for formatting dates according to user preferences
 */
export function useDateFormat() {
  const { t, locale } = useI18n();
  const { settings } = useUserSettings();

  const formatDate = useCallback((date: Date | string, includeTime?: boolean) => {
    return dateFormatService.formatDate(date, includeTime);
  }, []);

  const formatRelativeTime = useCallback((date: Date | string) => {
    return dateFormatService.formatRelativeTime(date);
  }, []);

  const formatTime = useCallback((date: Date | string) => {
    return dateFormatService.formatTime(date);
  }, []);

  const formatDateKey = useCallback((dateKey: string): string => {
    const date = new Date(dateKey);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('gallery.today');
    } else if (diffDays === 1) {
      return t('gallery.yesterday');
    } else if (diffDays <= 7) {
      return t('gallery.thisWeek');
    } else if (diffDays <= 30) {
      return t('gallery.thisMonth');
    } else {
      return t('gallery.older');
    }
  }, [t]);

  /**
   * Get the locale string for react-native-paper-dates DatePickerInput
   * Converts app locale (e.g., 'it-IT') to date picker locale (e.g., 'it')
   */
  const datePickerLocale = useMemo((): DatePickerLocale => {
    return localeToDatePickerLocale[locale] || 'en';
  }, [locale]);

  return {
    formatDate,
    formatRelativeTime,
    formatTime,
    formatDateKey,
    datePickerLocale,
    use24HourTime: settings.dateFormat.use24HourTime
  };
}
