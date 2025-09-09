import { NotificationFragment } from '@/generated/gql-operations-generated';
import { Locale } from '@/types/i18n';
import AsyncStorage from 'expo-sqlite/kv-store';
import * as Localization from 'expo-localization';
import React from 'react';

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

// Get device locale with fallback to English
const getDeviceLocale = (): Locale => {
  try {
    const deviceLocale = Localization.getLocales()[0].languageTag;
    console.log('🌍 Detected device locale:', deviceLocale);
    // Map common device locales to our supported locales
    if (deviceLocale.startsWith('it')) {
      return 'it-IT';
    } else if (deviceLocale.startsWith('en')) {
      return 'en-EN';
    }
    // Default to English for unsupported locales
    return 'en-EN';
  } catch {
    return 'en-EN';
  }
};

export interface NotificationFilters {
  hideRead: boolean;
  hideOlderThan: 'none' | '1day' | '1week' | '1month';
  selectedBucketIds: string[];
  searchQuery: string;
  sortBy: 'newest' | 'oldest' | 'priority';
  showOnlyWithAttachments: boolean;
}

export type DateFormatStyle = 'short' | 'medium' | 'long';

export interface DateFormatPreferences {
  dateStyle: DateFormatStyle;
  use24HourTime: boolean;
}

// Types for user settings
export interface UserSettings {
  // Theme settings
  themeMode: 'light' | 'dark' | 'system';

  // Localization settings
  locale: Locale;
  timezone: string;
  dateFormat: DateFormatPreferences;

  // UI settings
  isCompactMode: boolean;
  // GraphQL cache settings
  maxCachedNotifications?: number;

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

  // Gallery settings
  gallery: {
    autoPlay: boolean;
    showFaultyMedias: boolean;
  };

  // Onboarding settings
  onboarding: {
    hasCompletedOnboarding: boolean;
    showOnboarding: boolean;
  };

  // Terms acceptance settings
  termsAcceptance: {
    termsAccepted: boolean;
    acceptedVersion: string;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  themeMode: 'system',
  locale: 'en-EN',
  timezone: getDeviceTimezone(),
  dateFormat: {
    dateStyle: 'medium',
    use24HourTime: true,
  },
  isCompactMode: true,
  maxCachedNotifications: 1500,
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
    hideOlderThan: 'none',
    selectedBucketIds: [],
    searchQuery: '',
    sortBy: 'newest',
    showOnlyWithAttachments: false,
  },
  gallery: {
    autoPlay: true,
    showFaultyMedias: false,
  },
  onboarding: {
    hasCompletedOnboarding: false,
    showOnboarding: false,
  },
  termsAcceptance: {
    termsAccepted: false,
    acceptedVersion: CURRENT_TERMS_VERSION,
  },
};

// Storage keys
const STORAGE_KEYS = {
  USER_SETTINGS: '@zentik/user_settings',
  THEME_MODE: '@zentik/theme_mode',
  NOTIFICATION_FILTERS: '@zentik/notification_filters',
  // Media cache settings keys - same pattern as other settings
  MEDIA_CACHE_RETENTION_POLICIES: '@zentik/media_cache_retention_policies',
  MEDIA_CACHE_DOWNLOAD_SETTINGS: '@zentik/media_cache_download_settings',
  // Notification settings
  NOTIFICATIONS_LAST_SEEN_ID: '@notifications_last_seen_id',
  // Onboarding settings
  ONBOARDING_COMPLETED: '@zentik/onboarding_completed',
  // Terms acceptance settings
  TERMS_ACCEPTED: '@zentik/terms_accepted',
  TERMS_VERSION: '@zentik/terms_version',
};

class UserSettingsService {
  private settings: UserSettings = DEFAULT_SETTINGS;
  private listeners: Set<(settings: UserSettings) => void> = new Set();

  /**
   * Initialize settings by loading from storage
   */
  async initialize(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new settings are included
        this.settings = this.mergeWithDefaults(parsed);
      }

