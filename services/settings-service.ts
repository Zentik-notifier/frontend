import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { MediaType, UserSettingType, NotificationFragment } from '@/generated/gql-operations-generated';
import { ThemePreset } from './theme-presets';
import { startOfDay, subDays, isWithinInterval } from 'date-fns';
import { Locale } from '@/hooks/useI18n';
import * as Keychain from 'react-native-keychain';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { settingsRepository } from './settings-repository';
import AsyncStorage from '@/utils/async-storage-wrapper';

const CURRENT_TERMS_VERSION = '1.0.0';

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
    termsAccepted: boolean;
    acceptedVersion: string;
  };
  lastCleanup?: string;
}

export interface AuthData {
  accessToken: string | null;
  refreshToken: string | null;
  deviceToken: string | null;
  deviceId: string | null;
  lastUserId: string | null;
  publicKey: string | null;
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
    termsAccepted: false,
    acceptedVersion: CURRENT_TERMS_VERSION,
  },
  lastCleanup: undefined,
};

const DEFAULT_AUTH_DATA: AuthData = {
  accessToken: null,
  refreshToken: null,
  deviceToken: null,
  deviceId: null,
  lastUserId: null,
  publicKey: null,
  privateKey: null,
  pushNotificationsInitialized: false,
  pendingNavigationIntent: null,
  badgeCount: 0,
  apiEndpoint: null,
};

