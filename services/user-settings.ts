import { MediaType, NotificationFragment, UserSettingType, useGetUserSettingsLazyQuery, useUpsertUserSettingMutation } from '@/generated/gql-operations-generated';
import AsyncStorage from '@/utils/async-storage-wrapper';
import React, { useEffect } from 'react';
import { ThemePreset } from './theme-presets';
import { startOfDay, subDays, isWithinInterval } from 'date-fns';
import { Locale } from '@/hooks/useI18n';
import { getStoredDeviceId } from './auth-storage';

// Current version of terms (update this when terms change)
const CURRENT_TERMS_VERSION = '1.0.0';

// Get device timezone with fallback
const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

// Utility: Default media types to show (all except Icon)
export const DEFAULT_MEDIA_TYPES = Object.values(MediaType).filter(
  (type) => type !== MediaType.Icon
);

export interface NotificationFilters {
  hideRead: boolean;
  timeRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  customTimeRange?: {
    from: string; // ISO date string
    to: string; // ISO date string
  };
  selectedBucketIds: string[];
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'priority';
  showOnlyWithAttachments: boolean;
  /** Load media only for items visible on screen (virtualized) */
  loadOnlyVisible: boolean;
}

export type DateFormatStyle = 'short' | 'medium' | 'long';

export interface DateFormatPreferences {
  dateStyle: DateFormatStyle;
  use24HourTime: boolean;
}

export type MarkAsReadMode = 'on-tap' | 'on-view' | 'on-app-close';
export type LayoutMode = 'auto' | 'desktop' | 'tablet' | 'mobile';

// Theme customization types
export interface DynamicThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

// Types for user settings
export interface UserSettings {
  // Theme settings
  themeMode: 'light' | 'dark' | 'system';
  layoutMode: LayoutMode;
  // Custom theme settings
  themePreset?: ThemePreset;
  // Dynamic theme settings
  useDynamicTheme?: boolean;
  dynamicThemeColors?: DynamicThemeColors;

  // Localization settings
  locale?: Locale;
  timezone: string;
  dateFormat: DateFormatPreferences;

  // UI settings
  isCompactMode: boolean;
  // GraphQL cache settings
  maxCachedNotifications?: number;
  /** Number of days to keep notifications in cache */
  maxCachedNotificationsDay?: number;

  // Media cache settings
  mediaCache: {
    retentionPolicies: {
      maxCacheSizeMB?: number;
      maxCageAgeDays?: number;
    };
    downloadSettings: {
      autoDownloadEnabled: boolean;
      wifiOnlyDownload: boolean;
    };
  };

  // Notification settings
  notificationsLastSeenId?: string;

  // Notification filters
  notificationFilters: NotificationFilters;

  notificationsPreferences?: {
    unencryptOnBigPayload?: boolean;
    markAsReadMode?: MarkAsReadMode;
    showAppIconOnBucketIconMissing?: boolean;
    // Auto-add notification actions when not explicitly set in payload
    autoAddDeleteAction?: boolean;
    autoAddMarkAsReadAction?: boolean;
    autoAddOpenNotificationAction?: boolean;
  };

  // Gallery settings
  gallery: {
    autoPlay: boolean;
    showFaultyMedias: boolean;
    /** Number of columns in gallery grid */
    gridSize: number;
    /** Selected media types to filter */
    selectedMediaTypes: MediaType[];
  };

  // Onboarding settings
  onboarding: {
    hasCompletedOnboarding: boolean;
    showOnboardingV2: boolean;
  };

  // Terms acceptance settings
  termsAcceptance: {
    termsAccepted: boolean;
    acceptedVersion: string;
  };

  // Maintenance settings
  lastCleanup?: string; // ISO timestamp of last cleanup
}