      // Check if locale is set, if not detect device locale
      if (!this.settings.locale) {
        const deviceLocale = getDeviceLocale();
        if (deviceLocale !== this.settings.locale) {
          this.settings.locale = deviceLocale;
          console.log(`🌍 Detected device locale: ${deviceLocale}`);
          // Save the detected locale
          await this.saveSettings();
        }
      }

      // Also check for legacy theme setting
      const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (theme && !stored) {
        this.settings.themeMode = theme as 'light' | 'dark' | 'system';
        await this.saveSettings();
      }

      // Check for legacy media cache retention policies
      const retentionPolicies = await AsyncStorage.getItem(STORAGE_KEYS.MEDIA_CACHE_RETENTION_POLICIES);
      if (retentionPolicies && !stored) {
        try {
          const parsedPolicies = JSON.parse(retentionPolicies);
          this.settings.mediaCache.retentionPolicies = {
            ...this.settings.mediaCache.retentionPolicies,
            ...parsedPolicies,
          };
          await this.saveSettings();
        } catch (error) {
          console.error('Failed to parse retention policies:', error);
        }
      }

      // Check for legacy media cache download settings
      const downloadSettings = await AsyncStorage.getItem(STORAGE_KEYS.MEDIA_CACHE_DOWNLOAD_SETTINGS);
      if (downloadSettings && !stored) {
        try {
          const parsedSettings = JSON.parse(downloadSettings);
          this.settings.mediaCache.downloadSettings = {
            ...this.settings.mediaCache.downloadSettings,
            ...parsedSettings,
          };
          await this.saveSettings();
        } catch (error) {
          console.error('Failed to parse download settings:', error);
        }
      }

