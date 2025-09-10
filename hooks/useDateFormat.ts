import { useCallback } from 'react';
import { dateFormatService } from '../services/date-format';
import { useI18n } from './useI18n';

/**
 * Hook for formatting dates according to user preferences
 */
export function useDateFormat() {
  const { t } = useI18n();
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

  return {
    formatDate,
    formatRelativeTime,
    formatTime,
    formatDateKey,
  };
}