const DEFAULT_SETTINGS: UserSettings = {
  themeMode: 'system',
  layoutMode: 'auto',
  themePreset: ThemePreset.Material3,
  useDynamicTheme: false,
  dynamicThemeColors: {
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
  },
  locale: undefined,
  timezone: getDeviceTimezone(),
  dateFormat: {
    dateStyle: 'medium',
    use24HourTime: true,
  },
  isCompactMode: true,
  maxCachedNotifications: 1500,
  maxCachedNotificationsDay: 14,
  mediaCache: {
    retentionPolicies: {
      maxCacheSizeMB: undefined,
      maxCageAgeDays: 120,
    },
    downloadSettings: {
      autoDownloadEnabled: true,
      wifiOnlyDownload: false,
    },
  },
  notificationsLastSeenId: undefined,
  notificationFilters: {
    hideRead: false,
    timeRange: 'all',
    customTimeRange: undefined,
    selectedBucketIds: [],
    searchQuery: '',
    sortBy: 'newest',
    showOnlyWithAttachments: false,
    loadOnlyVisible: false,
  },
  notificationsPreferences: {
    unencryptOnBigPayload: false,
    markAsReadMode: 'on-view',
    showAppIconOnBucketIconMissing: false,
    autoAddDeleteAction: false,
    autoAddMarkAsReadAction: false,
    autoAddOpenNotificationAction: false,
  },
  gallery: {
    autoPlay: true,
    showFaultyMedias: false,
    gridSize: 3,
    selectedMediaTypes: DEFAULT_MEDIA_TYPES,
  },
  onboarding: {
    hasCompletedOnboarding: false,
    showOnboardingV2: true, // Show onboarding by default for new users
  },
  termsAcceptance: {
    termsAccepted: false,
    acceptedVersion: CURRENT_TERMS_VERSION,
  },
  lastCleanup: undefined,
};

const USER_SETTINGS_KEYS = '@zentik/user_settings';

class UserSettingsService {
  private settings: UserSettings = DEFAULT_SETTINGS;
  private listeners: Set<(settings: UserSettings) => void> = new Set();

