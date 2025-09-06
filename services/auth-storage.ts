
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

// Keys for AsyncStorage / Web Storage
const TERMS_ACCEPTED_KEY = 'terms_accepted';
const TERMS_VERSION_KEY = 'terms_version';
const DEVICE_TOKEN_KEY = 'device_token';
const LAST_USER_ID_KEY = 'last_user_id';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PUBLIC_KEY_KEY = 'public_key';
const PRIVATE_KEY_KEY = 'private_key';
const PUSH_NOTIFICATIONS_INITIALIZED_KEY = 'push_notifications_initialized';
const PENDING_NAVIGATION_INTENT_KEY = 'pending_navigation_intent';
const PENDING_SNOOZE_INTENT_KEY = 'pending_snooze_intent';
const BADGE_COUNT_KEY = 'badge_count';
const API_ENDPOINT_KEY = 'api_endpoint';

// Event emitter for terms acceptance changes
class TermsEventEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in terms event listener:', error);
      }
    });
  }
}

const termsEventEmitter = new TermsEventEmitter();

let saveTokens: (accessToken: string, refreshToken: string) => Promise<void>;
let getAccessToken: () => Promise<string | null>;
let getRefreshToken: () => Promise<string | null>;
let clearTokens: () => Promise<void>;
export let clearDeviceTokens: () => Promise<void>;
export let saveDeviceToken: (deviceToken: string) => Promise<void>;
export let getStoredDeviceToken: () => Promise<string | null>;
export let saveLastUserId: (userId: string) => Promise<void>;
export let getLastUserId: () => Promise<string | null>;
export let clearLastUserId: () => Promise<void>;
export let savePublicKey: (publicKey: string) => Promise<void>;
export let getStoredPublicKey: () => Promise<string | null>;
export let clearPublicKey: () => Promise<void>;
export let savePrivateKey: (privateKey: string) => Promise<void>;
export let getStoredPrivateKey: () => Promise<string | null>;
export let clearPrivateKey: () => Promise<void>;
export let savePushNotificationsInitialized: (initialized: boolean) => Promise<void>;
export let getPushNotificationsInitialized: () => Promise<boolean>;
export let clearPushNotificationsInitialized: () => Promise<void>;
export let savePendingNavigationIntent: (intent: any) => Promise<void>;
export let getPendingNavigationIntent: () => Promise<any>;
export let clearPendingNavigationIntent: () => Promise<void>;
export let savePendingSnoozeIntent: (intent: any) => Promise<void>;
export let getPendingSnoozeIntent: () => Promise<any>;
export let clearPendingSnoozeIntent: () => Promise<void>;
export let saveBadgeCount: (count: number) => Promise<void>;
export let getStoredBadgeCount: () => Promise<number>;
export let clearBadgeCount: () => Promise<void>;
export let saveApiEndpoint: (endpoint: string) => Promise<void>;
export let getStoredApiEndpoint: () => Promise<string | null>;
export let clearApiEndpoint: () => Promise<void>;

