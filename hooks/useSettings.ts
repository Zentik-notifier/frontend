import { useEffect, useState, useMemo, useCallback } from 'react';
import { settingsService, UserSettings, AuthData, NotificationVisualization, DateFormatPreferences, MarkAsReadMode, LayoutMode, DynamicThemeColors, RetentionPolicies, DownloadSettings, GalleryVisualization } from '@/services/settings-service';
import { ThemePreset } from '@/services/theme-presets';
import { MediaType } from '@/generated/gql-operations-generated';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(settingsService.getSettings());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const settingsSub = settingsService.userSettings$.subscribe(setSettings);
    const initSub = settingsService.isInitialized$.subscribe(setIsInitialized);

    return () => {
      settingsSub.unsubscribe();
      initSub.unsubscribe();
    };
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    await settingsService.updateSettings(updates);
  }, []);

  const setThemeMode = useCallback(async (mode: 'light' | 'dark' | 'system') => {
    await settingsService.setThemeMode(mode);
  }, []);

  const setLayoutMode = useCallback(async (mode: LayoutMode) => {
    await settingsService.setLayoutMode(mode);
  }, []);

  const setCustomThemeSettings = useCallback(async (themeSettings: {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
  }) => {
    await settingsService.setCustomThemeSettings(themeSettings);
  }, []);

  const setNotificationVisualization = useCallback(async (filters: Partial<NotificationVisualization>) => {
    await settingsService.setNotificationVisualization(filters);
  }, []);

  const setLocale = useCallback(async (locale: string) => {
    await settingsService.setLocale(locale);
  }, []);

  const setTimezone = useCallback(async (timezone: string) => {
    await settingsService.setTimezone(timezone);
  }, []);

  const setDateFormatPreferences = useCallback(async (preferences: Partial<DateFormatPreferences>) => {
    await settingsService.setDateFormatPreferences(preferences);
  }, []);

  const setIsCompactMode = useCallback(async (isCompact: boolean) => {
    await settingsService.setIsCompactMode(isCompact);
  }, []);

  const setMaxCachedNotifications = useCallback(async (max: number | undefined) => {
    await settingsService.setMaxCachedNotifications(max);
  }, []);

  const setMaxCachedNotificationsDay = useCallback(async (days: number | undefined) => {
    await settingsService.setMaxCachedNotificationsDay(days);
  }, []);

  const setNotificationsLastSeenId = useCallback(async (id: string | undefined) => {
    await settingsService.setNotificationsLastSeenId(id);
  }, []);

  const setGalleryGridSize = useCallback(async (size: number) => {
    await settingsService.setGalleryGridSize(size);
  }, []);

  const updateRetentionPolicies = useCallback(async (policies: Partial<RetentionPolicies>) => {
    await settingsService.updateRetentionPolicies(policies);
  }, []);

  const updateDownloadSettings = useCallback(async (settings: Partial<DownloadSettings>) => {
    await settingsService.updateDownloadSettings(settings);
  }, []);

  const updateGalleryVisualization = useCallback(async (updates: Partial<GalleryVisualization>) => {
    await settingsService.updateGalleryVisualization(updates);
  }, []);

  const updateOnboardingSettings = useCallback(async (updates: Partial<UserSettings['onboarding']>) => {
    await settingsService.updateOnboardingSettings(updates);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await settingsService.completeOnboarding();
  }, []);

  const updateTermsAcceptanceSettings = useCallback(async (updates: Partial<UserSettings['termsAcceptance']>) => {
    await settingsService.updateTermsAcceptanceSettings(updates);
  }, []);

  const acceptTerms = useCallback(async () => {
    await settingsService.acceptTerms();
  }, []);

  const clearTermsAcceptance = useCallback(async () => {
    await settingsService.clearTermsAcceptance();
  }, []);

  const setLastCleanup = useCallback(async (timestamp: string) => {
    await settingsService.setLastCleanup(timestamp);
  }, []);

  const shouldRunCleanup = useCallback(() => {
    return settingsService.shouldRunCleanup();
  }, []);

  const resetSettings = useCallback(async () => {
    await settingsService.resetSettings();
  }, []);

  const exportSettings = useCallback(async () => {
    return await settingsService.exportSettings();
  }, []);

  const importSettings = useCallback(async (settingsJson: string) => {
    await settingsService.importSettings(settingsJson);
  }, []);

  const forceMigrationFromLegacy = useCallback(async () => {
    await settingsService.forceMigrationFromLegacy();
  }, []);

  const isMigrationCompleted = useCallback(async () => {
    return await settingsService.isMigrationCompleted();
  }, []);

  return {
    settings,
    isInitialized,
    updateSettings,
    setThemeMode,
    setLayoutMode,
    setCustomThemeSettings,
    setNotificationVisualization,
    setLocale,
    setTimezone,
    setDateFormatPreferences,
    setIsCompactMode,
    setMaxCachedNotifications,
    setMaxCachedNotificationsDay,
    updateRetentionPolicies,
    updateDownloadSettings,
    setNotificationsLastSeenId,
    updateGalleryVisualization,
    setGalleryGridSize,
    updateOnboardingSettings,
    completeOnboarding,
    updateTermsAcceptanceSettings,
    acceptTerms,
    clearTermsAcceptance,
    setLastCleanup,
    shouldRunCleanup,
    resetSettings,
    exportSettings,
    importSettings,
    forceMigrationFromLegacy,
    isMigrationCompleted,
    shouldFilterNotification: settingsService.shouldFilterNotification.bind(settingsService),
    getNotificationSortComparator: settingsService.getNotificationSortComparator.bind(settingsService),
    // Legacy methods for backward compatibility
    setNotificationFilters: setNotificationVisualization,
    updateMediaCacheRetentionPolicies: updateRetentionPolicies,
    updateMediaCacheDownloadSettings: updateDownloadSettings,
    updateGallerySettings: updateGalleryVisualization,
  };
}

