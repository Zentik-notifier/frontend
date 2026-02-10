import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { MediaType, UserSettingType, NotificationFragment } from '@/generated/gql-operations-generated';
import { ThemePreset } from './theme-presets';
import { startOfDay, subDays, isWithinInterval } from '@/utils/date-utils';
import { Locale } from '@/hooks/useI18n';
import * as Keychain from 'react-native-keychain';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { settingsRepository } from './settings-repository';
import AsyncStorage from '@/utils/async-storage-wrapper';

const CURRENT_TERMS_VERSION = '1.0.0';

// API Configuration
export const API_PREFIX = 'api/v1';
const IS_SELF_HOSTED = process.env.EXPO_PUBLIC_SELFHOSTED === 'true';
const DEFAULT_API_URL = IS_SELF_HOSTED && typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.EXPO_PUBLIC_API_URL || 'https://notifier-api.zentik.app');

const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

export const DEFAULT_MEDIA_TYPES = Object.values(MediaType).filter(
  (type) => type !== MediaType.Icon
);

export type DateFormatStyle = 'short' | 'medium' | 'long';

export interface DateFormatPreferences {
  dateStyle: DateFormatStyle;
  use24HourTime: boolean;
}

export type MarkAsReadMode = 'on-tap' | 'on-view' | 'on-app-close';
export type LayoutMode = 'auto' | 'desktop' | 'tablet' | 'mobile';

export interface DynamicThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface NotificationVisualization {
  hideRead: boolean;
  timeRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  customTimeRange?: {
    from: string;
    to: string;
  };
  selectedBucketIds: string[];
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'priority';
  showOnlyWithAttachments: boolean;
  loadOnlyVisible: boolean;
  enableHtmlRendering: boolean;
  isCompactMode: boolean;
}

export interface ThemeSettings {
  themeMode: 'light' | 'dark' | 'system';
  layoutMode: LayoutMode;
  themePreset?: ThemePreset;
  useDynamicTheme?: boolean;
  dynamicThemeColors?: DynamicThemeColors;
  textScale: number;
}

export interface RetentionPolicies {
  maxCachedNotifications?: number;
  maxCachedNotificationsDay?: number;
  maxCacheSizeMB?: number;
  maxCageAgeDays?: number;
}

export interface DownloadSettings {
  autoDownloadEnabled: boolean;
  wifiOnlyDownload: boolean;
}

export interface GalleryVisualization {
  autoPlay: boolean;
  showFaultyMedias: boolean;
  gridSize: number;
  selectedMediaTypes: MediaType[];
}

export interface UserSettings {
  theme: ThemeSettings;
  locale: Locale;
  timezone: string;
  dateFormat: DateFormatPreferences;
  retentionPolicies: RetentionPolicies;
  downloadSettings: DownloadSettings;
  notificationsLastSeenId?: string;
  notificationVisualization: NotificationVisualization;
  notificationsPreferences?: {
    unencryptOnBigPayload?: boolean;
    markAsReadMode?: MarkAsReadMode;
    generateBucketIconWithInitials?: boolean;
    autoAddDeleteAction?: boolean;
    autoAddMarkAsReadAction?: boolean;
    autoAddOpenNotificationAction?: boolean;
    defaultPostpones?: number[];
    defaultSnoozes?: number[];
  };
  githubEventsFilter?: string[];
  galleryVisualization: GalleryVisualization;
  onboarding: {
    hasCompletedOnboarding: boolean;
  };
  termsAcceptance: {
    termsEnabled: boolean;
    termsAccepted: boolean;
    acceptedVersion: string;
  };
  hideHints?: boolean;
  lastCleanup?: string;
  lastKeysRotation?: string;
  /** ID of the last changelog entry for which the user has seen the modal */
  lastSeenChangelogId?: string;
  // List of recently used bucket sharing identifiers (emails/usernames/userIds)
  bucketSharingHints?: string[];
  // Privacy: disable user action tracking for non-commercial purposes
  disableUserTracking?: boolean;

  // Debug: enable verbose CloudKit logging (native + JS)
  cloudKitDebug?: boolean;
}

