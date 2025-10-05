import { Platform } from 'react-native';
import * as ExpoFileSystem from 'expo-file-system';
import { MediaCacheRepository } from '../services/media-cache-repository';
import { ApiConfigService } from '../services/api-config';
import { getAccessToken } from '../services/auth-storage';

// Helper function to get API credentials (similar to service worker)
async function getApiCredentials(): Promise<{ apiEndpoint: string; authToken: string } | null> {
  try {
    // For web/mobile, we need to get the auth token from storage
    const authToken = await getAccessToken();
    const apiEndpoint = ApiConfigService.getApiBaseWithPrefix();

    if (!authToken) {
      console.warn('[WebFS] No auth token available for proxy request');
      return null;
    }

    return { apiEndpoint, authToken };
  } catch (error) {
    console.error('[WebFS] Failed to get API credentials:', error);
    return null;
  }
}

const isWeb = Platform.OS === 'web';

// Singleton MediaCacheRepository for web file operations
let webRepo: MediaCacheRepository | null = null;

async function getWebRepo(): Promise<MediaCacheRepository> {
  if (!webRepo) {
    webRepo = await MediaCacheRepository.create();
  }
  return webRepo;
}

// Web File class implementation using IndexedDB via MediaCacheRepository
class WebFile {
  private path: string;
  private _exists: boolean = false;
  private _size: number = 0;
  private _checked: boolean = false;

  constructor(path: string) {
    this.path = path;
    // For web, we'll use the path as the key for media_item table
    // The actual file content will be stored in media_item table
  }

  get exists(): boolean {
    if (!this._checked) {
      this.checkExistence();
    }
    return this._exists;
  }

  get size(): number {
    if (!this._checked) {
      this.checkExistence();
    }
    return this._size;
  }

  private async checkExistence(): Promise<void> {
    if (!isWeb || this._checked) return;

    try {
      const repo = await getWebRepo();
      const item = await repo.getMediaItem(this.path);
      if (item) {
        this._exists = true;
        this._size = item.data.byteLength;
      } else {
        this._exists = false;
        this._size = 0;
      }
    } catch (error) {
      console.warn('[WebFS] Failed to check file existence:', error);
      this._exists = false;
      this._size = 0;
    }
    this._checked = true;
  }

  async delete(): Promise<void> {
    if (!isWeb) return;

    try {
      const repo = await getWebRepo();
      await repo.deleteMediaItem(this.path);
      this._exists = false;
      this._size = 0;
      this._checked = true; // Mark as checked since we know it doesn't exist now
    } catch (error) {
      console.warn('[WebFS] Failed to delete file:', error);
      throw error;
    }
  }

  async copy(destination: WebFile): Promise<void> {
    if (!isWeb) return;

    try {
      const repo = await getWebRepo();
      const sourceItem = await repo.getMediaItem(this.path);
      if (sourceItem) {
        await repo.saveMediaItem({
          key: destination.path,
          data: sourceItem.data,
        });
        // Update destination state
        destination._exists = true;
        destination._size = sourceItem.data.byteLength;
        destination._checked = true;
      }
    } catch (error) {
      console.warn('[WebFS] Failed to copy file:', error);
      throw error;
    }
  }

  static async downloadFileAsync(url: string, file: WebFile): Promise<{ uri: string; size?: number }> {
    if (!isWeb) {
      // Fallback to expo-file-system for non-web platforms
      return ExpoFileSystem.downloadAsync(url, file.path);
    }

    try {
      // Use backend proxy to fetch media (bypasses CORS)
      const credentials = await getApiCredentials();
      if (!credentials) {
        throw new Error('No API credentials available for proxy request');
      }

      const proxyUrl = `${credentials.apiEndpoint}/attachments/proxy-media?url=${encodeURIComponent(url)}`;
      console.log(`[WebFS] Using backend proxy for download: ${proxyUrl}`);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.authToken}`,
          'Accept': 'image/*,video/*,audio/*,*/*',
          'User-Agent': 'Zentik-Notifier-Web/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend proxy failed: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer]);

      const repo = await getWebRepo();
      // Save to media_item table using MediaCacheRepository
      await repo.saveMediaItem({
        key: file.path,
        data: arrayBuffer,
      });

      file._exists = true;
      file._size = blob.size;

      return {
        uri: file.path,
        size: blob.size
      };
    } catch (proxyError) {
      console.warn(`[WebFS] Backend proxy failed, trying direct fetch:`, proxyError);

      try {
        // Fallback to direct fetch if proxy fails
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer]);

        const repo = await getWebRepo();
        // Save to media_item table using MediaCacheRepository
        await repo.saveMediaItem({
          key: file.path,
          data: arrayBuffer,
        });

        file._exists = true;
        file._size = blob.size;

        return {
          uri: file.path,
          size: blob.size
        };
      } catch (directError) {
        console.error('[WebFS] Both proxy and direct download failed:', {
          proxyError,
          directError
        });
        throw proxyError; // Throw the original proxy error
      }
    }
  }

  // Force refresh of file state from database
  async refresh(): Promise<void> {
    this._checked = false;
    // Accessing exists/size will trigger checkExistence()
  }
}

// Web Directory class implementation using IndexedDB
class WebDirectory {
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  get exists(): boolean {
    // For web directories, we can check if there are any files with this path prefix
    // This is a simplified implementation
    return true; // For now, assume directories exist if they're referenced
  }

  async create(): Promise<void> {
    // For web, directory creation is implicit - we don't need to explicitly create directories
    // The directory structure is managed through the file paths in media_item keys
    return;
  }

  async delete(): Promise<void> {
    if (!isWeb) return;

    // For web, deleting a directory means deleting all files that start with this path
    // This is a simplified implementation
    console.log('[WebFS] Directory deletion not fully implemented for web');
  }
}

// Export the appropriate classes based on platform
export const File = isWeb ? WebFile : ExpoFileSystem.File;
export const Directory = isWeb ? WebDirectory : ExpoFileSystem.Directory;

// Export download method
export const downloadFileAsync = isWeb
  ? WebFile.downloadFileAsync
  : ExpoFileSystem.downloadAsync;