export function useSettingsValue<K extends keyof UserSettings>(key: K): UserSettings[K] {
  const [value, setValue] = useState<UserSettings[K]>(settingsService.getSettings()[key]);

  useEffect(() => {
    const sub = settingsService.selectSettings(key).subscribe(setValue);
    return () => sub.unsubscribe();
  }, [key]);

  return value;
}

export function useAuthData() {
  const [authData, setAuthData] = useState<AuthData>(settingsService.getAuthData());

  useEffect(() => {
    const sub = settingsService.authData$.subscribe(setAuthData);
    return () => sub.unsubscribe();
  }, []);

  const saveTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    await settingsService.saveTokens(accessToken, refreshToken);
  }, []);

  const clearTokens = useCallback(async () => {
    await settingsService.clearTokens();
  }, []);

  const saveDeviceId = useCallback(async (deviceId: string) => {
    await settingsService.saveDeviceId(deviceId);
  }, []);

  const saveBadgeCount = useCallback(async (count: number) => {
    await settingsService.saveBadgeCount(count);
  }, []);

  const saveApiEndpoint = useCallback(async (endpoint: string) => {
    await settingsService.saveApiEndpoint(endpoint);
  }, []);

  const clearAllAuthData = useCallback(async () => {
    await settingsService.clearAllAuthData();
  }, []);

  const saveDeviceToken = useCallback(async (deviceToken: string) => {
    await settingsService.saveDeviceToken(deviceToken);
  }, []);

  const saveLastUserId = useCallback(async (userId: string) => {
    await settingsService.saveLastUserId(userId);
  }, []);

  const savePublicKey = useCallback(async (publicKey: string) => {
    await settingsService.savePublicKey(publicKey);
  }, []);

  const savePrivateKey = useCallback(async (privateKey: string) => {
    await settingsService.savePrivateKey(privateKey);
  }, []);

  const savePushNotificationsInitialized = useCallback(async (initialized: boolean) => {
    await settingsService.savePushNotificationsInitialized(initialized);
  }, []);

  const savePendingNavigationIntent = useCallback(async (intent: any) => {
    await settingsService.savePendingNavigationIntent(intent);
  }, []);

  const clearPendingNavigationIntent = useCallback(async () => {
    await settingsService.clearPendingNavigationIntent();
  }, []);

  const clearBadgeCount = useCallback(async () => {
    await settingsService.clearBadgeCount();
  }, []);

  const clearApiEndpoint = useCallback(async () => {
    await settingsService.clearApiEndpoint();
  }, []);

  const hasKeyPair = useCallback(async () => {
    return await settingsService.hasKeyPair();
  }, []);

  const clearKeyPair = useCallback(async () => {
    await settingsService.clearKeyPair();
  }, []);

  return {
    authData,
    saveTokens,
    clearTokens,
    saveDeviceId,
    saveDeviceToken,
    saveLastUserId,
    savePublicKey,
    savePrivateKey,
    savePushNotificationsInitialized,
    savePendingNavigationIntent,
    clearPendingNavigationIntent,
    saveBadgeCount,
    clearBadgeCount,
    saveApiEndpoint,
    clearApiEndpoint,
    hasKeyPair,
    clearKeyPair,
    clearAllAuthData,
  };
}

export function useAuthValue<K extends keyof AuthData>(key: K): AuthData[K] {
  const [value, setValue] = useState<AuthData[K]>(settingsService.getAuthData()[key]);

  useEffect(() => {
    const sub = settingsService.selectAuthData(key).subscribe(setValue);
    return () => sub.unsubscribe();
  }, [key]);

  return value;
}

