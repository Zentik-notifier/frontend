import { settingsService, UserSettings, NotificationVisualization, DateFormatPreferences, MarkAsReadMode, LayoutMode, DynamicThemeColors, GalleryVisualization } from './settings-service';
import { ThemePreset } from './theme-presets';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import React, { useEffect } from 'react';

export * from './settings-service';

class UserSettingsService {
  async initialize(): Promise<UserSettings> {
    await settingsService.initialize();
    return settingsService.getSettings();
  }

  getSettings(): UserSettings {
    return settingsService.getSettings();
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    await settingsService.updateSettings(updates);
  }

  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    await settingsService.setThemeMode(mode);
  }

  async setCustomThemeSettings(settings: {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
  }): Promise<void> {
    await settingsService.setCustomThemeSettings(settings);
  }

  getLayoutMode(): LayoutMode {
    return settingsService.getSettings().theme.layoutMode;
  }

  async setLayoutMode(mode: LayoutMode): Promise<void> {
    await settingsService.setLayoutMode(mode);
  }

  async setNotificationFilters(filters: Partial<NotificationVisualization>): Promise<void> {
    await settingsService.setNotificationVisualization(filters);
  }

  getTimezone(): string {
    return settingsService.getSettings().timezone;
  }

  async setTimezone(timezone: string): Promise<void> {
    await settingsService.setTimezone(timezone);
  }

  getLocale(): string {
    return settingsService.getSettings().locale;
  }

  async setLocale(locale: string): Promise<void> {
    await settingsService.setLocale(locale);
  }

  getDateFormatPreferences(): DateFormatPreferences {
    return { ...settingsService.getSettings().dateFormat };
  }

  async setDateFormatPreferences(preferences: Partial<DateFormatPreferences>): Promise<void> {
    await settingsService.setDateFormatPreferences(preferences);
  }

  getMaxCachedNotifications(): number | undefined {
    return settingsService.getSettings().retentionPolicies.maxCachedNotifications;
  }

  async setMaxCachedNotifications(max: number | undefined): Promise<void> {
    await settingsService.setMaxCachedNotifications(max);
  }

  getMaxCachedNotificationsDay(): number | undefined {
    return settingsService.getSettings().retentionPolicies.maxCachedNotificationsDay;
  }

  async setMaxCachedNotificationsDay(days: number | undefined): Promise<void> {
    await settingsService.setMaxCachedNotificationsDay(days);
  }

  getIsCompactMode(): boolean {
    return settingsService.getSettings().notificationVisualization.isCompactMode;
  }

  async setIsCompactMode(isCompact: boolean): Promise<void> {
    await settingsService.setIsCompactMode(isCompact);
  }

  getMediaCacheRetentionPolicies(): { maxCacheSizeMB?: number; maxCageAgeDays?: number } {
    return { ...settingsService.getSettings().retentionPolicies };
  }

  async updateMediaCacheRetentionPolicies(policies: Partial<{ maxCacheSizeMB?: number; maxCageAgeDays?: number }>): Promise<void> {
    await settingsService.updateRetentionPolicies(policies);
  }

  getMediaCacheDownloadSettings(): { autoDownloadEnabled: boolean; wifiOnlyDownload: boolean } {
    return { ...settingsService.getSettings().downloadSettings };
  }

  async updateMediaCacheDownloadSettings(settings: Partial<{ autoDownloadEnabled: boolean; wifiOnlyDownload: boolean }>): Promise<void> {
    await settingsService.updateDownloadSettings(settings);
  }

  getNotificationsLastSeenId(): string | undefined {
    return settingsService.getSettings().notificationsLastSeenId;
  }

  async setNotificationsLastSeenId(id: string | undefined): Promise<void> {
    await settingsService.setNotificationsLastSeenId(id);
  }

  async resetSettings(): Promise<void> {
    await settingsService.resetSettings();
  }

  async resetSection(section: keyof UserSettings): Promise<void> {
    const defaults = settingsService.getSettings();
    await settingsService.updateSettings({ [section]: defaults[section] });
  }

  subscribe(listener: (settings: UserSettings) => void): () => void {
    const sub = settingsService.userSettings$.subscribe(listener);
    return () => sub.unsubscribe();
  }

  getThemeMode(): 'light' | 'dark' | 'system' {
    return settingsService.getSettings().theme.themeMode;
  }

  getNotificationFilters(): NotificationVisualization {
    return { ...settingsService.getSettings().notificationVisualization };
  }

  shouldFilterNotification(notification: NotificationFragment, ignoreBucket?: boolean): boolean {
    return settingsService.shouldFilterNotification(notification, ignoreBucket);
  }

  getNotificationSortComparator() {
    return settingsService.getNotificationSortComparator();
  }

  async exportSettings(): Promise<string> {
    return await settingsService.exportSettings();
  }

  getGallerySettings(): GalleryVisualization {
    return { ...settingsService.getSettings().galleryVisualization };
  }

  async updateGallerySettings(updates: Partial<GalleryVisualization>): Promise<void> {
    await settingsService.updateGalleryVisualization(updates);
  }

  getGalleryGridSize(): number {
    return settingsService.getSettings().galleryVisualization.gridSize;
  }

  async setGalleryGridSize(size: number): Promise<void> {
    await settingsService.setGalleryGridSize(size);
  }

  async importSettings(settingsJson: string): Promise<void> {
    await settingsService.importSettings(settingsJson);
  }

  getOnboardingSettings(): UserSettings['onboarding'] {
    return { ...settingsService.getSettings().onboarding };
  }

  async updateOnboardingSettings(updates: Partial<UserSettings['onboarding']>): Promise<void> {
    await settingsService.updateOnboardingSettings(updates);
  }

  async completeOnboarding(): Promise<void> {
    await settingsService.completeOnboarding();
  }

  async startOnboarding(): Promise<void> {
    await settingsService.updateOnboardingSettings({ hasCompletedOnboarding: false });
  }

  async skipOnboarding(): Promise<void> {
    await settingsService.updateOnboardingSettings({ hasCompletedOnboarding: true });
  }

  async resetOnboarding(): Promise<void> {
    await settingsService.updateOnboardingSettings({
      hasCompletedOnboarding: false,
    });
  }

  getTermsAcceptanceSettings(): UserSettings['termsAcceptance'] {
    return { ...settingsService.getSettings().termsAcceptance };
  }

  async updateTermsAcceptanceSettings(updates: Partial<UserSettings['termsAcceptance']>): Promise<void> {
    await settingsService.updateTermsAcceptanceSettings(updates);
  }

  async acceptTerms(): Promise<void> {
    await settingsService.acceptTerms();
  }

  async clearTermsAcceptance(): Promise<void> {
    await settingsService.clearTermsAcceptance();
  }

  getLastCleanup(): string | undefined {
    return settingsService.getSettings().lastCleanup;
  }

  async setLastCleanup(timestamp: string): Promise<void> {
    await settingsService.setLastCleanup(timestamp);
  }

  shouldRunCleanup(): boolean {
    return settingsService.shouldRunCleanup();
  }
}

