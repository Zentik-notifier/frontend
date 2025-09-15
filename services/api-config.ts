import AsyncStorage from 'expo-sqlite/kv-store';
import { saveApiEndpoint } from './auth-storage';

const CUSTOM_API_URL_KEY = 'custom_api_url';
const apiPrefix = 'api/v1';
const envApiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://notifier-api.zentik.app';

export class ApiConfigService {
  private static customApiUrl: string | null = null;
  private static initialized = false;

  /**
   * Initialize the service by loading the custom API URL from storage
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storedUrl = await AsyncStorage.getItem(CUSTOM_API_URL_KEY);
      this.customApiUrl = storedUrl || null;
      this.initialized = true;

      // Also save the current API URL to keychain for NSE access
      const currentApiUrl = await this.getApiUrl();
      await saveApiEndpoint(currentApiUrl);
    } catch (error) {
      console.error('Failed to initialize API config service:', error);
      this.customApiUrl = null;
      this.initialized = true;
    }
  }

  /**
   * Get the API base URL - either custom or default from env
   */
  static async getApiUrl(): Promise<string> {
    await this.initialize();

    // If custom URL is set and not empty, use it
    if (this.customApiUrl && this.customApiUrl.trim() !== '') {
      return this.customApiUrl.trim();
    }

    // Otherwise use the default from environment
    return envApiUrl;
  }

  /**
   * Get the API base URL synchronously (only works after initialization)
   */
  static getApiUrlSync(): string {
    if (!this.initialized) {
      return this.customApiUrl || envApiUrl;
    }

    // If custom URL is set and not empty, use it
    if (this.customApiUrl && this.customApiUrl.trim() !== '') {
      return this.customApiUrl.trim();
    }

    // Otherwise use the default from environment
    return envApiUrl;
  }

  static getApiBaseWithPrefix(): string {
    const base = this.getApiUrlSync().replace(/\/$/, '');
    const prefix = apiPrefix.replace(/^\/+|\/+$/g, '');
    return `${base}/${prefix}`;
  }

  /**
   * Set a custom API URL
   */
  static async setCustomApiUrl(url: string): Promise<void> {
    try {
      const trimmedUrl = url.trim();
      await AsyncStorage.setItem(CUSTOM_API_URL_KEY, trimmedUrl);
      this.customApiUrl = trimmedUrl;

      // Also save to keychain for NSE access
      const currentApiUrl = await this.getApiUrl();
      await saveApiEndpoint(currentApiUrl);
    } catch (error) {
      console.error('Failed to save custom API URL:', error);
      throw error;
    }
  }

  /**
   * Get the current custom API URL (may be empty string)
   */
  static async getCustomApiUrl(): Promise<string> {
    await this.initialize();
    return this.customApiUrl || '';
  }

  /**
   * Clear the custom API URL and revert to default
   */
  static async clearCustomApiUrl(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CUSTOM_API_URL_KEY);
      this.customApiUrl = null;
    } catch (error) {
      console.error('Failed to clear custom API URL:', error);
      throw error;
    }
  }

  /**
   * Check if a custom API URL is currently set
   */
  static hasCustomApiUrl(): boolean {
    return this.customApiUrl !== null && this.customApiUrl.trim() !== '';
  }
}