if (Platform.OS === 'web') {
  saveTokens = async (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  };
  getAccessToken = async () => localStorage.getItem(ACCESS_TOKEN_KEY);
  getRefreshToken = async () => localStorage.getItem(REFRESH_TOKEN_KEY);
  clearTokens = async () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };
  clearDeviceTokens = async () => {
    localStorage.removeItem(PUBLIC_KEY_KEY);
    localStorage.removeItem(PRIVATE_KEY_KEY);
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  };
  saveDeviceToken = async (deviceToken: string) => {
    localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
  };
  getStoredDeviceToken = async () => localStorage.getItem(DEVICE_TOKEN_KEY);
  saveLastUserId = async (userId: string) => {
    localStorage.setItem(LAST_USER_ID_KEY, userId);
  };
  getLastUserId = async () => localStorage.getItem(LAST_USER_ID_KEY);
  clearLastUserId = async () => {
    localStorage.removeItem(LAST_USER_ID_KEY);
  };
  savePublicKey = async (publicKey: string) => {
    localStorage.setItem(PUBLIC_KEY_KEY, publicKey);
  };
  getStoredPublicKey = async () => localStorage.getItem(PUBLIC_KEY_KEY);
  clearPublicKey = async () => {
    localStorage.removeItem(PUBLIC_KEY_KEY);
  };
  savePrivateKey = async (privateKey: string) => {
    localStorage.setItem(PRIVATE_KEY_KEY, privateKey);
  };
  getStoredPrivateKey = async () => localStorage.getItem(PRIVATE_KEY_KEY);
  clearPrivateKey = async () => {
    localStorage.removeItem(PRIVATE_KEY_KEY);
  };
  savePushNotificationsInitialized = async (initialized: boolean) => {
    localStorage.setItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY, initialized.toString());
  };
  getPushNotificationsInitialized = async () => {
    const value = localStorage.getItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY);
    return value === 'true';
  };
  clearPushNotificationsInitialized = async () => {
    localStorage.removeItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY);
  };
  savePendingNavigationIntent = async (intent: any) => {
    localStorage.setItem(PENDING_NAVIGATION_INTENT_KEY, JSON.stringify(intent));
  };
  getPendingNavigationIntent = async () => {
    const value = localStorage.getItem(PENDING_NAVIGATION_INTENT_KEY);
    return value ? JSON.parse(value) : null;
  };
  clearPendingNavigationIntent = async () => {
    localStorage.removeItem(PENDING_NAVIGATION_INTENT_KEY);
  };
  savePendingSnoozeIntent = async (intent: any) => {
    localStorage.setItem(PENDING_SNOOZE_INTENT_KEY, JSON.stringify(intent));
  };
  getPendingSnoozeIntent = async () => {
    const value = localStorage.getItem(PENDING_SNOOZE_INTENT_KEY);
    return value ? JSON.parse(value) : null;
  };
  clearPendingSnoozeIntent = async () => {
    localStorage.removeItem(PENDING_SNOOZE_INTENT_KEY);
  };
  saveBadgeCount = async (count: number) => {
    localStorage.setItem(BADGE_COUNT_KEY, count.toString());
  };
  getStoredBadgeCount = async () => {
    const value = localStorage.getItem(BADGE_COUNT_KEY);
    return value ? parseInt(value, 10) : 0;
  };
  clearBadgeCount = async () => {
    localStorage.removeItem(BADGE_COUNT_KEY);
  };
  saveApiEndpoint = async (endpoint: string) => {
    localStorage.setItem(API_ENDPOINT_KEY, endpoint);
  };
  getStoredApiEndpoint = async () => {
    return localStorage.getItem(API_ENDPOINT_KEY);
  };
  clearApiEndpoint = async () => {
    localStorage.removeItem(API_ENDPOINT_KEY);
  };
} else {
  const SERVICE = 'zentik-auth';
  const PUBLIC_KEY_SERVICE = 'zentik-public-key';
  const PRIVATE_KEY_SERVICE = 'zentik-private-key';
  const PENDING_NAVIGATION_SERVICE = 'zentik-pending-navigation';
  const PENDING_SNOOZE_SERVICE = 'zentik-pending-snooze';
  const BADGE_COUNT_SERVICE = 'zentik-badge-count';
  const API_ENDPOINT_SERVICE = 'zentik-api-endpoint';

  const bundleIdentifier = process.env.EXPO_PUBLIC_APP_VARIANT === 'development' ?
    'com.apocaliss92.zentik.dev' :
    'com.apocaliss92.zentik';
  const KEYCHAIN_ACCESS_GROUP = `C3F24V5NS5.${bundleIdentifier}.keychain`;
  const ACCESSIBLE = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK;

  saveTokens = async (accessToken, refreshToken) => {
    const options: Keychain.SetOptions = Device.isDevice
      ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
      : { service: SERVICE, accessible: ACCESSIBLE };
    await Keychain.setGenericPassword(accessToken, refreshToken, options);
  };
  getAccessToken = async () => {
    const options: Keychain.GetOptions = Device.isDevice
      ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
      : { service: SERVICE };
    const creds = await Keychain.getGenericPassword(options);
    return creds ? creds.username : null;
  };
  getRefreshToken = async () => {
    const options: Keychain.GetOptions = Device.isDevice
      ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
      : { service: SERVICE };
    const creds = await Keychain.getGenericPassword(options);
    return creds ? creds.password : null;
  };
  clearTokens = async () => {
    const options: Keychain.SetOptions = Device.isDevice
      ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
      : { service: SERVICE };
    await Keychain.resetGenericPassword(options);
  };
  clearDeviceTokens = async () => {
    const publicKeyOptions: Keychain.SetOptions = Device.isDevice
      ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
      : { service: PUBLIC_KEY_SERVICE };
    const privateKeyOptions: Keychain.SetOptions = Device.isDevice
      ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
      : { service: PRIVATE_KEY_SERVICE };
    await Keychain.resetGenericPassword(publicKeyOptions);
    await Keychain.resetGenericPassword(privateKeyOptions);
    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
  };
  // Device token is not secret; store via AsyncStorage
  saveDeviceToken = async (deviceToken: string) => {
    await AsyncStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
  };
  getStoredDeviceToken = async () => {
    try {
      return await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    } catch {
      return null;
    }
  };
  saveLastUserId = async (userId: string) => {
    await AsyncStorage.setItem(LAST_USER_ID_KEY, userId);
  };
  getLastUserId = async () => {
    try {
      return await AsyncStorage.getItem(LAST_USER_ID_KEY);
    } catch {
      return null;
    }
  };
  clearLastUserId = async () => {
    try {
      await AsyncStorage.removeItem(LAST_USER_ID_KEY);
    } catch { }
  };

  // Push notifications initialization state
  savePushNotificationsInitialized = async (initialized: boolean) => {
    try {
      await AsyncStorage.setItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY, initialized.toString());
    } catch (error) {
      console.error('Failed to save push notifications initialized state:', error);
    }
  };

  getPushNotificationsInitialized = async () => {
    try {
      const value = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to get push notifications initialized state:', error);
      return false;
    }
  };

  clearPushNotificationsInitialized = async () => {
    try {
      await AsyncStorage.removeItem(PUSH_NOTIFICATIONS_INITIALIZED_KEY);
    } catch { }
  };


  // Public key - use keychain for iOS (more secure), AsyncStorage for Android
  if (Platform.OS === 'ios') {
    savePublicKey = async (publicKey: string) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PUBLIC_KEY_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('public', publicKey, options);
      } catch (error) {
        console.error('Failed to save public key to keychain:', error);
        // Fallback to AsyncStorage if keychain fails
        await AsyncStorage.setItem(PUBLIC_KEY_KEY, publicKey);
      }
    };
    getStoredPublicKey = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PUBLIC_KEY_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return creds.password;
        }
        // Fallback to AsyncStorage if keychain doesn't have it
        return await AsyncStorage.getItem(PUBLIC_KEY_KEY);
      } catch (error) {
        console.error('Failed to get public key from keychain:', error);
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(PUBLIC_KEY_KEY);
      }
    };
    clearPublicKey = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PUBLIC_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PUBLIC_KEY_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(PUBLIC_KEY_KEY);
      } catch { }
    };

    // Private key - use keychain for iOS (more secure), AsyncStorage for Android
    savePrivateKey = async (privateKey: string) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PRIVATE_KEY_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('private', privateKey, options);
      } catch (error) {
        console.error('Failed to save private key to keychain:', error);
        // Fallback to AsyncStorage if keychain fails
        await AsyncStorage.setItem(PRIVATE_KEY_KEY, privateKey);
      }
    };
    getStoredPrivateKey = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PRIVATE_KEY_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return creds.password;
        }
        // Fallback to AsyncStorage if keychain doesn't have it
        return await AsyncStorage.getItem(PRIVATE_KEY_KEY);
      } catch (error) {
        console.error('Failed to get private key from keychain:', error);
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(PRIVATE_KEY_KEY);
      }
    };
    clearPrivateKey = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PRIVATE_KEY_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PRIVATE_KEY_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(PRIVATE_KEY_KEY);
      } catch { }
    };

    // Pending intents - use keychain with access group for iOS
    savePendingNavigationIntent = async (intent: any) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PENDING_NAVIGATION_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('navigation', JSON.stringify(intent), options);
      } catch (error) {
        console.error('Failed to save pending navigation intent to keychain:', error);
        await AsyncStorage.setItem(PENDING_NAVIGATION_INTENT_KEY, JSON.stringify(intent));
      }
    };
    getPendingNavigationIntent = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_NAVIGATION_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return JSON.parse(creds.password);
        }
        const fallback = await AsyncStorage.getItem(PENDING_NAVIGATION_INTENT_KEY);
        return fallback ? JSON.parse(fallback) : null;
      } catch (error) {
        console.error('Failed to get pending navigation intent from keychain:', error);
        try {
          const fallback = await AsyncStorage.getItem(PENDING_NAVIGATION_INTENT_KEY);
          return fallback ? JSON.parse(fallback) : null;
        } catch {
          return null;
        }
      }
    };
    clearPendingNavigationIntent = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_NAVIGATION_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_NAVIGATION_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(PENDING_NAVIGATION_INTENT_KEY);
      } catch { }
    };

    savePendingSnoozeIntent = async (intent: any) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_SNOOZE_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: PENDING_SNOOZE_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('snooze', JSON.stringify(intent), options);
      } catch (error) {
        console.error('Failed to save pending snooze intent to keychain:', error);
        await AsyncStorage.setItem(PENDING_SNOOZE_INTENT_KEY, JSON.stringify(intent));
      }
    };
    getPendingSnoozeIntent = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: PENDING_SNOOZE_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_SNOOZE_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return JSON.parse(creds.password);
        }
        const fallback = await AsyncStorage.getItem(PENDING_SNOOZE_INTENT_KEY);
        return fallback ? JSON.parse(fallback) : null;
      } catch (error) {
        console.error('Failed to get pending snooze intent from keychain:', error);
        try {
          const fallback = await AsyncStorage.getItem(PENDING_SNOOZE_INTENT_KEY);
          return fallback ? JSON.parse(fallback) : null;
        } catch {
          return null;
        }
      }
    };
    clearPendingSnoozeIntent = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: PENDING_SNOOZE_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: PENDING_SNOOZE_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(PENDING_SNOOZE_INTENT_KEY);
      } catch { }
    };

    // Badge count - use keychain with access group for iOS
    saveBadgeCount = async (count: number) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: BADGE_COUNT_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('badge', count.toString(), options);
      } catch (error) {
        console.error('Failed to save badge count to keychain:', error);
        await AsyncStorage.setItem(BADGE_COUNT_KEY, count.toString());
      }
    };
    getStoredBadgeCount = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: BADGE_COUNT_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return parseInt(creds.password, 10) || 0;
        }
        const fallback = await AsyncStorage.getItem(BADGE_COUNT_KEY);
        return fallback ? parseInt(fallback, 10) : 0;
      } catch (error) {
        console.error('Failed to get badge count from keychain:', error);
        try {
          const fallback = await AsyncStorage.getItem(BADGE_COUNT_KEY);
          return fallback ? parseInt(fallback, 10) : 0;
        } catch {
          return 0;
        }
      }
    };
    clearBadgeCount = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: BADGE_COUNT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: BADGE_COUNT_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(BADGE_COUNT_KEY);
      } catch { }
    };

    // API endpoint - use keychain with access group for iOS
    saveApiEndpoint = async (endpoint: string) => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
          : { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
        await Keychain.setGenericPassword('endpoint', endpoint, options);
      } catch (error) {
        console.error('Failed to save API endpoint to keychain:', error);
        await AsyncStorage.setItem(API_ENDPOINT_KEY, endpoint);
      }
    };
    getStoredApiEndpoint = async () => {
      try {
        const options: Keychain.GetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: API_ENDPOINT_SERVICE };
        const creds = await Keychain.getGenericPassword(options);
        if (creds) {
          return creds.password;
        }
        const fallback = await AsyncStorage.getItem(API_ENDPOINT_KEY);
        return fallback;
      } catch (error) {
        console.error('Failed to get API endpoint from keychain:', error);
        try {
          const fallback = await AsyncStorage.getItem(API_ENDPOINT_KEY);
          return fallback;
        } catch {
          return null;
        }
      }
    };
    clearApiEndpoint = async () => {
      try {
        const options: Keychain.SetOptions = Device.isDevice
          ? { service: API_ENDPOINT_SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP }
          : { service: API_ENDPOINT_SERVICE };
        await Keychain.resetGenericPassword(options);
      } catch { }
      try {
        await AsyncStorage.removeItem(API_ENDPOINT_KEY);
      } catch { }
    };
  } else {
    // Android - use AsyncStorage (keychain not available)
    savePublicKey = async (publicKey: string) => {
      await AsyncStorage.setItem(PUBLIC_KEY_KEY, publicKey);
    };
    getStoredPublicKey = async () => {
      try {
        return await AsyncStorage.getItem(PUBLIC_KEY_KEY);
      } catch {
        return null;
      }
    };
    clearPublicKey = async () => {
      try {
        await AsyncStorage.removeItem(PUBLIC_KEY_KEY);
      } catch { }
    };

    // Private key - use AsyncStorage for Android
    savePrivateKey = async (privateKey: string) => {
      await AsyncStorage.setItem(PRIVATE_KEY_KEY, privateKey);
    };
    getStoredPrivateKey = async () => {
      try {
        return await AsyncStorage.getItem(PRIVATE_KEY_KEY);
      } catch {
        return null;
      }
    };
    clearPrivateKey = async () => {
      try {
        await AsyncStorage.removeItem(PRIVATE_KEY_KEY);
      } catch { }
    };

    // Pending intents - use AsyncStorage for Android
    savePendingNavigationIntent = async (intent: any) => {
      await AsyncStorage.setItem(PENDING_NAVIGATION_INTENT_KEY, JSON.stringify(intent));
    };
    getPendingNavigationIntent = async () => {
      try {
        const value = await AsyncStorage.getItem(PENDING_NAVIGATION_INTENT_KEY);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    };
    clearPendingNavigationIntent = async () => {
      try {
        await AsyncStorage.removeItem(PENDING_NAVIGATION_INTENT_KEY);
      } catch { }
    };
    savePendingSnoozeIntent = async (intent: any) => {
      await AsyncStorage.setItem(PENDING_SNOOZE_INTENT_KEY, JSON.stringify(intent));
    };
    getPendingSnoozeIntent = async () => {
      try {
        const value = await AsyncStorage.getItem(PENDING_SNOOZE_INTENT_KEY);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    };
    clearPendingSnoozeIntent = async () => {
      try {
        await AsyncStorage.removeItem(PENDING_SNOOZE_INTENT_KEY);
      } catch { }
    };

    // Badge count - use AsyncStorage for Android
    saveBadgeCount = async (count: number) => {
      await AsyncStorage.setItem(BADGE_COUNT_KEY, count.toString());
    };
    getStoredBadgeCount = async () => {
      try {
        const value = await AsyncStorage.getItem(BADGE_COUNT_KEY);
        return value ? parseInt(value, 10) : 0;
      } catch {
        return 0;
      }
    };
    clearBadgeCount = async () => {
      try {
        await AsyncStorage.removeItem(BADGE_COUNT_KEY);
      } catch { }
    };

    // API endpoint - use AsyncStorage for Android
    saveApiEndpoint = async (endpoint: string) => {
      await AsyncStorage.setItem(API_ENDPOINT_KEY, endpoint);
    };
    getStoredApiEndpoint = async () => {
      try {
        return await AsyncStorage.getItem(API_ENDPOINT_KEY);
      } catch {
        return null;
      }
    };
    clearApiEndpoint = async () => {
      try {
        await AsyncStorage.removeItem(API_ENDPOINT_KEY);
      } catch { }
    };
  }
}

export { clearTokens, getAccessToken, getRefreshToken, saveTokens };

/**
 * Terms and conditions management
 */

/**
 * Check if user has accepted the current version of terms
 */
export const hasAcceptedTerms = async (): Promise<boolean> => {
  try {
    const accepted = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    const acceptedVersion = await AsyncStorage.getItem(TERMS_VERSION_KEY);

    return accepted === 'true' && acceptedVersion === CURRENT_TERMS_VERSION;
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    return false;
  }
};

/**
 * Mark terms as accepted for current version
 */
export const acceptTerms = async (): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [TERMS_ACCEPTED_KEY, 'true'],
      [TERMS_VERSION_KEY, CURRENT_TERMS_VERSION],
    ]);
    // Emit event to notify listeners
    termsEventEmitter.emit();
  } catch (error) {
    console.error('Error saving terms acceptance:', error);
    throw error;
  }
};

