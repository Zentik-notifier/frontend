import { formatDistanceToNow, isToday, isValid, isYesterday, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, it } from 'date-fns/locale';
import { DateFormatPreferences, DateFormatStyle, settingsService } from './settings-service';

// Re-export types from settings-service for convenience
export type { DateFormatPreferences, DateFormatStyle } from './settings-service';

// Utility function to get date-fns locale
const getDateFnsLocale = (locale: string) => {
  switch (locale) {
    case 'it-IT':
      return it;
    case 'en-EN':
    default:
      return enUS;
  }
};

// Date format style definitions with examples
export const DATE_FORMAT_STYLES: Record<DateFormatStyle, { name: string; example: string; description: string }> = {
  short: {
    name: 'Breve',
    example: '15/01/24',
    description: 'Formato data breve'
  },
  medium: {
    name: 'Medio',
    example: '15 gen 2024',
    description: 'Formato data medio'
  },
  long: {
    name: 'Lungo',
    example: '15 gennaio 2024',
    description: 'Formato data lungo'
  }
};

// Get date pattern based on style
const getDatePattern = (style: DateFormatStyle): string => {
  switch (style) {
    case 'short':
      return 'P'; // Localized short date (15/01/2024 or 01/15/2024)
    case 'medium':
      return 'PPP'; // Localized medium date (15 gen 2024)
    case 'long':
      return 'PPPP'; // Localized long date (15 gennaio 2024)
    default:
      return 'PPP';
  }
};

// Get time pattern based on preferences
const getTimePattern = (use24Hour: boolean): string => {
  return use24Hour ? 'HH:mm' : 'h:mm a';
};

export class DateFormatService {
  /**
   * Format a date according to user preferences with fixed logic:
   * - < 1 minute: shows seconds ago
   * - < 1 hour: shows minutes ago  
   * - today/yesterday: shows time + today/yesterday
   * - other cases: shows time + date
   */
  formatRelativeTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(targetDate)) {
      return 'Invalid Date';
    }

    try {
      const locale = this.getLocaleWithFallback();
      const preferences = this.getDateFormatPreferencesWithFallback();
      const timezone = this.getTimezoneWithFallback();
      const dateFnsLocale = getDateFnsLocale(locale);
      
      const now = new Date();
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInMinutes = diffInMs / (1000 * 60);
      const diffInHours = diffInMs / (1000 * 60 * 60);
      
      // < 1 minute: show seconds ago
      if (diffInMinutes < 1) {
        return formatDistanceToNow(targetDate, { 
          addSuffix: true,
          locale: dateFnsLocale,
          includeSeconds: true
        });
      }
      
      // < 1 hour: show minutes ago
      if (diffInHours < 1) {
        return formatDistanceToNow(targetDate, { 
          addSuffix: true,
          locale: dateFnsLocale
        });
      }
      
      // Format time
      const timePattern = getTimePattern(preferences.use24HourTime);
      const timeString = formatInTimeZone(targetDate, timezone, timePattern, { locale: dateFnsLocale });
      
      // Check if today/yesterday using date-fns functions
      if (isToday(targetDate)) {
        // Use date-fns to get localized "today" 
        const todayText = this.getLocalizedTodayYesterday('today', dateFnsLocale);
        return `${timeString}, ${todayText}`;
      } else if (isYesterday(targetDate)) {
        // Use date-fns to get localized "yesterday"
        const yesterdayText = this.getLocalizedTodayYesterday('yesterday', dateFnsLocale);
        return `${timeString}, ${yesterdayText}`;
      } else {
        // Other cases: show time + date
        const datePattern = getDatePattern(preferences.dateStyle);
        const dateString = formatInTimeZone(targetDate, timezone, datePattern, { locale: dateFnsLocale });
        return `${timeString}, ${dateString}`;
      }
      
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return this.formatDate(targetDate);
    }
  }

  /**
   * Format a date according to user preferences
   */
  formatDate(date: Date | string, includeTime: boolean = false): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(targetDate)) {
      return 'Invalid Date';
    }

    try {
      const locale = this.getLocaleWithFallback();
      const preferences = this.getDateFormatPreferencesWithFallback();
      const timezone = this.getTimezoneWithFallback();
      const dateFnsLocale = getDateFnsLocale(locale);

      const datePattern = getDatePattern(preferences.dateStyle);
      let pattern = datePattern;
      
      if (includeTime) {
        const timePattern = getTimePattern(preferences.use24HourTime);
        pattern = `${datePattern} ${timePattern}`;
      }

      return formatInTimeZone(targetDate, timezone, pattern, { locale: dateFnsLocale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return targetDate.toISOString();
    }
  }

  /**
   * Format time only (e.g., "2:30 PM", "14:30")
   */
  formatTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(targetDate)) {
      return 'Invalid Time';
    }

    try {
      const preferences = this.getDateFormatPreferencesWithFallback();
      const locale = this.getLocaleWithFallback();
      const timezone = this.getTimezoneWithFallback();
      const dateFnsLocale = getDateFnsLocale(locale);

      const timePattern = getTimePattern(preferences.use24HourTime);

      return formatInTimeZone(targetDate, timezone, timePattern, { locale: dateFnsLocale });
    } catch (error) {
      console.error('Error formatting time:', error);
      return targetDate.toISOString().split('T')[1].substring(0, 5);
    }
  }

  /**
   * Get locale with fallback when settings is not initialized
   */
  private getLocaleWithFallback(): string {
    try {
      return settingsService.getSettings().locale;
    } catch (error) {
      return 'en-EN';
    }
  }

  /**
   * Get timezone with fallback when settings is not initialized
   */
  private getTimezoneWithFallback(): string {
    try {
      return settingsService.getSettings().timezone;
    } catch (error) {
      return 'UTC';
    }
  }

  /**
   * Get date format preferences with fallback when settings is not initialized
   */
  private getDateFormatPreferencesWithFallback(): DateFormatPreferences {
    try {
      return settingsService.getSettings().dateFormat;
    } catch (error) {
      return {
        dateStyle: 'medium',
        use24HourTime: true,
      };
    }
  }

  /**
   * Get localized "today" or "yesterday" strings
   */
  private getLocalizedTodayYesterday(type: 'today' | 'yesterday', dateFnsLocale: any): string {
    // Simple locale mapping based on date-fns locale
    if (dateFnsLocale === it) {
      return type === 'today' ? 'oggi' : 'ieri';
    } else {
      return type === 'today' ? 'today' : 'yesterday';
    }
  }
}

// Export singleton instance
export const dateFormatService = new DateFormatService();