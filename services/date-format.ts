import {
  formatDistanceToNow,
  formatInTimeZone,
  getLocalizedTodayYesterday,
  isToday,
  isValid,
  isYesterday,
  parseISO,
} from '@/utils/date-utils';
import { DateFormatPreferences, DateFormatStyle, settingsService } from './settings-service';

export type { DateFormatPreferences, DateFormatStyle } from './settings-service';

const getDatePattern = (style: DateFormatStyle): string => {
  switch (style) {
    case 'short':
      return 'P';
    case 'medium':
      return 'PPP';
    case 'long':
      return 'PPPP';
    default:
      return 'PPP';
  }
};

const getTimePattern = (use24Hour: boolean): string => {
  return use24Hour ? 'HH:mm' : 'h:mm a';
};

export const DATE_FORMAT_STYLES: Record<DateFormatStyle, { name: string; example: string; description: string }> = {
  short: {
    name: 'Breve',
    example: '15/01/24',
    description: 'Formato data breve',
  },
  medium: {
    name: 'Medio',
    example: '15 gen 2024',
    description: 'Formato data medio',
  },
  long: {
    name: 'Lungo',
    example: '15 gennaio 2024',
    description: 'Formato data lungo',
  },
};

export class DateFormatService {
  formatRelativeTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(targetDate)) {
      return 'Invalid Date';
    }

    try {
      const locale = this.getLocaleWithFallback();
      const preferences = this.getDateFormatPreferencesWithFallback();
      const timezone = this.getTimezoneWithFallback();

      const now = new Date();
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInMinutes = diffInMs / (1000 * 60);
      const diffInHours = diffInMs / (1000 * 60 * 60);

      if (diffInMinutes < 1) {
        return formatDistanceToNow(targetDate, {
          addSuffix: true,
          locale,
          includeSeconds: true,
        });
      }

      if (diffInHours < 1) {
        return formatDistanceToNow(targetDate, {
          addSuffix: true,
          locale,
        });
      }

      const timePattern = getTimePattern(preferences.use24HourTime);
      const timeString = formatInTimeZone(targetDate, timezone, timePattern, { locale });

      if (isToday(targetDate)) {
        const todayText = getLocalizedTodayYesterday('today', locale);
        return `${timeString}, ${todayText}`;
      }
      if (isYesterday(targetDate)) {
        const yesterdayText = getLocalizedTodayYesterday('yesterday', locale);
        return `${timeString}, ${yesterdayText}`;
      }

      const datePattern = getDatePattern(preferences.dateStyle);
      const dateString = formatInTimeZone(targetDate, timezone, datePattern, { locale });
      return `${timeString}, ${dateString}`;
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return this.formatDate(targetDate);
    }
  }

  formatDate(date: Date | string, includeTime: boolean = false): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(targetDate)) {
      return 'Invalid Date';
    }

    try {
      const locale = this.getLocaleWithFallback();
      const preferences = this.getDateFormatPreferencesWithFallback();
      const timezone = this.getTimezoneWithFallback();

      const datePattern = getDatePattern(preferences.dateStyle);
      let pattern = datePattern;

      if (includeTime) {
        const timePattern = getTimePattern(preferences.use24HourTime);
        pattern = `${datePattern} ${timePattern}`;
      }

      return formatInTimeZone(targetDate, timezone, pattern, { locale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return targetDate.toISOString();
    }
  }

  formatTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(targetDate)) {
      return 'Invalid Time';
    }

    try {
      const preferences = this.getDateFormatPreferencesWithFallback();
      const locale = this.getLocaleWithFallback();
      const timezone = this.getTimezoneWithFallback();
      const timePattern = getTimePattern(preferences.use24HourTime);

      return formatInTimeZone(targetDate, timezone, timePattern, { locale });
    } catch (error) {
      console.error('Error formatting time:', error);
      return targetDate.toISOString().split('T')[1]?.substring(0, 5) ?? '';
    }
  }

  private getLocaleWithFallback(): string {
    try {
      return settingsService.getSettings().locale;
    } catch {
      return 'en-EN';
    }
  }

  private getTimezoneWithFallback(): string {
    try {
      return settingsService.getSettings().timezone;
    } catch {
      return 'UTC';
    }
  }

  private getDateFormatPreferencesWithFallback(): DateFormatPreferences {
    try {
      return settingsService.getSettings().dateFormat;
    } catch {
      return {
        dateStyle: 'medium',
        use24HourTime: true,
      };
    }
  }
}

export const dateFormatService = new DateFormatService();