/**
 * Clear terms acceptance (for logout or terms decline)
 */
export const clearTermsAcceptance = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TERMS_ACCEPTED_KEY, TERMS_VERSION_KEY]);
    // Emit event to notify listeners
    termsEventEmitter.emit();
  } catch (error) {
    console.error('Error clearing terms acceptance:', error);
    throw error;
  }
};

/**
 * Subscribe to terms acceptance changes
 */
export const subscribeToTermsChanges = (listener: () => void): (() => void) => {
  return termsEventEmitter.subscribe(listener);
};

/**
 * Get current terms version
 */
export const getCurrentTermsVersion = (): string => {
  return CURRENT_TERMS_VERSION;
};

// Current version of terms (update this when terms change)
const CURRENT_TERMS_VERSION = '1.0.0';

/**
 * Key pair management utilities
 */

/**
 * Check if both public and private keys are stored
 */
export const hasKeyPair = async (): Promise<boolean> => {
  try {
    const publicKey = await getStoredPublicKey();
    const privateKey = await getStoredPrivateKey();
    return !!(publicKey && privateKey);
  } catch (error) {
    console.error('Error checking key pair:', error);
    return false;
  }
};

/**
 * Clear both public and private keys
 */
export const clearKeyPair = async (): Promise<void> => {
  try {
    await Promise.all([
      clearPublicKey(),
      clearPrivateKey()
    ]);
  } catch (error) {
    console.error('Error clearing key pair:', error);
  }
};

/**
 * Get both stored keys
 */
export const getStoredKeyPair = async (): Promise<{ publicKey: string | null; privateKey: string | null }> => {
  try {
    const [publicKey, privateKey] = await Promise.all([
      getStoredPublicKey(),
      getStoredPrivateKey()
    ]);
    return { publicKey, privateKey };
  } catch (error) {
    console.error('Error getting key pair:', error);
    return { publicKey: null, privateKey: null };
  }
};

export const clearAllAuthData = async (): Promise<void> => {
  try {
    await Promise.all([
      clearTokens(),
      clearDeviceTokens(),
      clearLastUserId(),
      clearKeyPair(),
      clearTermsAcceptance(),
      clearPushNotificationsInitialized()
    ]);
  } catch (error) {
    console.error('Error clearing all auth data:', error);
    throw error;
  }
};