export interface AuthData {
  accessToken: string | null;
  refreshToken: string | null;
  deviceToken: string | null;
  deviceId: string | null;
  lastUserId: string | null;
  privateKey: string | null;
  pushNotificationsInitialized: boolean;
  pendingNavigationIntent: any | null;
  badgeCount: number;
  apiEndpoint: string | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: {
    themeMode: 'system',
    layoutMode: 'auto',
    themePreset: ThemePreset.Material3,
    useDynamicTheme: false,
    dynamicThemeColors: {
      primary: '#6750A4',
      secondary: '#625B71',
      tertiary: '#7D5260',
    },
    textScale: 1.0,
  },
  locale: 'en-EN',
  timezone: getDeviceTimezone(),
  dateFormat: {
    dateStyle: 'medium',
    use24HourTime: true,
  },
  retentionPolicies: {
    maxCachedNotifications: 1500,
    maxCachedNotificationsDay: 14,
    maxCacheSizeMB: undefined,
    maxCageAgeDays: 120,
  },
  downloadSettings: {
    autoDownloadEnabled: true,
    wifiOnlyDownload: false,
  },
  cloudKitDebug: false,
  notificationsLastSeenId: undefined,
  notificationVisualization: {
    hideRead: false,
    timeRange: 'all',
    customTimeRange: undefined,
    selectedBucketIds: [],
    searchQuery: '',
    sortBy: 'newest',
    showOnlyWithAttachments: false,
    loadOnlyVisible: false,
    enableHtmlRendering: true,
    isCompactMode: true,
  },
  notificationsPreferences: {
    unencryptOnBigPayload: false,
    markAsReadMode: 'on-view',
    generateBucketIconWithInitials: true,
    autoAddDeleteAction: true,
    autoAddMarkAsReadAction: true,
    autoAddOpenNotificationAction: false,
    defaultPostpones: [],
    defaultSnoozes: [],
  },
  githubEventsFilter: [],
  galleryVisualization: {
    autoPlay: true,
    showFaultyMedias: false,
    gridSize: 3,
    selectedMediaTypes: DEFAULT_MEDIA_TYPES,
  },
  onboarding: {
    hasCompletedOnboarding: false,
  },
  termsAcceptance: {
    termsEnabled: false,
    termsAccepted: false,
    acceptedVersion: CURRENT_TERMS_VERSION,
  },
  hideHints: false,
  lastCleanup: undefined,
  lastKeysRotation: undefined,
  lastSeenChangelogId: undefined,
  bucketSharingHints: [],
  disableUserTracking: false,
};

const DEFAULT_AUTH_DATA: AuthData = {
  accessToken: null,
  refreshToken: null,
  deviceToken: null,
  deviceId: null,
  lastUserId: null,
  privateKey: null,
  pushNotificationsInitialized: false,
  pendingNavigationIntent: null,
  badgeCount: 0,
  apiEndpoint: null,
};

const SERVICE = 'zentik-auth';
const PRIVATE_KEY_SERVICE = 'zentik-private-key';
const API_ENDPOINT_SERVICE = 'zentik-api-endpoint';

const bundleIdentifier = process.env.EXPO_PUBLIC_APP_VARIANT === 'development' ?
  'com.apocaliss92.zentik.dev' :
  'com.apocaliss92.zentik';
const KEYCHAIN_ACCESS_GROUP = `C3F24V5NS5.${bundleIdentifier}.keychain`;
const ACCESSIBLE = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK;