const SERVICE = 'zentik-auth';
const PUBLIC_KEY_SERVICE = 'zentik-public-key';
const PRIVATE_KEY_SERVICE = 'zentik-private-key';
const PENDING_NAVIGATION_SERVICE = 'zentik-pending-navigation';
const BADGE_COUNT_SERVICE = 'zentik-badge-count';
const API_ENDPOINT_SERVICE = 'zentik-api-endpoint';
const LOCALE_SERVICE = 'zentik-locale';

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
      const stored = await settingsRepository.getSetting('user_settings');

      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = this.deepMerge(DEFAULT_SETTINGS, parsed);
        
        try {
          const storedLocale = await this.getLocaleFromKeychain();
          if (storedLocale) {
            merged.locale = storedLocale as Locale;
          }
        } catch (error) {
          console.error('Failed to load locale from keychain:', error);
        }
        
        this.settingsSubject.next(merged);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }

  private async loadAuthData(): Promise<void> {
    try {
      const [
        accessToken,
        refreshToken,
        deviceToken,
        deviceId,
        lastUserId,
        publicKey,
        privateKey,
        pushNotificationsInitialized,
        pendingNavigationIntent,
        badgeCount,
        apiEndpoint
      ] = await Promise.all([
        this.getAccessTokenFromStorage(),
        this.getRefreshTokenFromStorage(),
        AsyncStorage.getItem('device_token'),
        AsyncStorage.getItem('device_id'),
        AsyncStorage.getItem('last_user_id'),
        this.getPublicKeyFromStorage(),
        this.getPrivateKeyFromStorage(),
        this.getPushInitializedFromStorage(),
        this.getPendingNavigationFromStorage(),
        this.getBadgeCountFromStorage(),
        this.getApiEndpointFromStorage()
      ]);

      this.authDataSubject.next({
        accessToken,
        refreshToken,
        deviceToken,
        deviceId,
        lastUserId,
        publicKey,
        privateKey,
        pushNotificationsInitialized,
        pendingNavigationIntent,
        badgeCount,
        apiEndpoint
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
    await this.saveSettings(newSettings);
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
  }): Promise<void> {
    const current = this.settingsSubject.value;
    await this.updateSettings({
      theme: {
        ...current.theme,
        ...settings,
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
    current.locale = locale as Locale;
    this.settingsSubject.next(current);
    
    await Promise.all([
      this.saveSettings(current),
      this.saveLocaleToKeychain(locale)
    ]);
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
    current.accessToken = accessToken;
    current.refreshToken = refreshToken;
    this.authDataSubject.next(current);

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
    await AsyncStorage.setItem('device_id', deviceId);
  }

  public async saveBadgeCount(count: number): Promise<void> {
    const current = this.authDataSubject.value;
    current.badgeCount = count;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: BADGE_COUNT_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('badge', count.toString(), options);
      } catch (error) {
        console.error('Failed to save badge count to keychain:', error);
        await AsyncStorage.setItem('badge_count', count.toString());
      }
    } else {
      await AsyncStorage.setItem('badge_count', count.toString());
    }
  }

  public async saveApiEndpoint(endpoint: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.apiEndpoint = endpoint;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('endpoint', endpoint, options);
      } catch (error) {
        console.error('Failed to save API endpoint to keychain:', error);
        await AsyncStorage.setItem('api_endpoint', endpoint);
      }
    } else {
      await AsyncStorage.setItem('api_endpoint', endpoint);
    }
  }

  public async saveDeviceToken(deviceToken: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.deviceToken = deviceToken;
    this.authDataSubject.next(current);
    await AsyncStorage.setItem('device_token', deviceToken);
  }

  public async saveLastUserId(userId: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.lastUserId = userId;
    this.authDataSubject.next(current);
    await AsyncStorage.setItem('last_user_id', userId);
  }

  public async savePublicKey(publicKey: string): Promise<void> {
    const current = this.authDataSubject.value;
    current.publicKey = publicKey;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PUBLIC_KEY_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('public', publicKey, options);
      } catch (error) {
        console.error('Failed to save public key to keychain:', error);
        await AsyncStorage.setItem('public_key', publicKey);
      }
    } else {
      await AsyncStorage.setItem('public_key', publicKey);
    }
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
        await AsyncStorage.setItem('private_key', privateKey);
      }
    } else {
      await AsyncStorage.setItem('private_key', privateKey);
    }
  }

  public async savePushNotificationsInitialized(initialized: boolean): Promise<void> {
    const current = this.authDataSubject.value;
    current.pushNotificationsInitialized = initialized;
    this.authDataSubject.next(current);
    await AsyncStorage.setItem('push_notifications_initialized', initialized.toString());
  }

  public async savePendingNavigationIntent(intent: any): Promise<void> {
    const current = this.authDataSubject.value;
    current.pendingNavigationIntent = intent;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PENDING_NAVIGATION_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('navigation', JSON.stringify(intent), options);
      } catch (error) {
        console.error('Failed to save pending navigation intent to keychain:', error);
        await AsyncStorage.setItem('pending_navigation_intent', JSON.stringify(intent));
      }
    } else {
      await AsyncStorage.setItem('pending_navigation_intent', JSON.stringify(intent));
    }
  }

  public async clearPendingNavigationIntent(): Promise<void> {
    const current = this.authDataSubject.value;
    current.pendingNavigationIntent = null;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_NAVIGATION_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
    }
    try {
      await AsyncStorage.removeItem('pending_navigation_intent');
    } catch { }
  }

  public async clearBadgeCount(): Promise<void> {
    const current = this.authDataSubject.value;
    current.badgeCount = 0;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: BADGE_COUNT_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
    }
    try {
      await AsyncStorage.removeItem('badge_count');
    } catch { }
  }

  public async clearApiEndpoint(): Promise<void> {
    const current = this.authDataSubject.value;
    current.apiEndpoint = null;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: API_ENDPOINT_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
    }
    try {
      await AsyncStorage.removeItem('api_endpoint');
    } catch { }
  }

  public async hasKeyPair(): Promise<boolean> {
    const authData = this.authDataSubject.value;
    return !!(authData.publicKey && authData.privateKey);
  }

  public async clearKeyPair(): Promise<void> {
    const current = this.authDataSubject.value;
    current.publicKey = null;
    current.privateKey = null;
    this.authDataSubject.next(current);

    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const publicKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PUBLIC_KEY_SERVICE };
      const privateKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PRIVATE_KEY_SERVICE };
      try {
        await Keychain.resetGenericPassword(publicKeyOptions);
      } catch { }
      try {
        await Keychain.resetGenericPassword(privateKeyOptions);
      } catch { }
    }
    try {
      await AsyncStorage.removeItem('public_key');
    } catch { }
    try {
      await AsyncStorage.removeItem('private_key');
    } catch { }
  }

  public async clearAllAuthData(): Promise<void> {
    this.authDataSubject.next({ ...DEFAULT_AUTH_DATA });
    
    await Promise.all([
      this.clearTokens(),
      this.clearDeviceTokens(),
      AsyncStorage.removeItem('last_user_id'),
      AsyncStorage.removeItem('push_notifications_initialized'),
      this.clearPendingNavigationIntent(),
      this.clearTermsAcceptance()
    ]);
  }

  private async clearDeviceTokens(): Promise<void> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      const publicKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PUBLIC_KEY_SERVICE };
      const privateKeyOptions: Keychain.SetOptions = Device.isDevice
        ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
        : { service: PRIVATE_KEY_SERVICE };
      await Keychain.resetGenericPassword(publicKeyOptions);
      await Keychain.resetGenericPassword(privateKeyOptions);
    }
    await AsyncStorage.multiRemove(['device_token', 'device_id', 'public_key', 'private_key']);
  }

  private async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await settingsRepository.setSetting('user_settings', JSON.stringify(settings));
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

  private async getAccessTokenFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        return creds ? creds.username : null;
      } catch {
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('access_token');
      } catch {
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
      } catch {
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('refresh_token');
      } catch {
        return null;
      }
    }
  }

  private async getPublicKeyFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PUBLIC_KEY_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) return creds.password;
        return await AsyncStorage.getItem('public_key');
      } catch {
        return await AsyncStorage.getItem('public_key');
      }
    } else {
      try {
        return await AsyncStorage.getItem('public_key');
      } catch {
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
        if (creds) return creds.password;
        return await AsyncStorage.getItem('private_key');
      } catch {
        return await AsyncStorage.getItem('private_key');
      }
    } else {
      try {
        return await AsyncStorage.getItem('private_key');
      } catch {
        return null;
      }
    }
  }

  private async getPushInitializedFromStorage(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem('push_notifications_initialized');
      return value === 'true';
    } catch {
      return false;
    }
  }

  private async getPendingNavigationFromStorage(): Promise<any | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_NAVIGATION_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) return JSON.parse(creds.password);
        const fallback = await AsyncStorage.getItem('pending_navigation_intent');
        return fallback ? JSON.parse(fallback) : null;
      } catch {
        return null;
      }
    } else {
      try {
        const value = await AsyncStorage.getItem('pending_navigation_intent');
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    }
  }

  private async getBadgeCountFromStorage(): Promise<number> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: BADGE_COUNT_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) return parseInt(creds.password, 10) || 0;
        const fallback = await AsyncStorage.getItem('badge_count');
        return fallback ? parseInt(fallback, 10) : 0;
      } catch {
        return 0;
      }
    } else {
      try {
        const value = await AsyncStorage.getItem('badge_count');
        return value ? parseInt(value, 10) : 0;
      } catch {
        return 0;
      }
    }
  }

  private async getApiEndpointFromStorage(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: API_ENDPOINT_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) return creds.password;
        return await AsyncStorage.getItem('api_endpoint');
      } catch {
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('api_endpoint');
      } catch {
        return null;
      }
    }
  }

  private async saveLocaleToKeychain(locale: string): Promise<void> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: LOCALE_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: LOCALE_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('locale', locale, options);
      } catch (error) {
        console.error('Failed to save locale to keychain:', error);
        await AsyncStorage.setItem('locale', locale);
      }
    } else {
      await AsyncStorage.setItem('locale', locale);
    }
  }

  private async getLocaleFromKeychain(): Promise<string | null> {
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: LOCALE_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: LOCALE_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) return creds.password;
        return await AsyncStorage.getItem('locale');
      } catch {
        return null;
      }
    } else {
      try {
        return await AsyncStorage.getItem('locale');
      } catch {
        return null;
      }
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

