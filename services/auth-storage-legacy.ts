import { settingsService, CURRENT_TERMS_VERSION } from './settings-service';

export { CURRENT_TERMS_VERSION };

export const saveTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await settingsService.saveTokens(accessToken, refreshToken);
};

export const getAccessToken = async (): Promise<string | null> => {
  return settingsService.getAuthData().accessToken;
};

export const getRefreshToken = async (): Promise<string | null> => {
  return settingsService.getAuthData().refreshToken;
};

export const clearTokens = async (): Promise<void> => {
  await settingsService.clearTokens();
};

export const clearDeviceTokens = async (): Promise<void> => {
  await settingsService.clearKeyPair();
};

export const saveDeviceToken = async (deviceToken: string): Promise<void> => {
  await settingsService.saveDeviceToken(deviceToken);
};

export const getStoredDeviceToken = async (): Promise<string | null> => {
  return settingsService.getAuthData().deviceToken;
};

export const saveDeviceId = async (deviceId: string): Promise<void> => {
  await settingsService.saveDeviceId(deviceId);
};

export const getStoredDeviceId = async (): Promise<string | null> => {
  return settingsService.getAuthData().deviceId;
};

export const clearDeviceId = async (): Promise<void> => {
  const current = settingsService.getAuthData();
  current.deviceId = null;
};

export const saveLastUserId = async (userId: string): Promise<void> => {
  await settingsService.saveLastUserId(userId);
};

export const getLastUserId = async (): Promise<string | null> => {
  return settingsService.getAuthData().lastUserId;
};

export const clearLastUserId = async (): Promise<void> => {
  const current = settingsService.getAuthData();
  current.lastUserId = null;
};

export const savePublicKey = async (publicKey: string): Promise<void> => {
  await settingsService.savePublicKey(publicKey);
};

export const getStoredPublicKey = async (): Promise<string | null> => {
  return settingsService.getAuthData().publicKey;
};

export const clearPublicKey = async (): Promise<void> => {
  const current = settingsService.getAuthData();
  current.publicKey = null;
};

export const savePrivateKey = async (privateKey: string): Promise<void> => {
  await settingsService.savePrivateKey(privateKey);
};

export const getStoredPrivateKey = async (): Promise<string | null> => {
  return settingsService.getAuthData().privateKey;
};

export const clearPrivateKey = async (): Promise<void> => {
  const current = settingsService.getAuthData();
  current.privateKey = null;
};

export const savePushNotificationsInitialized = async (initialized: boolean): Promise<void> => {
  await settingsService.savePushNotificationsInitialized(initialized);
};

export const getPushNotificationsInitialized = async (): Promise<boolean> => {
  return settingsService.getAuthData().pushNotificationsInitialized;
};

export const clearPushNotificationsInitialized = async (): Promise<void> => {
  await settingsService.savePushNotificationsInitialized(false);
};

export const savePendingNavigationIntent = async (intent: any): Promise<void> => {
  await settingsService.savePendingNavigationIntent(intent);
};

export const getPendingNavigationIntent = async (): Promise<any> => {
  return settingsService.getAuthData().pendingNavigationIntent;
};

export const clearPendingNavigationIntent = async (): Promise<void> => {
  await settingsService.clearPendingNavigationIntent();
};

export const saveBadgeCount = async (count: number): Promise<void> => {
  await settingsService.saveBadgeCount(count);
};

export const getStoredBadgeCount = async (): Promise<number> => {
  return settingsService.getAuthData().badgeCount;
};

export const clearBadgeCount = async (): Promise<void> => {
  await settingsService.clearBadgeCount();
};

export const saveApiEndpoint = async (endpoint: string): Promise<void> => {
  await settingsService.saveApiEndpoint(endpoint);
};

export const getStoredApiEndpoint = async (): Promise<string | null> => {
  return settingsService.getAuthData().apiEndpoint;
};

export const clearApiEndpoint = async (): Promise<void> => {
  await settingsService.clearApiEndpoint();
};

export const clearPendingNotifications = async (): Promise<void> => {
  await settingsService.clearPendingNavigationIntent();
};

export const saveLocale = async (locale: string): Promise<void> => {
  await settingsService.setLocale(locale);
};

export const getStoredLocale = async (): Promise<string | null> => {
  return settingsService.getSettings().locale;
};

export const acceptTerms = async (): Promise<void> => {
  await settingsService.acceptTerms();
};

export const clearTermsAcceptance = async (): Promise<void> => {
  await settingsService.clearTermsAcceptance();
};

export const getCurrentTermsVersion = (): string => {
  return CURRENT_TERMS_VERSION;
};

export const hasKeyPair = async (): Promise<boolean> => {
  return await settingsService.hasKeyPair();
};

export const clearKeyPair = async (): Promise<void> => {
  await settingsService.clearKeyPair();
};

export const getStoredKeyPair = async (): Promise<{ publicKey: string | null; privateKey: string | null }> => {
  const authData = settingsService.getAuthData();
  return {
    publicKey: authData.publicKey,
    privateKey: authData.privateKey,
  };
};

export const clearAllAuthData = async (): Promise<void> => {
  await settingsService.clearAllAuthData();
};

