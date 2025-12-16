import { UserSettingType, useUpsertUserSettingMutation } from '@/generated/gql-operations-generated';
import { AuthData, ChangelogSeenVersions, DateFormatPreferences, DownloadSettings, DynamicThemeColors, GalleryVisualization, LayoutMode, MarkAsReadMode, NotificationVisualization, RetentionPolicies, settingsService, UserSettings } from '@/services/settings-service';
import { ThemePreset } from '@/services/theme-presets';
import { useCallback, useEffect, useState } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(settingsService.getSettings());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Backend sync mutation
  const [upsertUserSetting] = useUpsertUserSettingMutation();

  useEffect(() => {
    const settingsSub = settingsService.userSettings$.subscribe(setSettings);
    const initSub = settingsService.isInitialized$.subscribe(setIsInitialized);

    return () => {
      settingsSub.unsubscribe();
      initSub.unsubscribe();
    };
  }, []);
  
  // Helper to sync with backend
  const syncWithBackend = useCallback(async (
    configType: UserSettingType,
    valueText?: string | null,
    valueBool?: boolean | null
  ) => {
    try {
      await upsertUserSetting({
        variables: {
          input: {
            configType,
            valueText: valueText === undefined ? null : valueText,
            valueBool: valueBool === undefined ? null : valueBool,
            deviceId: null,
          },
        },
      });
      console.log(`[useSettings] ✅ Synced ${configType} with backend`);
    } catch (error) {
      console.error(`[useSettings] ❌ Failed to sync ${configType} with backend:`, error);
    }
  }, [upsertUserSetting]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    await settingsService.updateSettings(updates);
  }, []);

  const setThemeMode = useCallback(async (mode: 'light' | 'dark' | 'system') => {
    await settingsService.setThemeMode(mode);
  }, []);

  const setLayoutMode = useCallback(async (mode: LayoutMode) => {
    await settingsService.setLayoutMode(mode);
  }, []);

  const getLayoutMode = useCallback(() => {
    return settingsService.getLayoutMode();
  }, []);

  const setCustomThemeSettings = useCallback(async (themeSettings: {
    themePreset?: ThemePreset;
    useDynamicTheme?: boolean;
    dynamicThemeColors?: DynamicThemeColors;
    textScale?: number;
  }) => {
    await settingsService.setCustomThemeSettings(themeSettings);
  }, []);

  const setTextScale = useCallback(async (scale: number) => {
    await settingsService.setTextScale(scale);
  }, []);

  const setNotificationVisualization = useCallback(async (filters: Partial<NotificationVisualization>) => {
    await settingsService.setNotificationVisualization(filters);
  }, []);

  const setLocale = useCallback(async (locale: string) => {
    await settingsService.setLocale(locale);
    await syncWithBackend(UserSettingType.Language, locale);
  }, [syncWithBackend]);

  const setTimezone = useCallback(async (timezone: string) => {
    await settingsService.setTimezone(timezone);
    await syncWithBackend(UserSettingType.Timezone, timezone);
  }, [syncWithBackend]);

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

  const setUnencryptOnBigPayload = useCallback(async (value: boolean) => {
    await settingsService.setUnencryptOnBigPayload(value);
    await syncWithBackend(UserSettingType.UnencryptOnBigPayload, null, value);
  }, [syncWithBackend]);

  const setMarkAsReadMode = useCallback(async (mode: MarkAsReadMode) => {
    await settingsService.setMarkAsReadMode(mode);
  }, []);

  const setGenerateBucketIconWithInitials = useCallback(async (value: boolean) => {
    await settingsService.setGenerateBucketIconWithInitials(value);
  }, []);

  const setAutoAddDeleteAction = useCallback(async (value: boolean) => {
    await settingsService.setAutoAddDeleteAction(value);
    await syncWithBackend(UserSettingType.AutoAddDeleteAction, null, value);
  }, [syncWithBackend]);

  const setAutoAddMarkAsReadAction = useCallback(async (value: boolean) => {
    await settingsService.setAutoAddMarkAsReadAction(value);
    await syncWithBackend(UserSettingType.AutoAddMarkAsReadAction, null, value);
  }, [syncWithBackend]);

  const setAutoAddOpenNotificationAction = useCallback(async (value: boolean) => {
    await settingsService.setAutoAddOpenNotificationAction(value);
    await syncWithBackend(UserSettingType.AutoAddOpenNotificationAction, null, value);
  }, [syncWithBackend]);

  const setDefaultPostpones = useCallback(async (values: number[]) => {
    await settingsService.setDefaultPostpones(values);
    await syncWithBackend(UserSettingType.DefaultPostpones, JSON.stringify(values));
  }, [syncWithBackend]);

  const setDefaultSnoozes = useCallback(async (values: number[]) => {
    await settingsService.setDefaultSnoozes(values);
    await syncWithBackend(UserSettingType.DefaultSnoozes, JSON.stringify(values));
  }, [syncWithBackend]);

  const setGithubEventsFilter = useCallback(async (events: string[]) => {
    await settingsService.setGithubEventsFilter(events);
    await syncWithBackend(UserSettingType.GithubEventsFilter, JSON.stringify(events));
  }, [syncWithBackend]);

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

  const skipOnboarding = useCallback(async () => {
    await settingsService.skipOnboarding();
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

  const setChangelogSeenVersions = useCallback(async (versions: ChangelogSeenVersions) => {
    await settingsService.setChangelogSeenVersions(versions);
  }, []);

  const exportSettings = useCallback(async () => {
    return await settingsService.exportSettings();
  }, []);

  const importSettings = useCallback(async (settingsJson: string) => {
    await settingsService.importSettings(settingsJson);
  }, []);

  return {
    settings,
    isInitialized,
    updateSettings,
    setThemeMode,
    setLayoutMode,
    getLayoutMode,
    setCustomThemeSettings,
    setTextScale,
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
    setUnencryptOnBigPayload,
    setMarkAsReadMode,
    setGenerateBucketIconWithInitials,
    setAutoAddDeleteAction,
    setAutoAddMarkAsReadAction,
    setAutoAddOpenNotificationAction,
    setDefaultPostpones,
    setDefaultSnoozes,
    setGithubEventsFilter,
    updateGalleryVisualization,
    setGalleryGridSize,
    updateOnboardingSettings,
    completeOnboarding,
    skipOnboarding,
    updateTermsAcceptanceSettings,
    acceptTerms,
    clearTermsAcceptance,
    setLastCleanup,
    shouldRunCleanup,
    resetSettings,
    setChangelogSeenVersions,
    exportSettings,
    importSettings,
    shouldFilterNotification: settingsService.shouldFilterNotification.bind(settingsService),
    getNotificationSortComparator: settingsService.getNotificationSortComparator.bind(settingsService),
    getApiUrl: useCallback(() => settingsService.getApiUrl(), []),
    getApiBaseWithPrefix: useCallback(() => settingsService.getApiBaseWithPrefix(), []),
    getCustomApiUrl: useCallback(() => settingsService.getCustomApiUrl(), []),
    hasCustomApiUrl: useCallback(() => settingsService.hasCustomApiUrl(), []),
    saveApiEndpoint: useCallback((endpoint: string) => settingsService.saveApiEndpoint(endpoint), []),
    resetApiEndpoint: useCallback(() => settingsService.resetApiEndpoint(), []),
    clearApiEndpoint: useCallback(() => settingsService.clearApiEndpoint(), []),
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