      // Check for legacy notifications last seen ID
      const notificationsLastSeenId = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_LAST_SEEN_ID);
      if (notificationsLastSeenId && !stored) {
        this.settings.notificationsLastSeenId = notificationsLastSeenId;
        await this.saveSettings();
      }

      // Check for legacy onboarding completion
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      if (onboardingCompleted && !stored) {
        this.settings.onboarding.hasCompletedOnboarding = onboardingCompleted === "true";
        await this.saveSettings();
      }

      // Check for legacy terms acceptance
      const termsAccepted = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED);
      const termsVersion = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_VERSION);
      if (termsAccepted && termsVersion && !stored) {
        this.settings.termsAcceptance.termsAccepted = termsAccepted === "true";
        this.settings.termsAcceptance.acceptedVersion = termsVersion;
        await this.saveSettings();
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
   * Update locale
   */
  async setLocale(locale: Locale): Promise<void> {
    await this.updateSettings({
      locale: locale,
    });
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
    return this.settings.locale;
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

    // Filter by age
    if (filters.hideOlderThan !== 'none') {
      const now = new Date();
      const notificationDate = new Date(notification.createdAt);
      const diffHours = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);

      switch (filters.hideOlderThan) {
        case '1day':
          if (diffHours > 24) return false;
          break;
        case '1week':
          if (diffHours > 24 * 7) return false;
          break;
        case '1month':
          if (diffHours > 24 * 30) return false;
          break;
      }
    }

    // Filter by bucket
    if (!ignoreBucket && filters.selectedBucketIds.length > 0) {
      const selectedBucket = filters.selectedBucketIds[0];

      if (selectedBucket === '') {
        // Filter for "General" (no bucket) - notification should have null/undefined bucketId
        if (!!notification.message?.bucket?.id) {
          return false;
        }
      } else {
        // Filter for specific bucket
        if (notification.message?.bucket?.id !== selectedBucket) {
          return false;
        }
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
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Private method to merge stored settings with defaults
   */
  private mergeWithDefaults(stored: Partial<UserSettings>): UserSettings {
    // Ensure we keep using hideRead
    let notificationFilters = { ...DEFAULT_SETTINGS.notificationFilters };
    if (stored.notificationFilters) {
      notificationFilters = {
        ...notificationFilters,
        ...stored.notificationFilters,
      };
    }

    return {
      themeMode: stored.themeMode || DEFAULT_SETTINGS.themeMode,
      locale: stored.locale || DEFAULT_SETTINGS.locale,
      timezone: stored.timezone || DEFAULT_SETTINGS.timezone,
      dateFormat: stored.dateFormat || DEFAULT_SETTINGS.dateFormat,
      isCompactMode: stored.isCompactMode !== undefined ? stored.isCompactMode : DEFAULT_SETTINGS.isCompactMode,
      maxCachedNotifications: typeof stored.maxCachedNotifications === 'number' ? stored.maxCachedNotifications : DEFAULT_SETTINGS.maxCachedNotifications,
      mediaCache: {
        retentionPolicies: stored.mediaCache?.retentionPolicies || DEFAULT_SETTINGS.mediaCache.retentionPolicies,
        downloadSettings: stored.mediaCache?.downloadSettings || DEFAULT_SETTINGS.mediaCache.downloadSettings,
      },
      notificationsLastSeenId: stored.notificationsLastSeenId || DEFAULT_SETTINGS.notificationsLastSeenId,
      notificationFilters,
      gallery: stored.gallery || DEFAULT_SETTINGS.gallery,
      onboarding: stored.onboarding || DEFAULT_SETTINGS.onboarding,
      termsAcceptance: stored.termsAcceptance || DEFAULT_SETTINGS.termsAcceptance,
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
      showOnboarding: false,
    });
  }

  /**
   * Start onboarding
   */
  async startOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      showOnboarding: true,
    });
  }

  /**
   * Skip onboarding
   */
  async skipOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      showOnboarding: false,
    });
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(): Promise<void> {
    await this.updateOnboardingSettings({
      hasCompletedOnboarding: false,
      showOnboarding: false,
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
   * Check if user has accepted the current version of terms
   */
  hasAcceptedTerms(): boolean {
    return this.settings.termsAcceptance.termsAccepted &&
      this.settings.termsAcceptance.acceptedVersion === CURRENT_TERMS_VERSION;
  }

  /**
   * Get current terms version
   */
  getCurrentTermsVersion(): string {
    return CURRENT_TERMS_VERSION;
  }
}

// Export singleton instance
export const userSettings = new UserSettingsService();

// Export hook for React components
export function useUserSettings() {
  const [settings, setSettings] = React.useState<UserSettings>(userSettings.getSettings());

  React.useEffect(() => {
    // Initialize settings
    userSettings.initialize().then(setSettings);

    // Subscribe to changes
    const unsubscribe = userSettings.subscribe(setSettings);

    return unsubscribe;
  }, []);

  return {
    settings,
    updateSettings: userSettings.updateSettings.bind(userSettings),
    setThemeMode: userSettings.setThemeMode.bind(userSettings),
    setLocale: userSettings.setLocale.bind(userSettings),
    getTimezone: userSettings.getTimezone.bind(userSettings),
    setTimezone: userSettings.setTimezone.bind(userSettings),
    getDateFormatPreferences: userSettings.getDateFormatPreferences.bind(userSettings),
    setDateFormatPreferences: userSettings.setDateFormatPreferences.bind(userSettings),
    getIsCompactMode: userSettings.getIsCompactMode.bind(userSettings),
    setIsCompactMode: userSettings.setIsCompactMode.bind(userSettings),
    setNotificationFilters: userSettings.setNotificationFilters.bind(userSettings),
    setMaxCachedNotifications: userSettings.setMaxCachedNotifications.bind(userSettings),
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
    hasAcceptedTerms: userSettings.hasAcceptedTerms.bind(userSettings),
    getCurrentTermsVersion: userSettings.getCurrentTermsVersion.bind(userSettings),
  };
}