  /**
   * Initialize settings by loading from storage
   */
  async initialize(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(USER_SETTINGS_KEYS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new settings are included
        this.settings = this.mergeWithDefaults(parsed);
      }


      return this.settings;
    } catch (error) {
      console.error('Failed to load user settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * Update specific setting section
   */
  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Update theme mode
   */
  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    await this.updateSettings({
      themeMode: mode,
    });
  }

  /**
   * Set custom theme settings
   */
  async setCustomThemeSettings(settings: {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
  }): Promise<void> {
    await this.updateSettings(settings);
  }

  /**
   * Get layout mode
   */
  getLayoutMode(): LayoutMode {
    return this.settings.layoutMode;
  }

  /**
   * Set layout mode
   */
  async setLayoutMode(mode: LayoutMode): Promise<void> {
    await this.updateSettings({ layoutMode: mode });
  }

  /**
   * Update locale
   */
  async setLocale(locale: Locale): Promise<void> {
    await this.updateSettings({ locale });
  }

  /**
   * Update notification filters
   */
  async setNotificationFilters(filters: Partial<UserSettings['notificationFilters']>): Promise<void> {
    await this.updateSettings({
      notificationFilters: {
        ...this.settings.notificationFilters,
        ...filters,
      },
    });
  }

  /**
   * Get timezone setting
   */
  getTimezone(): string {
    return this.settings.timezone;
  }

  /**
   * Set timezone setting
   */
  async setTimezone(timezone: string): Promise<void> {
    this.settings.timezone = timezone;
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Get date format preferences
   */
  getDateFormatPreferences(): DateFormatPreferences {
    return { ...this.settings.dateFormat };
  }

  /**
   * Set date format preferences
   */
  async setDateFormatPreferences(preferences: Partial<DateFormatPreferences>): Promise<void> {
    await this.updateSettings({
      dateFormat: {
        ...this.settings.dateFormat,
        ...preferences,
      },
    });
  }

  /**
   * Get max cached notifications setting
   */
  getMaxCachedNotifications(): number | undefined {
    return this.settings.maxCachedNotifications;
  }

  /**
   * Set max cached notifications setting
   */
  async setMaxCachedNotifications(max: number | undefined): Promise<void> {
    this.settings.maxCachedNotifications = max;
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Get max cached notifications days setting
   */
  getMaxCachedNotificationsDay(): number | undefined {
    return this.settings.maxCachedNotificationsDay;
  }

  /**
   * Set max cached notifications days setting
   */
  async setMaxCachedNotificationsDay(days: number | undefined): Promise<void> {
    this.settings.maxCachedNotificationsDay = days;
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Get compact mode setting
   */
  getIsCompactMode(): boolean {
    return this.settings.isCompactMode;
  }

  /**
   * Set compact mode setting
   */
  async setIsCompactMode(isCompact: boolean): Promise<void> {
    await this.updateSettings({
      isCompactMode: isCompact,
    });
  }

  /**
   * Get media cache retention policies
   */
  getMediaCacheRetentionPolicies(): { maxCacheSizeMB?: number; maxCageAgeDays?: number } {
    return { ...this.settings.mediaCache.retentionPolicies };
  }

  /**
   * Update media cache retention policies
   */
  async updateMediaCacheRetentionPolicies(policies: Partial<{ maxCacheSizeMB?: number; maxCageAgeDays?: number }>): Promise<void> {
    await this.updateSettings({
      mediaCache: {
        ...this.settings.mediaCache,
        retentionPolicies: {
          ...this.settings.mediaCache.retentionPolicies,
          ...policies,
        },
      },
    });
  }

  /**
   * Get media cache download settings
   */
  getMediaCacheDownloadSettings(): { autoDownloadEnabled: boolean; wifiOnlyDownload: boolean } {
    return { ...this.settings.mediaCache.downloadSettings };
  }

  /**
   * Update media cache download settings
   */
  async updateMediaCacheDownloadSettings(settings: Partial<{ autoDownloadEnabled: boolean; wifiOnlyDownload: boolean }>): Promise<void> {
    await this.updateSettings({
      mediaCache: {
        ...this.settings.mediaCache,
        downloadSettings: {
          ...this.settings.mediaCache.downloadSettings,
          ...settings,
        },
      },
    });
  }

  /**
   * Get notifications last seen ID
   */
  getNotificationsLastSeenId(): string | undefined {
    return this.settings.notificationsLastSeenId;
  }

  /**
   * Set notifications last seen ID
   */
  async setNotificationsLastSeenId(id: string | undefined): Promise<void> {
    await this.updateSettings({
      notificationsLastSeenId: id,
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Reset specific section to defaults
   */
  async resetSection(section: keyof UserSettings): Promise<void> {
    switch (section) {
      case 'themeMode':
        this.settings.themeMode = DEFAULT_SETTINGS.themeMode;
        break;
      case 'locale':
        this.settings.locale = DEFAULT_SETTINGS.locale;
        break;
      case 'notificationFilters':
        this.settings.notificationFilters = { ...DEFAULT_SETTINGS.notificationFilters };
        break;
    }
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get theme mode
   */
  getThemeMode(): 'light' | 'dark' | 'system' {
    return this.settings.themeMode;
  }

  /**
   * Get locale
   */
  getLocale(): Locale {
    return this.settings.locale ?? 'en-EN';
  }

  /**
   * Get notification filters
   */
  getNotificationFilters(): UserSettings['notificationFilters'] {
    return { ...this.settings.notificationFilters };
  }

  /**
   * Check if notifications should be filtered based on current settings
   */
  shouldFilterNotification(notification: NotificationFragment, ignoreBucket?: boolean): boolean {
    const filters = this.settings.notificationFilters;

    // Filter by read status
    if (filters.hideRead && notification.readAt) {
      return false;
    }

    // Filter by time range
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const notificationDate = new Date(notification.createdAt);

      switch (filters.timeRange) {
        case 'today': {
          // Last 24 hours (1 day)
          const oneDayAgo = subDays(now, 1);
          if (notificationDate < oneDayAgo) return false;
          break;
        }
        case 'thisWeek': {
          // Last 7 days (1 week)
          const sevenDaysAgo = subDays(now, 7);
          if (notificationDate < sevenDaysAgo) return false;
          break;
        }
        case 'thisMonth': {
          // Last 30 days (1 month)
          const thirtyDaysAgo = subDays(now, 30);
          if (notificationDate < thirtyDaysAgo) return false;
          break;
        }
        case 'custom': {
          if (filters.customTimeRange) {
            const fromDate = startOfDay(new Date(filters.customTimeRange.from));
            const toDate = startOfDay(new Date(filters.customTimeRange.to));
            // Set toDate to end of day
            toDate.setHours(23, 59, 59, 999);

            if (!isWithinInterval(notificationDate, { start: fromDate, end: toDate })) {
              return false;
            }
          }
          break;
        }
      }
    }

    // Filter by bucket
    if (!ignoreBucket && filters.selectedBucketIds.length > 0) {
      if (!filters.selectedBucketIds.some(bucketId => bucketId === notification.message.bucket.id)) {
        return false;
      }
    }

    // Filter by attachments
    if (filters.showOnlyWithAttachments) {
      if (!notification.message?.attachments || notification.message.attachments.length === 0) {
        return false;
      }
    }

    // Filter by search query
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

  /**
   * Get sort comparator based on current settings
   */
  getNotificationSortComparator() {
    const sortBy = this.settings.notificationFilters.sortBy;

    return (a: any, b: any) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'priority':
          // High priority first, then by newest
          const priorityA = a.deliveryType === 'CRITICAL' ? 3 : a.deliveryType === 'NORMAL' ? 2 : 1;
          const priorityB = b.deliveryType === 'CRITICAL' ? 3 : b.deliveryType === 'NORMAL' ? 2 : 1;

          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }

          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    };
  }

  /**
   * Private method to save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_SETTINGS_KEYS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Private method to merge stored settings with defaults
   */
  private mergeWithDefaults(stored: Partial<UserSettings>): UserSettings {
    let notificationFilters = { ...DEFAULT_SETTINGS.notificationFilters };
    if (stored.notificationFilters) {
      notificationFilters = {
        ...notificationFilters,
        ...stored.notificationFilters,
      };
    }

    return {
      themeMode: stored.themeMode || DEFAULT_SETTINGS.themeMode,
      layoutMode: stored.layoutMode || DEFAULT_SETTINGS.layoutMode,
      themePreset: stored.themePreset || DEFAULT_SETTINGS.themePreset,
      useDynamicTheme: stored.useDynamicTheme !== undefined ? stored.useDynamicTheme : DEFAULT_SETTINGS.useDynamicTheme,
      dynamicThemeColors: stored.dynamicThemeColors || DEFAULT_SETTINGS.dynamicThemeColors,
      locale: stored.locale || DEFAULT_SETTINGS.locale,
      timezone: stored.timezone || DEFAULT_SETTINGS.timezone,
      dateFormat: stored.dateFormat || DEFAULT_SETTINGS.dateFormat,
      isCompactMode: stored.isCompactMode !== undefined ? stored.isCompactMode : DEFAULT_SETTINGS.isCompactMode,
      maxCachedNotifications: typeof stored.maxCachedNotifications === 'number' ? stored.maxCachedNotifications : DEFAULT_SETTINGS.maxCachedNotifications,
      maxCachedNotificationsDay: typeof (stored as any).maxCachedNotificationsDay === 'number' ? (stored as any).maxCachedNotificationsDay : DEFAULT_SETTINGS.maxCachedNotificationsDay,
      mediaCache: {
        retentionPolicies: stored.mediaCache?.retentionPolicies || DEFAULT_SETTINGS.mediaCache.retentionPolicies,
        downloadSettings: stored.mediaCache?.downloadSettings || DEFAULT_SETTINGS.mediaCache.downloadSettings,
      },
      notificationsLastSeenId: stored.notificationsLastSeenId || DEFAULT_SETTINGS.notificationsLastSeenId,
      notificationFilters,
      notificationsPreferences: {
        unencryptOnBigPayload:
          stored.notificationsPreferences?.unencryptOnBigPayload ?? DEFAULT_SETTINGS.notificationsPreferences!.unencryptOnBigPayload,
        markAsReadMode:
          stored.notificationsPreferences?.markAsReadMode ?? DEFAULT_SETTINGS.notificationsPreferences!.markAsReadMode,
        showAppIconOnBucketIconMissing:
          stored.notificationsPreferences?.showAppIconOnBucketIconMissing ?? DEFAULT_SETTINGS.notificationsPreferences!.showAppIconOnBucketIconMissing,
      },
      gallery: {
        ...DEFAULT_SETTINGS.gallery,
        ...(stored.gallery || {}),
        gridSize: typeof stored.gallery?.gridSize === 'number'
          ? stored.gallery!.gridSize
          : DEFAULT_SETTINGS.gallery.gridSize,
      },
      onboarding: stored.onboarding || DEFAULT_SETTINGS.onboarding,
      termsAcceptance: stored.termsAcceptance || DEFAULT_SETTINGS.termsAcceptance,
      lastCleanup: stored.lastCleanup || DEFAULT_SETTINGS.lastCleanup,
    };
  }

  /**
   * Private method to notify listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSettings());
      } catch (error) {
        console.error('Error notifying settings listener:', error);
      }
    });
  }

  /**
   * Export settings for backup
   */
  async exportSettings(): Promise<string> {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Get gallery settings
   */
  getGallerySettings(): UserSettings['gallery'] {
    return { ...this.settings.gallery };
  }

  /**
   * Update gallery settings
   */
  async updateGallerySettings(updates: Partial<UserSettings['gallery']>): Promise<void> {
    this.settings.gallery = {
      ...this.settings.gallery,
      ...updates,
    };
    await this.saveSettings();
    this.notifyListeners();
  }

  /** Get current gallery grid size */
  getGalleryGridSize(): number {
    return this.settings.gallery.gridSize;
  }

  /** Set gallery grid size (min 1, max 8) */
  async setGalleryGridSize(size: number): Promise<void> {
    if (Number.isNaN(size)) return;
    const clamped = Math.min(8, Math.max(1, Math.floor(size)));
    await this.updateGallerySettings({ gridSize: clamped });
  }

  /**
   * Import settings from backup
   */
  async importSettings(settingsJson: string): Promise<void> {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = this.mergeWithDefaults(imported);
      await this.saveSettings();
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings format');
    }
  }

  /**
   * Get onboarding settings
   */
  getOnboardingSettings(): UserSettings['onboarding'] {
    return { ...this.settings.onboarding };
  }

  /**
   * Update onboarding settings
   */
  async updateOnboardingSettings(updates: Partial<UserSettings['onboarding']>): Promise<void> {
    this.settings.onboarding = {
      ...this.settings.onboarding,
      ...updates,
    };
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      hasCompletedOnboarding: true,
      showOnboardingV2: false,
    });
  }

  /**
   * Start onboarding
   */
  async startOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      showOnboardingV2: true,
    });
  }

  /**
   * Skip onboarding
   */
  async skipOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      showOnboardingV2: false,
    });
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      hasCompletedOnboarding: false,
      showOnboardingV2: false,
    });
  }

  /**
   * Get terms acceptance settings
   */
  getTermsAcceptanceSettings(): UserSettings['termsAcceptance'] {
    return { ...this.settings.termsAcceptance };
  }

  /**
   * Update terms acceptance settings
   */
  async updateTermsAcceptanceSettings(updates: Partial<UserSettings['termsAcceptance']>): Promise<void> {
    this.settings.termsAcceptance = {
      ...this.settings.termsAcceptance,
      ...updates,
    };
    await this.saveSettings();
    this.notifyListeners();
  }

  /**
   * Accept terms
   */
  async acceptTerms(): Promise<void> {
    await this.updateTermsAcceptanceSettings({
      termsAccepted: true,
      acceptedVersion: CURRENT_TERMS_VERSION,
    });
  }

  /**
   * Clear terms acceptance
   */
  async clearTermsAcceptance(): Promise<void> {
    await this.updateTermsAcceptanceSettings({
      termsAccepted: false,
      acceptedVersion: CURRENT_TERMS_VERSION,
    });
  }

  /**
   * Get last cleanup timestamp
   */
  getLastCleanup(): string | undefined {
    return this.settings.lastCleanup;
  }

  /**
   * Set last cleanup timestamp
   */
  async setLastCleanup(timestamp: string): Promise<void> {
    await this.updateSettings({
      lastCleanup: timestamp,
    });
  }

  /**
   * Check if cleanup should run (6 hours since last cleanup)
   */
  shouldRunCleanup(): boolean {
    if (!this.settings.lastCleanup) {
      return true;
    }

    const lastCleanup = new Date(this.settings.lastCleanup);
    const now = new Date();
    const sixHoursInMs = 6 * 60 * 60 * 1000;

    return now.getTime() - lastCleanup.getTime() >= sixHoursInMs;
  }
}