export const userSettings = new UserSettingsService();

export function useUserSettings() {
  const [settings, setSettings] = React.useState<UserSettings>(settingsService.getSettings());
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    settingsService.initialize().then(() => {
      setSettings(settingsService.getSettings());
      setIsLoaded(true);
    });

    const sub = settingsService.userSettings$.subscribe(setSettings);

    return () => sub.unsubscribe();
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings: userSettings.updateSettings.bind(userSettings),
    setThemeMode: userSettings.setThemeMode.bind(userSettings),
    getLayoutMode: userSettings.getLayoutMode.bind(userSettings),
    setLayoutMode: userSettings.setLayoutMode.bind(userSettings),
    setCustomThemeSettings: userSettings.setCustomThemeSettings.bind(userSettings),
    getTimezone: userSettings.getTimezone.bind(userSettings),
    setTimezone: userSettings.setTimezone.bind(userSettings),
    getLocale: userSettings.getLocale.bind(userSettings),
    setLocale: userSettings.setLocale.bind(userSettings),
    getDateFormatPreferences: userSettings.getDateFormatPreferences.bind(userSettings),
    setDateFormatPreferences: userSettings.setDateFormatPreferences.bind(userSettings),
    getIsCompactMode: userSettings.getIsCompactMode.bind(userSettings),
    setIsCompactMode: userSettings.setIsCompactMode.bind(userSettings),
    setNotificationFilters: userSettings.setNotificationFilters.bind(userSettings),
    setMaxCachedNotifications: userSettings.setMaxCachedNotifications.bind(userSettings),
    setMaxCachedNotificationsDay: userSettings.setMaxCachedNotificationsDay.bind(userSettings),
    resetSettings: userSettings.resetSettings.bind(userSettings),
    resetSection: userSettings.resetSection.bind(userSettings),
    exportSettings: userSettings.exportSettings.bind(userSettings),
    importSettings: userSettings.importSettings.bind(userSettings),
    getMediaCacheRetentionPolicies: userSettings.getMediaCacheRetentionPolicies.bind(userSettings),
    updateMediaCacheRetentionPolicies: userSettings.updateMediaCacheRetentionPolicies.bind(userSettings),
    getMediaCacheDownloadSettings: userSettings.getMediaCacheDownloadSettings.bind(userSettings),
    updateMediaCacheDownloadSettings: userSettings.updateMediaCacheDownloadSettings.bind(userSettings),
    getNotificationsLastSeenId: userSettings.getNotificationsLastSeenId.bind(userSettings),
    setNotificationsLastSeenId: userSettings.setNotificationsLastSeenId.bind(userSettings),
    getGallerySettings: userSettings.getGallerySettings.bind(userSettings),
    updateGallerySettings: userSettings.updateGallerySettings.bind(userSettings),
    getGalleryGridSize: userSettings.getGalleryGridSize.bind(userSettings),
    setGalleryGridSize: userSettings.setGalleryGridSize.bind(userSettings),
    getOnboardingSettings: userSettings.getOnboardingSettings.bind(userSettings),
    updateOnboardingSettings: userSettings.updateOnboardingSettings.bind(userSettings),
    completeOnboarding: userSettings.completeOnboarding.bind(userSettings),
    startOnboarding: userSettings.startOnboarding.bind(userSettings),
    skipOnboarding: userSettings.skipOnboarding.bind(userSettings),
    resetOnboarding: userSettings.resetOnboarding.bind(userSettings),
    getTermsAcceptanceSettings: userSettings.getTermsAcceptanceSettings.bind(userSettings),
    updateTermsAcceptanceSettings: userSettings.updateTermsAcceptanceSettings.bind(userSettings),
    acceptTerms: userSettings.acceptTerms.bind(userSettings),
    clearTermsAcceptance: userSettings.clearTermsAcceptance.bind(userSettings),
    getLastCleanup: userSettings.getLastCleanup.bind(userSettings),
    setLastCleanup: userSettings.setLastCleanup.bind(userSettings),
    shouldRunCleanup: userSettings.shouldRunCleanup.bind(userSettings),
  };
}