class SettingsService {
  private settingsSubject = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);
  private authDataSubject = new BehaviorSubject<AuthData>(DEFAULT_AUTH_DATA);
  private initializedSubject = new BehaviorSubject<boolean>(false);
  private dbInitialized = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();

      await Promise.all([
        this.loadUserSettings(),
        this.loadAuthData()
      ]);

      // Ensure API endpoint is set in database for iOS extensions (NCE/NSE/Share)
      // Never allow empty API endpoint - always use default as fallback
      const currentEndpoint = this.authDataSubject.value.apiEndpoint;
      if (!currentEndpoint || currentEndpoint.trim() === '') {
        await this.saveApiEndpoint(DEFAULT_API_URL);
      } else if (Platform.OS === 'ios' || Platform.OS === 'macos') {
        try {
          const options: Keychain.SetOptions = Device.isDevice
            ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
            : { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
          await Keychain.setGenericPassword('api', currentEndpoint.trim(), options);
        } catch { }
      }

      this.initializedSubject.next(true);
    } catch (error) {
      console.error('Failed to initialize SettingsService:', error);
      this.initializedSubject.next(true);
    }
  }

  private async initializeDatabase(): Promise<void> {
    if (this.dbInitialized) return;
    this.dbInitialized = true;
  }

  private async loadUserSettings(): Promise<void> {
    try {
      const settings: Partial<UserSettings> = {};

      // Settings that are stored as plain strings (not JSON)
      const stringKeys: (keyof UserSettings)[] = [
        'locale',
        'timezone',
        'notificationsLastSeenId',
        'lastCleanup',
        'lastKeysRotation',
        'hideHints',
        'disableUserTracking',
        'lastSeenChangelogId',
      ];

      // Settings that are stored as JSON objects
      const jsonKeys: (keyof UserSettings)[] = [
        'theme',
        'dateFormat',
        'retentionPolicies',
        'downloadSettings',
        'notificationVisualization',
        'notificationsPreferences',
        'githubEventsFilter',
        'galleryVisualization',
        'onboarding',
        'termsAcceptance',
        'bucketSharingHints',
      ];

      await Promise.all([
        // Load string settings
        ...stringKeys.map(async (key) => {
          try {
            const stored = await settingsRepository.getSetting(key);
            if (stored !== null && stored !== undefined) {
              // For boolean values, convert string to boolean
              if (key === 'hideHints' || key === 'disableUserTracking') {
                settings[key] = (stored === 'true') as any;
              } else {
                settings[key] = stored as any;
              }
            }
          } catch (error) {
            console.error(`Failed to load string setting ${key}:`, error);
          }
        }),
        // Load JSON settings
        ...jsonKeys.map(async (key) => {
          try {
            const stored = await settingsRepository.getSetting(key);
            if (stored) {
              settings[key] = JSON.parse(stored) as any;
            }
          } catch (error) {
            console.error(`Failed to load JSON setting ${key}:`, error);
          }
        })
      ]);

      const merged = this.deepMerge(DEFAULT_SETTINGS, settings);
      this.settingsSubject.next(merged);
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }

  private async loadAuthData(): Promise<void> {
    try {
      // Load sensitive data from Keychain
      const [accessToken, refreshToken, privateKey] = await Promise.all([
        this.getAccessTokenFromStorage(),
        this.getRefreshTokenFromStorage(),
        this.getPrivateKeyFromStorage(),
      ]);

      // Load non-sensitive data from settingsRepository
      // Note: pendingNavigationIntent is read directly from DB in realtime, not cached
      const [
        deviceToken,
        deviceId,
        lastUserId,
        pushInitStr,
        badgeCountStr,
        apiEndpointFromRepo,
      ] = await Promise.all([
        settingsRepository.getSetting('auth_deviceToken'),
        settingsRepository.getSetting('auth_deviceId'),
        settingsRepository.getSetting('auth_lastUserId'),
        settingsRepository.getSetting('auth_pushNotificationsInitialized'),
        settingsRepository.getSetting('auth_badgeCount'),
        settingsRepository.getSetting('auth_apiEndpoint'),
      ]);

      let apiEndpoint = apiEndpointFromRepo ?? null;
      if ((Platform.OS === 'ios' || Platform.OS === 'macos') && !apiEndpoint) {
        apiEndpoint = await this.getApiEndpointFromKeychain();
      }

      const pushNotificationsInitialized = pushInitStr === 'true';
      const badgeCount = badgeCountStr ? parseInt(badgeCountStr, 10) : 0;

      this.authDataSubject.next({
        accessToken,
        refreshToken,
        deviceToken,
        deviceId,
        lastUserId,
        privateKey,
        pushNotificationsInitialized,
        pendingNavigationIntent: null, // Not cached - read directly from DB when needed
        badgeCount,
        apiEndpoint,
      });
    } catch (error) {
      console.error('Failed to load auth data:', error);
    }
  }

  public get userSettings$(): Observable<UserSettings> {
    return this.settingsSubject.asObservable().pipe(distinctUntilChanged());
  }

  public get authData$(): Observable<AuthData> {
    return this.authDataSubject.asObservable().pipe(distinctUntilChanged());
  }

  public get isInitialized$(): Observable<boolean> {
    return this.initializedSubject.asObservable().pipe(distinctUntilChanged());
  }

  public selectSettings<K extends keyof UserSettings>(key: K): Observable<UserSettings[K]> {
    return this.settingsSubject.pipe(
      map(settings => settings[key]),
      distinctUntilChanged()
    );
  }

  public selectAuthData<K extends keyof AuthData>(key: K): Observable<AuthData[K]> {
    return this.authDataSubject.pipe(
      map(authData => authData[key]),
      distinctUntilChanged()
    );
  }

  public getSettings(): UserSettings {
    return { ...this.settingsSubject.value };
  }

  public getAuthData(): AuthData {
    return { ...this.authDataSubject.value };
  }

  public async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const newSettings = { ...this.settingsSubject.value, ...updates };
    this.settingsSubject.next(newSettings);

    // Save only the changed keys
    const changedKeys = Object.keys(updates) as (keyof UserSettings)[];
    await this.savePartialSettings(changedKeys, newSettings);
  }

  public getLastSeenChangelogId(): string | undefined {
    return this.settingsSubject.value.lastSeenChangelogId;
  }

  public async setLastSeenChangelogId(changelogId: string): Promise<void> {
    await this.updateSettings({ lastSeenChangelogId: changelogId });
  }

  public async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      theme: {
        ...current.theme,
        themeMode: mode,
      },
    });
  }

  public async setLayoutMode(mode: LayoutMode): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      theme: {
        ...current.theme,
        layoutMode: mode,
      },
    });
  }

  public async setCustomThemeSettings(settings: {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
    textScale?: number;
  }): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      theme: {
        ...current.theme,
        ...settings,
      },
    });
  }

  public async setTextScale(scale: number): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      theme: {
        ...current.theme,
        textScale: Math.max(0.5, Math.min(2.0, scale)), // Clamp between 0.5 and 2.0
      },
    });
  }

  public async setNotificationVisualization(filters: Partial<NotificationVisualization>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationVisualization: {
        ...current.notificationVisualization,
        ...filters,
      },
    });
  }

  public async setLocale(locale: string): Promise<void> {
    const current = this.settingsSubject.value;
    const newSettings = { ...current, locale: locale as Locale };
    this.settingsSubject.next(newSettings);
    await this.saveSettings(newSettings);
  }

  public async setTimezone(timezone: string): Promise<void> {
    await this.updateSettings({ timezone });
  }

  public async setDateFormatPreferences(preferences: Partial<DateFormatPreferences>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      dateFormat: {
        ...current.dateFormat,
        ...preferences,
      },
    });
  }

  public async setIsCompactMode(isCompact: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationVisualization: {
        ...current.notificationVisualization,
        isCompactMode: isCompact,
      },
    });
  }

  public async setMaxCachedNotifications(max: number | undefined): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      retentionPolicies: {
        ...current.retentionPolicies,
        maxCachedNotifications: max,
      },
    });
  }

  public async setMaxCachedNotificationsDay(days: number | undefined): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      retentionPolicies: {
        ...current.retentionPolicies,
        maxCachedNotificationsDay: days,
      },
    });
  }

  public async updateRetentionPolicies(policies: Partial<RetentionPolicies>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      retentionPolicies: {
        ...current.retentionPolicies,
        ...policies,
      },
    });
  }

  public async updateDownloadSettings(settings: Partial<DownloadSettings>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      downloadSettings: {
        ...current.downloadSettings,
        ...settings,
      },
    });
  }

  public async setNotificationsLastSeenId(id: string | undefined): Promise<void> {
    await this.updateSettings({ notificationsLastSeenId: id });
  }

  // Notification Preferences setters
  public async setUnencryptOnBigPayload(value: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        unencryptOnBigPayload: value,
      },
    });
  }

  public async setMarkAsReadMode(mode: MarkAsReadMode): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        markAsReadMode: mode,
      },
    });
  }

  public async setGenerateBucketIconWithInitials(value: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        generateBucketIconWithInitials: value,
      },
    });
  }

  public async setAutoAddDeleteAction(value: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        autoAddDeleteAction: value,
      },
    });
  }

  public async setAutoAddMarkAsReadAction(value: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        autoAddMarkAsReadAction: value,
      },
    });
  }

  public async setAutoAddOpenNotificationAction(value: boolean): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        autoAddOpenNotificationAction: value,
      },
    });
  }

  public async setDefaultPostpones(values: number[]): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        defaultPostpones: values,
      },
    });
  }

  public async setDefaultSnoozes(values: number[]): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      notificationsPreferences: {
        ...current.notificationsPreferences,
        defaultSnoozes: values,
      },
    });
  }

  public async setGithubEventsFilter(events: string[]): Promise<void> {
    await this.updateSettings({ githubEventsFilter: events });
  }

  public async updateGalleryVisualization(updates: Partial<GalleryVisualization>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      galleryVisualization: {
        ...current.galleryVisualization,
        ...updates,
      },
    });
  }

  public async setGalleryGridSize(size: number): Promise<void> {
    if (Number.isNaN(size)) return;
    const clamped = Math.min(8, Math.max(1, Math.floor(size)));
    await this.updateGalleryVisualization({ gridSize: clamped });
  }

  public async updateOnboardingSettings(updates: Partial<UserSettings['onboarding']>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      onboarding: {
        ...current.onboarding,
        ...updates,
      },
    });
  }

  public async completeOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      hasCompletedOnboarding: true,
    });
  }

  public async skipOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      hasCompletedOnboarding: true,
    });
  }

  public async updateTermsAcceptanceSettings(updates: Partial<UserSettings['termsAcceptance']>): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      termsAcceptance: {
        ...current.termsAcceptance,
        ...updates,
      },
    });
  }

  public async acceptTerms(): Promise<void> {
    await this.updateTermsAcceptanceSettings({
      termsAccepted: true,
      acceptedVersion: CURRENT_TERMS_VERSION,
    });
  }

  public async clearTermsAcceptance(): Promise<void> {
    await this.updateTermsAcceptanceSettings({
      termsAccepted: false,
      acceptedVersion: CURRENT_TERMS_VERSION,
    });
  }

  public async setLastCleanup(timestamp: string): Promise<void> {
    await this.updateSettings({ lastCleanup: timestamp });
  }

  public async setLastKeysRotation(timestamp: string | undefined): Promise<void> {
    await this.updateSettings({ lastKeysRotation: timestamp });
  }

  public shouldRunCleanup(): boolean {
    const lastCleanup = this.settingsSubject.value.lastCleanup;
    if (!lastCleanup) return true;

    const lastCleanupDate = new Date(lastCleanup);
    const now = new Date();
    const sixHoursInMs = 6 * 60 * 60 * 1000;

    return now.getTime() - lastCleanupDate.getTime() >= sixHoursInMs;
  }

  public shouldFilterNotification(notification: NotificationFragment, ignoreBucket?: boolean): boolean {
    const filters = this.settingsSubject.value.notificationVisualization;

    if (filters.hideRead && notification.readAt) {
      return false;
    }

    if (filters.timeRange !== 'all') {
      const now = new Date();
      const notificationDate = new Date(notification.createdAt);

      switch (filters.timeRange) {
        case 'today': {
          const oneDayAgo = subDays(now, 1);
          if (notificationDate < oneDayAgo) return false;
          break;
        }
        case 'thisWeek': {
          const sevenDaysAgo = subDays(now, 7);
          if (notificationDate < sevenDaysAgo) return false;
          break;
        }
        case 'thisMonth': {
          const thirtyDaysAgo = subDays(now, 30);
          if (notificationDate < thirtyDaysAgo) return false;
          break;
        }
        case 'custom': {
          if (filters.customTimeRange) {
            const fromDate = startOfDay(new Date(filters.customTimeRange.from));
            const toDate = startOfDay(new Date(filters.customTimeRange.to));
            toDate.setHours(23, 59, 59, 999);

            if (!isWithinInterval(notificationDate, { start: fromDate, end: toDate })) {
              return false;
            }
          }
          break;
        }
      }
    }

    if (!ignoreBucket && filters.selectedBucketIds.length > 0) {
      if (!filters.selectedBucketIds.some(bucketId => bucketId === notification.message.bucket.id)) {
        return false;
      }
    }

    if (filters.showOnlyWithAttachments) {
      if (!notification.message?.attachments || notification.message.attachments.length === 0) {
        return false;
      }
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        notification.message?.title,
        notification.message?.subtitle,
        notification.message?.body,
        notification.message?.bucket?.name,
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  }

  public getNotificationSortComparator() {
    const sortBy = this.settingsSubject.value.notificationVisualization.sortBy;

    return (a: any, b: any) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'priority':
          const priorityA = a.deliveryType === 'CRITICAL' ? 3 : a.deliveryType === 'NORMAL' ? 2 : 1;
          const priorityB = b.deliveryType === 'CRITICAL' ? 3 : b.deliveryType === 'NORMAL' ? 2 : 1;

          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }

          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    };
  }

  public async resetSettings(): Promise<void> {
    this.settingsSubject.next({ ...DEFAULT_SETTINGS });
    await this.saveSettings(DEFAULT_SETTINGS);
  }

  public async exportSettings(): Promise<string> {
    return JSON.stringify(this.settingsSubject.value, null, 2);
  }

  public async importSettings(settingsJson: string): Promise<void> {
    try {
      const imported = JSON.parse(settingsJson);
      const merged = this.deepMerge(DEFAULT_SETTINGS, imported);
      this.settingsSubject.next(merged);
      await this.saveSettings(merged);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings format');
    }
  }

  public async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    const current = this.authDataSubject.value;
    // Create a new object to ensure reactivity
    const updated = {
      ...current,
      accessToken,
      refreshToken,
    };
    this.authDataSubject.next(updated);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const options: Keychain.SetOptions = Device.isDevice
        ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
        : { service: SERVICE, accessible: ACCESSIBLE };

      await Keychain.setGenericPassword(accessToken, refreshToken, options);
    } else {
      await AsyncStorage.multiSet([
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
      ]);
      // console.log('[SettingsService] ✅ Tokens saved to AsyncStorage');
    }
  }

  public async clearTokens(): Promise<void> {
    const current = this.authDataSubject.value;
    current.accessToken = null;
    current.refreshToken = null;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const options: Keychain.SetOptions = Device.isDevice
        ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: SERVICE };
      await Keychain.resetGenericPassword(options);
    } else {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
  }

  public async saveDeviceId(deviceId: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.deviceId = deviceId;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_deviceId', deviceId);
  }

  public async saveBadgeCount(count: number): Promise<void> {
    const current = this.authDataSubject.value;
    current.badgeCount = count;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_badgeCount', count.toString());
  }

  public async saveApiEndpoint(endpoint: string): Promise<void> {
    const current = this.authDataSubject.value;

    // Validate endpoint - never allow empty, use default instead
    const trimmedEndpoint = endpoint?.trim() || '';
    const finalEndpoint = trimmedEndpoint !== '' ? trimmedEndpoint : DEFAULT_API_URL;

    if (trimmedEndpoint === '') {
      console.warn('[SettingsService] ⚠️ Empty API endpoint provided, using default:', DEFAULT_API_URL);
    }

    current.apiEndpoint = finalEndpoint;
    this.authDataSubject.next(current);

    await settingsRepository.setSetting('auth_apiEndpoint', finalEndpoint);
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('api', finalEndpoint, options);
      } catch (e) {
        console.warn('[SettingsService] Failed to save API endpoint to Keychain for extension:', e);
      }
    }
    console.log('[SettingsService] 🌐 API endpoint saved:', finalEndpoint);
  }

  public async resetApiEndpoint(): Promise<void> {
    console.log('[SettingsService] 🔄 Resetting API endpoint to default:', DEFAULT_API_URL);
    await this.saveApiEndpoint(DEFAULT_API_URL);
  }

  public async saveDeviceToken(deviceToken: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.deviceToken = deviceToken;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_deviceToken', deviceToken);
  }

  public async saveLastUserId(userId: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.lastUserId = userId;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_lastUserId', userId);
  }

  public async savePrivateKey(privateKey: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.privateKey = privateKey;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PRIVATE_KEY_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('private', privateKey, options);
      } catch (error) {
        console.error('Failed to save private key to keychain:', error);
        throw error;
      }
    }
  }

  public async savePushNotificationsInitialized(initialized: boolean): Promise<void> {
    const current = this.authDataSubject.value;
    current.pushNotificationsInitialized = initialized;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_pushNotificationsInitialized', initialized.toString());
  }

  public async savePendingNavigationIntent(intent: any): Promise<void> {
    const current = this.authDataSubject.value;
    current.pendingNavigationIntent = intent;
    this.authDataSubject.next(current);
    await settingsRepository.setSetting('auth_pendingNavigationIntent', JSON.stringify(intent));
  }

  public async clearPendingNavigationIntent(): Promise<void> {
    const current = this.authDataSubject.value;
    current.pendingNavigationIntent = null;
    this.authDataSubject.next(current);
    await settingsRepository.removeSetting('auth_pendingNavigationIntent');
  }

  public async clearBadgeCount(): Promise<void> {
    const current = this.authDataSubject.value;
    current.badgeCount = 0;
    this.authDataSubject.next(current);
    await settingsRepository.removeSetting('auth_badgeCount');
  }

  public async clearApiEndpoint(): Promise<void> {
    console.log('[SettingsService] 🔄 Clearing API endpoint (resetting to default)');
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: API_ENDPOINT_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
    }
    await this.resetApiEndpoint();
  }

  // API URL Helper Methods (replaces ApiConfigService)
  public getApiUrl(): string {
    const customUrl = this.authDataSubject.value.apiEndpoint;

    // If custom URL is set and not empty, use it
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim();
    }

    // Otherwise use the default from environment
    return DEFAULT_API_URL;
  }

  public getApiBaseWithPrefix(): string {
    const base = this.getApiUrl().replace(/\/$/, '');
    const prefix = API_PREFIX.replace(/^\/+|\/+$/g, '');
    return `${base}/${prefix}`;
  }

  public hasCustomApiUrl(): boolean {
    const customUrl = this.authDataSubject.value.apiEndpoint;
    return customUrl !== null && customUrl.trim() !== '';
  }

  public getCustomApiUrl(): string {
    return this.authDataSubject.value.apiEndpoint || '';
  }

  public async hasKeyPair(): Promise<boolean> {
    const authData = this.authDataSubject.value;
    return !!authData.privateKey;
  }

  public async clearKeyPair(): Promise<void> {
    const current = this.authDataSubject.value;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const privateKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PRIVATE_KEY_SERVICE };
      try {
        await Keychain.resetGenericPassword(privateKeyOptions);
      } catch { }
    }
  }

  public async clearAllAuthData(): Promise<void> {
    this.authDataSubject.next({ ...DEFAULT_AUTH_DATA });

    await Promise.all([
      this.clearTokens(),
      this.clearDeviceTokens(),
      settingsRepository.removeSetting('auth_lastUserId'),
      settingsRepository.removeSetting('auth_pushNotificationsInitialized'),
      settingsRepository.removeSetting('auth_pendingNavigationIntent'), // Clear from DB directly
      this.clearTermsAcceptance()
    ]);
  }

  private async clearDeviceTokens(): Promise<void> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const privateKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PRIVATE_KEY_SERVICE };
      await Keychain.resetGenericPassword(privateKeyOptions);
    }
    await Promise.all([
      settingsRepository.removeSetting('auth_deviceToken'),
      settingsRepository.removeSetting('auth_deviceId'),
    ]);
  }

  /**
   * Save only specific keys to storage (for granular updates)
   */
  private async savePartialSettings(keys: (keyof UserSettings)[], settings: UserSettings): Promise<void> {
    try {
      // Settings that are stored as plain strings (not JSON)
      const stringKeys = new Set<keyof UserSettings>([
        'locale',
        'timezone',
        'notificationsLastSeenId',
        'lastCleanup',
        'lastKeysRotation',
        'hideHints',
        'disableUserTracking',
        'lastSeenChangelogId',
      ]);

      await Promise.all(
        keys.map(async (key) => {
          try {
            const value = settings[key];
            if (value !== undefined) {
              // Save string settings directly, JSON settings as stringified JSON
              const valueToSave = stringKeys.has(key)
                ? String(value)
                : JSON.stringify(value);
              await settingsRepository.setSetting(key, valueToSave);
            } else {
              await settingsRepository.removeSetting(key);
            }
          } catch (error) {
            console.error(`Failed to save setting ${key}:`, error);
          }
        })
      );
    } catch (error) {
      console.error('Failed to save partial settings:', error);
      throw error;
    }
  }

  /**
   * Save all settings to storage (used for reset/import operations)
   */
  private async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const keys: (keyof UserSettings)[] = [
        'theme',
        'locale',
        'timezone',
        'dateFormat',
        'retentionPolicies',
        'downloadSettings',
        'notificationsLastSeenId',
        'notificationVisualization',
        'notificationsPreferences',
        'githubEventsFilter',
        'galleryVisualization',
        'onboarding',
        'termsAcceptance',
        'lastCleanup',
        'lastKeysRotation',
        'hideHints',
        'disableUserTracking',
        'lastSeenChangelogId',
        'bucketSharingHints',
      ];

      await this.savePartialSettings(keys, settings);
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  private deepMerge<T extends Record<string, any>>(defaults: T, overrides: Partial<T>): T {
    const result: any = { ...defaults };

    for (const key in overrides) {
      const override = overrides[key];
      const defaultValue = defaults[key];

      if (override === undefined || override === null) {
        continue;
      }

      if (
        typeof override === 'object' &&
        !Array.isArray(override) &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        defaultValue !== null
      ) {
        result[key] = this.deepMerge(defaultValue as any, override as any);
      } else {
        result[key] = override;
      }
    }

    return result as T;
  }

  public async getAccessTokenFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        return creds ? creds.username : null;
      } catch (error) {
        console.error('[SettingsService] ❌ Error reading accessToken from Keychain:', error);
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('access_token');
      } catch (error) {
        console.error('[SettingsService] ❌ Error reading accessToken from AsyncStorage:', error);
        return null;
      }
    }
  }

  private async getRefreshTokenFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        return creds ? creds.password : null;
      } catch (error) {
        console.error('[SettingsService] ❌ Error reading refreshToken from Keychain:', error);
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('refresh_token');
      } catch (error) {
        console.error('[SettingsService] ❌ Error reading refreshToken from AsyncStorage:', error);
        return null;
      }
    }
  }

  private async getPrivateKeyFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PRIVATE_KEY_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        return creds ? creds.password : null;
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  private async getApiEndpointFromKeychain(): Promise<string | null> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'macos') return null;
    try {
      const options: Keychain.GetOptions = Device.isDevice
        ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: API_ENDPOINT_SERVICE };
      const creds = await Keychain.getGenericPassword(options);
      const endpoint = creds && typeof creds === 'object' ? creds.password?.trim() : null;
      return endpoint || null;
    } catch {
      return null;
    }
  }

  // Getter methods for new structure
  public getThemeMode(): 'light' | 'dark' | 'system' {
    return this.settingsSubject.value.theme.themeMode;
  }

  public getLayoutMode(): LayoutMode {
    return this.settingsSubject.value.theme.layoutMode;
  }

  public getCustomThemeSettings(): {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
  } {
    const { themePreset, useDynamicTheme, dynamicThemeColors } = this.settingsSubject.value.theme;
    return { themePreset, useDynamicTheme, dynamicThemeColors };
  }

  public getNotificationVisualization(): NotificationVisualization {
    return this.settingsSubject.value.notificationVisualization;
  }

  public getIsCompactMode(): boolean {
    return this.settingsSubject.value.notificationVisualization.isCompactMode;
  }

  public getMaxCachedNotifications(): number | undefined {
    return this.settingsSubject.value.retentionPolicies.maxCachedNotifications;
  }

  public getMaxCachedNotificationsDay(): number | undefined {
    return this.settingsSubject.value.retentionPolicies.maxCachedNotificationsDay;
  }

  public getRetentionPolicies(): RetentionPolicies {
    return this.settingsSubject.value.retentionPolicies;
  }

  public getDownloadSettings(): DownloadSettings {
    return this.settingsSubject.value.downloadSettings;
  }

  public getGalleryVisualization(): GalleryVisualization {
    return this.settingsSubject.value.galleryVisualization;
  }

  public getBucketSharingHints(): string[] {
    return this.settingsSubject.value.bucketSharingHints ?? [];
  }

  public async addBucketSharingHint(identifier: string): Promise<void> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return;

    const currentHints = this.settingsSubject.value.bucketSharingHints ?? [];

    // Move existing hint to front, keep list unique and reasonably small
    const updatedHints = [
      trimmed,
      ...currentHints.filter((value) => value !== trimmed),
    ].slice(0, 10);

    await this.updateSettings({ bucketSharingHints: updatedHints });
  }

  // Legacy getter methods for backward compatibility
  public getNotificationFilters(): NotificationVisualization {
    return this.settingsSubject.value.notificationVisualization;
  }

  public getMediaCacheRetentionPolicies(): { maxCacheSizeMB?: number; maxCageAgeDays?: number } {
    return {
      maxCacheSizeMB: this.settingsSubject.value.retentionPolicies.maxCacheSizeMB,
      maxCageAgeDays: this.settingsSubject.value.retentionPolicies.maxCageAgeDays,
    };
  }

  public getMediaCacheDownloadSettings(): { autoDownloadEnabled: boolean; wifiOnlyDownload: boolean } {
    return this.settingsSubject.value.downloadSettings;
  }

  public getGallerySettings(): GalleryVisualization {
    return this.settingsSubject.value.galleryVisualization;
  }
}

export const settingsService = new SettingsService();
export { CURRENT_TERMS_VERSION };