// Export singleton instance
export const userSettings = new UserSettingsService();

// Export hook for React components
export function useUserSettings() {
  const [settings, setSettings] = React.useState<UserSettings>(userSettings.getSettings());
  const [loadUserSettings, { data: remoteUserSettings }] = useGetUserSettingsLazyQuery({ fetchPolicy: 'network-only' });
  const [upsertUserSetting] = useUpsertUserSettingMutation();

  useEffect(() => {
    // Initialize settings
    userSettings.initialize().then(setSettings);

    // Subscribe to changes
    const unsubscribe = userSettings.subscribe(setSettings);

    return unsubscribe;
  }, []);

  // Fetch remote user settings lazily on mount
  React.useEffect(() => {
    loadUserSettings().catch(() => { });
  }, [loadUserSettings]);

  // Apply remote settings for timezone/language and notification prefs if available
  useEffect(() => {
    const list = remoteUserSettings?.userSettings ?? [];
    if (!list || list.length === 0) return;
    
    // Get current deviceId to filter device-specific settings
    getStoredDeviceId().then(currentDeviceId => {
      const timezoneSetting = list.find((s: any) => s?.configType === UserSettingType.Timezone);
      const languageSetting = list.find((s: any) => s?.configType === UserSettingType.Language);
      
      // Device-specific setting: prioritize device-specific over user-level
      const unencryptOnBigPayload = list.find((s: any) => 
        s?.configType === UserSettingType.UnencryptOnBigPayload && s?.deviceId === currentDeviceId
      ) || list.find((s: any) => 
        s?.configType === UserSettingType.UnencryptOnBigPayload && !s?.deviceId
      );
      
      // Device-specific settings: prioritize device-specific over user-level
      const autoAddDeleteAction = list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddDeleteAction && s?.deviceId === currentDeviceId
      ) || list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddDeleteAction && !s?.deviceId
      );
      
      const autoAddMarkAsReadAction = list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddMarkAsReadAction && s?.deviceId === currentDeviceId
      ) || list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddMarkAsReadAction && !s?.deviceId
      );
      
      const autoAddOpenNotificationAction = list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddOpenNotificationAction && s?.deviceId === currentDeviceId
      ) || list.find((s: any) => 
        s?.configType === UserSettingType.AutoAddOpenNotificationAction && !s?.deviceId
      );
    
    const updates: Partial<UserSettings> = {};
    if (timezoneSetting?.valueText && timezoneSetting.valueText !== userSettings.getTimezone()) {
      updates.timezone = timezoneSetting.valueText;
    }
    if (languageSetting?.valueText && languageSetting.valueText !== userSettings.getLocale()) {
      updates.locale = languageSetting.valueText as Locale;
    }
    const currentPrefs = userSettings.getSettings().notificationsPreferences;
    const nextPrefs = { ...(currentPrefs || {}) };
    let touchPrefs = false;
    
    if (unencryptOnBigPayload?.valueBool !== undefined && unencryptOnBigPayload.valueBool !== currentPrefs?.unencryptOnBigPayload) {
      nextPrefs.unencryptOnBigPayload = !!unencryptOnBigPayload.valueBool; 
      touchPrefs = true;
    }
    if (autoAddDeleteAction?.valueBool !== undefined && autoAddDeleteAction.valueBool !== currentPrefs?.autoAddDeleteAction) {
      nextPrefs.autoAddDeleteAction = !!autoAddDeleteAction.valueBool;
      touchPrefs = true;
    }
    if (autoAddMarkAsReadAction?.valueBool !== undefined && autoAddMarkAsReadAction.valueBool !== currentPrefs?.autoAddMarkAsReadAction) {
      nextPrefs.autoAddMarkAsReadAction = !!autoAddMarkAsReadAction.valueBool;
      touchPrefs = true;
    }
    if (autoAddOpenNotificationAction?.valueBool !== undefined && autoAddOpenNotificationAction.valueBool !== currentPrefs?.autoAddOpenNotificationAction) {
      nextPrefs.autoAddOpenNotificationAction = !!autoAddOpenNotificationAction.valueBool;
      touchPrefs = true;
    }
    if (touchPrefs) {
      updates.notificationsPreferences = nextPrefs;
    }
    if (Object.keys(updates).length > 0) {
      userSettings.updateSettings(updates).catch(() => { });
    }
    }).catch(() => { }); // Close getStoredDeviceId().then()
  }, [remoteUserSettings]);

  return {
    settings,
    updateSettings: userSettings.updateSettings.bind(userSettings),
    setThemeMode: userSettings.setThemeMode.bind(userSettings),
    getLayoutMode: userSettings.getLayoutMode.bind(userSettings),
    setLayoutMode: userSettings.setLayoutMode.bind(userSettings),
    setCustomThemeSettings: userSettings.setCustomThemeSettings.bind(userSettings),
    setLocale: async (locale: Locale) => {
      await userSettings.setLocale(locale);
      try {
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.Language, valueText: locale } } });
      } catch { }
    },
    getTimezone: userSettings.getTimezone.bind(userSettings),
    setTimezone: async (tz: string) => {
      await userSettings.setTimezone(tz);
      try {
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.Timezone, valueText: tz } } });
      } catch { }
    },
    getDateFormatPreferences: userSettings.getDateFormatPreferences.bind(userSettings),
    setDateFormatPreferences: userSettings.setDateFormatPreferences.bind(userSettings),
    getIsCompactMode: userSettings.getIsCompactMode.bind(userSettings),
    setIsCompactMode: userSettings.setIsCompactMode.bind(userSettings),
    setNotificationFilters: userSettings.setNotificationFilters.bind(userSettings),
    setMaxCachedNotifications: userSettings.setMaxCachedNotifications.bind(userSettings),
    setMaxCachedNotificationsDay: userSettings.setMaxCachedNotificationsDay.bind(userSettings),
    setMarkAsReadMode: async (mode: MarkAsReadMode) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), markAsReadMode: mode } });
    },
    setUnencryptOnBigPayload: async (v: boolean) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), unencryptOnBigPayload: v } });
      try { 
        const deviceId = await getStoredDeviceId();
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.UnencryptOnBigPayload, valueBool: v, deviceId } } }); 
      } catch { }
    },
    setShowAppIconOnBucketIconMissing: async (v: boolean) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), showAppIconOnBucketIconMissing: v } });
      try { const { saveNseShowAppIconOnBucketIconMissing } = await import('./auth-storage'); await saveNseShowAppIconOnBucketIconMissing(v); } catch { }
    },
    setAutoAddDeleteAction: async (v: boolean) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), autoAddDeleteAction: v } });
      try { 
        const deviceId = await getStoredDeviceId();
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.AutoAddDeleteAction, valueBool: v, deviceId } } }); 
      } catch { }
    },
    setAutoAddMarkAsReadAction: async (v: boolean) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), autoAddMarkAsReadAction: v } });
      try { 
        const deviceId = await getStoredDeviceId();
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.AutoAddMarkAsReadAction, valueBool: v, deviceId } } }); 
      } catch { }
    },
    setAutoAddOpenNotificationAction: async (v: boolean) => {
      await userSettings.updateSettings({ notificationsPreferences: { ...(userSettings.getSettings().notificationsPreferences!), autoAddOpenNotificationAction: v } });
      try { 
        const deviceId = await getStoredDeviceId();
        await upsertUserSetting({ variables: { input: { configType: UserSettingType.AutoAddOpenNotificationAction, valueBool: v, deviceId } } }); 
      } catch { }
    },
    resetSettings: userSettings.resetSettings.bind(userSettings),
    resetSection: userSettings.resetSection.bind(userSettings),
    exportSettings: userSettings.exportSettings.bind(userSettings),
    importSettings: userSettings.importSettings.bind(userSettings),
    // Media cache settings
    getMediaCacheRetentionPolicies: userSettings.getMediaCacheRetentionPolicies.bind(userSettings),
    updateMediaCacheRetentionPolicies: userSettings.updateMediaCacheRetentionPolicies.bind(userSettings),
    getMediaCacheDownloadSettings: userSettings.getMediaCacheDownloadSettings.bind(userSettings),
    updateMediaCacheDownloadSettings: userSettings.updateMediaCacheDownloadSettings.bind(userSettings),
    getNotificationsLastSeenId: userSettings.getNotificationsLastSeenId.bind(userSettings),
    setNotificationsLastSeenId: userSettings.setNotificationsLastSeenId.bind(userSettings),
    // Gallery settings
    getGallerySettings: userSettings.getGallerySettings.bind(userSettings),
    updateGallerySettings: userSettings.updateGallerySettings.bind(userSettings),
    getGalleryGridSize: userSettings.getGalleryGridSize.bind(userSettings),
    setGalleryGridSize: userSettings.setGalleryGridSize.bind(userSettings),
    // Onboarding settings
    getOnboardingSettings: userSettings.getOnboardingSettings.bind(userSettings),
    updateOnboardingSettings: userSettings.updateOnboardingSettings.bind(userSettings),
    completeOnboarding: userSettings.completeOnboarding.bind(userSettings),
    startOnboarding: userSettings.startOnboarding.bind(userSettings),
    skipOnboarding: userSettings.skipOnboarding.bind(userSettings),
    resetOnboarding: userSettings.resetOnboarding.bind(userSettings),
    // Terms acceptance settings
    getTermsAcceptanceSettings: userSettings.getTermsAcceptanceSettings.bind(userSettings),
    updateTermsAcceptanceSettings: userSettings.updateTermsAcceptanceSettings.bind(userSettings),
    acceptTerms: userSettings.acceptTerms.bind(userSettings),
    clearTermsAcceptance: userSettings.clearTermsAcceptance.bind(userSettings),
    // Cleanup settings
    getLastCleanup: userSettings.getLastCleanup.bind(userSettings),
    setLastCleanup: userSettings.setLastCleanup.bind(userSettings),
    shouldRunCleanup: userSettings.shouldRunCleanup.bind(userSettings),
  };
}
