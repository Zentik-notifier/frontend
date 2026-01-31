export function parseISO(dateString: string): Date {
  const d = new Date(dateString);
  return d;
}

export function isValid(d: Date): boolean {
  return !isNaN(d.getTime());
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function subDays(d: Date, amount: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - amount);
  return r;
}

export function isWithinInterval(
  date: Date,
  interval: { start: Date; end: Date }
): boolean {
  const t = date.getTime();
  return t >= interval.start.getTime() && t <= interval.end.getTime();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isYesterday(date: Date): boolean {
  const yesterday = subDays(new Date(), 1);
  return isSameDay(date, yesterday);
}

const RELATIVE_EN: Record<string, string> = {
  lessThanXSeconds: 'less than a minute',
  xSeconds: '{{count}} seconds ago',
  halfAMinute: 'half a minute ago',
  lessThanXMinutes: 'less than a minute',
  xMinutes: '{{count}} minutes ago',
  aboutXHours: 'about {{count}} hours ago',
  xHours: '{{count}} hours ago',
  xDays: '{{count}} days ago',
  aboutXWeeks: 'about {{count}} weeks ago',
  xWeeks: '{{count}} weeks ago',
  aboutXMonths: 'about {{count}} months ago',
  xMonths: '{{count}} months ago',
  aboutXYears: 'about {{count}} years ago',
  xYears: '{{count}} years ago',
};
const RELATIVE_IT: Record<string, string> = {
  lessThanXSeconds: 'meno di un minuto',
  xSeconds: '{{count}} secondi fa',
  halfAMinute: 'circa un minuto fa',
  lessThanXMinutes: 'meno di un minuto',
  xMinutes: '{{count}} minuti fa',
  aboutXHours: 'circa {{count}} ore fa',
  xHours: '{{count}} ore fa',
  xDays: '{{count}} giorni fa',
  aboutXWeeks: 'circa {{count}} settimane fa',
  xWeeks: '{{count}} settimane fa',
  aboutXMonths: 'circa {{count}} mesi fa',
  xMonths: '{{count}} mesi fa',
  aboutXYears: 'circa {{count}} anni fa',
  xYears: '{{count}} anni fa',
};

function getRelativeStrings(locale: string): Record<string, string> {
  return locale.startsWith('it') ? RELATIVE_IT : RELATIVE_EN;
}

function template(s: string, count: number): string {
  return s.replace('{{count}}', String(count));
}

export function formatDistanceToNow(
  date: Date,
  options?: { addSuffix?: boolean; includeSeconds?: boolean; locale?: string }
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const locale = options?.locale ?? 'en-EN';
  const strings = getRelativeStrings(locale);
  const suffix = options?.addSuffix !== false ? '' : '';

  if (options?.includeSeconds && diffSec < 30) {
    return (strings.lessThanXSeconds ?? 'less than a minute') + suffix;
  }
  if (options?.includeSeconds && diffSec < 60) {
    return template(strings.xSeconds, diffSec) + suffix;
  }
  if (diffSec < 90) {
    return (strings.lessThanXMinutes ?? 'less than a minute') + suffix;
  }
  if (diffMin < 60) {
    return template(strings.xMinutes, diffMin) + suffix;
  }
  if (diffHour < 24) {
    return (diffHour < 2 ? strings.aboutXHours : strings.xHours).replace(
      '{{count}}',
      String(diffHour)
    ) + suffix;
  }
  if (diffDay < 7) {
    return template(strings.xDays, diffDay) + suffix;
  }
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return template(weeks === 1 ? strings.aboutXWeeks : strings.xWeeks, weeks) + suffix;
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return template(
      months === 1 ? strings.aboutXMonths : strings.xMonths,
      months
    ) + suffix;
  }
  const years = Math.floor(diffDay / 365);
  return template(
    years === 1 ? strings.aboutXYears : strings.xYears,
    years
  ) + suffix;
}

type DateStyle = 'short' | 'medium' | 'long' | 'full';
type TimeStyle = 'short' | 'medium' | 'long';

function mapPatternToIntlOptions(
  pattern: string
): { dateStyle?: DateStyle; timeStyle?: TimeStyle; hour12?: boolean } {
  const p = pattern.trim();
  switch (p) {
    case 'P':
      return { dateStyle: 'short' };
    case 'PPP':
      return { dateStyle: 'medium' };
    case 'PPPP':
      return { dateStyle: 'long' };
    case 'HH:mm':
      return { timeStyle: 'short', hour12: false };
    case 'h:mm a':
      return { timeStyle: 'short', hour12: true };
    default:
      return { dateStyle: 'medium' };
  }
}

function formatPart(
  date: Date,
  timeZone: string,
  pattern: string,
  locale: string
): string {
  const opts = mapPatternToIntlOptions(pattern);
  const loc = localeMap[locale] ?? locale;
  try {
    return new Intl.DateTimeFormat(loc, { timeZone, ...opts }).format(date);
  } catch {
    return new Intl.DateTimeFormat(loc, opts).format(date);
  }
}

const localeMap: Record<string, string> = {
  'en-EN': 'en-US',
  'it-IT': 'it',
};

export function formatInTimeZone(
  date: Date,
  timeZone: string,
  formatPattern: string,
  options?: { locale?: string }
): string {
  const locale = options?.locale ?? 'en-EN';
  const parts = formatPattern.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((p) => formatPart(date, timeZone, p, locale))
      .join(' ');
  }
  return formatPart(date, timeZone, formatPattern, locale);
}

export function getLocalizedTodayYesterday(
  type: 'today' | 'yesterday',
  locale: string
): string {
  if (locale.startsWith('it')) {
    return type === 'today' ? 'oggi' : 'ieri';
  }
  return type === 'today' ? 'today' : 'yesterday';
}
