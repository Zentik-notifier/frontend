import { BehaviorSubject } from "rxjs";
import * as Keychain from "react-native-keychain";
import * as Device from "expo-device";
import { Platform } from "react-native";

const IS_SELF_HOSTED = process.env.EXPO_PUBLIC_SELFHOSTED === "true";
const DEFAULT_API_URL =
  IS_SELF_HOSTED && typeof window !== "undefined"
    ? (window as any).location?.origin
    : (process.env.EXPO_PUBLIC_API_URL || "https://notifier-api.zentik.app");

const SERVICE = "zentik-auth";
const API_ENDPOINT_SERVICE = "zentik-api-endpoint";

const bundleIdentifier =
  process.env.EXPO_PUBLIC_APP_VARIANT === "development"
    ? "com.apocaliss92.zentik.dev"
    : "com.apocaliss92.zentik";
const KEYCHAIN_ACCESS_GROUP = `C3F24V5NS5.${bundleIdentifier}.keychain`;
const ACCESSIBLE = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK;

export interface ShareAuthData {
  accessToken: string | null;
  refreshToken: string | null;
  apiEndpoint: string | null;
}

const defaultAuthData: ShareAuthData = {
  accessToken: null,
  refreshToken: null,
  apiEndpoint: null,
};

class ShareExtensionService {
  private authDataSubject = new BehaviorSubject<ShareAuthData>(defaultAuthData);
  private initializedSubject = new BehaviorSubject<boolean>(false);
  private refreshPromise: Promise<string | null> | null = null;

  readonly isInitialized$ = this.initializedSubject.asObservable();

  async initialize(): Promise<void> {
    try {
      const [auth, apiEndpoint] = await Promise.all([
        this.loadAuthFromKeychain(),
        this.loadApiEndpointFromKeychain(),
      ]);
      this.authDataSubject.next({
        ...auth,
        apiEndpoint: apiEndpoint ?? DEFAULT_API_URL,
      });
    } catch (e) {
      this.authDataSubject.next({
        ...defaultAuthData,
        apiEndpoint: DEFAULT_API_URL,
      });
    } finally {
      this.initializedSubject.next(true);
    }
  }

  private keychainOptions(): Keychain.SetOptions {
    if (Platform.OS !== "ios" && Platform.OS !== "macos") {
      return { service: SERVICE, accessible: ACCESSIBLE };
    }
    return Device.isDevice
      ? { service: SERVICE, accessGroup: KEYCHAIN_ACCESS_GROUP, accessible: ACCESSIBLE }
      : { service: SERVICE, accessible: ACCESSIBLE };
  }

  private apiKeychainOptions(): Keychain.SetOptions {
    if (Platform.OS !== "ios" && Platform.OS !== "macos") {
      return { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
    }
    return Device.isDevice
      ? {
          service: API_ENDPOINT_SERVICE,
          accessGroup: KEYCHAIN_ACCESS_GROUP,
          accessible: ACCESSIBLE,
        }
      : { service: API_ENDPOINT_SERVICE, accessible: ACCESSIBLE };
  }

  private async loadAuthFromKeychain(): Promise<Pick<ShareAuthData, "accessToken" | "refreshToken">> {
    try {
      const opts = this.keychainOptions();
      const creds = await Keychain.getGenericPassword(opts);
      if (creds) {
        return {
          accessToken: creds.username,
          refreshToken: creds.password,
        };
      }
    } catch {
      // ignore
    }
    return { accessToken: null, refreshToken: null };
  }

  private async loadApiEndpointFromKeychain(): Promise<string | null> {
    try {
      const opts = this.apiKeychainOptions();
      const creds = await Keychain.getGenericPassword(opts);
      if (creds !== false && creds.username === "api" && creds.password) {
        return creds.password.trim() || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  getApiUrl(): string {
    const endpoint = this.authDataSubject.value.apiEndpoint;
    if (endpoint?.trim()) return endpoint.trim();
    return DEFAULT_API_URL;
  }

  getAuthData(): ShareAuthData {
    return this.authDataSubject.value;
  }

  getCustomScheme(): string {
    return process.env.EXPO_PUBLIC_APP_VARIANT === "development" ? "zentik.dev" : "zentik";
  }

  private decodeJWT(token: string): { exp?: number } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = parts[1];
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string, bufferSeconds = 30): boolean {
    const decoded = this.decodeJWT(token);
    if (!decoded?.exp) return true;
    return Math.floor(Date.now() / 1000) >= decoded.exp - bufferSeconds;
  }

  async ensureValidToken(): Promise<string | null> {
    const { accessToken, refreshToken } = this.authDataSubject.value;
    if (!accessToken) return null;
    if (!this.isTokenExpired(accessToken)) return accessToken;

    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        if (!refreshToken) return null;
        const url = `${this.getApiUrl()}/api/v1/auth/refresh`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const newAccess = data?.accessToken;
        const newRefresh = data?.refreshToken;
        if (!newAccess || !newRefresh) return null;

        const opts = this.keychainOptions();
        await Keychain.setGenericPassword(newAccess, newRefresh, opts);
        this.authDataSubject.next({
          ...this.authDataSubject.value,
          accessToken: newAccess,
          refreshToken: newRefresh,
        });
        return newAccess;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

export const shareExtensionService = new ShareExtensionService();
shareExtensionService.initialize();
