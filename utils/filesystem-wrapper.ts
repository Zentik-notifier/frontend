import { Platform } from 'react-native';
import * as ExpoFileSystem from 'expo-file-system';
import { MediaCacheRepository } from '../services/media-cache-repository';
import { settingsService } from '../services/settings-service';

// Helper function to get API credentials (similar to service worker)
async function getApiCredentials(): Promise<{ apiEndpoint: string; authToken: string } | null> {
  try {
    // For web/mobile, we need to get the auth token from storage
    const authToken = settingsService.getAuthData().accessToken;
    const apiEndpoint = settingsService.getApiBaseWithPrefix();

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

  static async downloadAsync(url: string, fileOrPath: WebFile | string): Promise<{ uri: string; size?: number }> {
    if (!isWeb) {
      // This should never happen as WebFile is only used on web
      const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
      return ExpoFileSystem.downloadAsync(url, filePath);
    }

    const webFile = typeof fileOrPath === 'string' ? new WebFile(fileOrPath) : fileOrPath;

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
        key: webFile.path,
        data: arrayBuffer,
      });

      webFile._exists = true;
      webFile._size = blob.size;

      return {
        uri: webFile.path,
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
          key: webFile.path,
          data: arrayBuffer,
        });

        webFile._exists = true;
        webFile._size = blob.size;

        return {
          uri: webFile.path,
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

  // Read file content as string (for web, reads from IndexedDB)
  async read(): Promise<string | null> {
    if (!isWeb) return null;

    try {
      const repo = await getWebRepo();
      const item = await repo.getMediaItem(this.path);
      if (item) {
        // Convert ArrayBuffer to string
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(item.data);
      }
      return null;
    } catch (error) {
      console.warn('[WebFS] Failed to read file:', error);
      return null;
    }
  }

  // Write string or binary content to file (for web, writes to IndexedDB)
  async write(content: string | Uint8Array, options?: any): Promise<void> {
    if (!isWeb) return;

    try {
      let arrayBuffer: ArrayBuffer;
      
      if (typeof content === 'string') {
        // Convert string to ArrayBuffer
        const encoder = new TextEncoder();
        arrayBuffer = encoder.encode(content).buffer;
      } else {
        // Uint8Array - use its buffer
        arrayBuffer = content.buffer;
      }

      const repo = await getWebRepo();
      await repo.saveMediaItem({
        key: this.path,
        data: arrayBuffer,
      });

      this._exists = true;
      this._size = arrayBuffer.byteLength;
      this._checked = true;
    } catch (error) {
      console.warn('[WebFS] Failed to write file:', error);
      throw error;
    }
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

  async list() {
    return [];
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

// Wrapper for native File with async read/write methods
class NativeFileWrapper {
  private file: any;

  constructor(path: string) {
    this.file = new ExpoFileSystem.File(path);
  }

  get exists(): boolean {
    return this.file.exists;
  }

  get size(): number {
    return this.file.size;
  }

  get path(): string {
    return this.file.uri;
  }

  async delete(): Promise<void> {
    if (this.exists) {
      await this.file.delete();
    }
  }

  async copy(destination: NativeFileWrapper): Promise<void> {
    await this.file.copy(destination.file);
  }

  async read(): Promise<string | null> {
    try {
      if (!this.exists) return null;
      return await this.file.text();
    } catch (error) {
      console.warn('[NativeFS] Failed to read file:', error);
      return null;
    }
  }

  async write(content: string | Uint8Array, options?: any): Promise<void> {
    try {
      await this.file.write(content, options);
    } catch (error) {
      console.warn('[NativeFS] Failed to write file:', error);
      throw error;
    }
  }

  static async downloadAsync(url: string, fileOrPath: NativeFileWrapper | string): Promise<{ uri: string; size?: number }> {
    const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
    const file = new ExpoFileSystem.File(filePath);
    return await ExpoFileSystem.File.downloadFileAsync(url, file);
  }
}

// Export the appropriate classes based on platform
export const File = isWeb ? WebFile : NativeFileWrapper;
export const Directory = isWeb ? WebDirectory : ExpoFileSystem.Directory;
