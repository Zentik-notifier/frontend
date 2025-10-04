import { Platform } from 'react-native';
import * as ExpoFileSystem from 'expo-file-system';
import { MediaCacheRepository } from '../services/media-cache-repository';

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

  constructor(path: string) {
    this.path = path;
    // For web, we'll use the path as the key for media_item table
    // The actual file content will be stored in media_item table
  }

  get exists(): boolean {
    return this._exists;
  }

  get size(): number {
    return this._size;
  }

  async delete(): Promise<void> {
    if (!isWeb) return;

    try {
      const repo = await getWebRepo();
      await repo.deleteMediaItem(this.path);
      this._exists = false;
      this._size = 0;
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
        destination._exists = true;
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
    } catch (error) {
      console.error('[WebFS] Download failed:', error);
      throw error;
    }
  }

  private getMediaTypeFromPath(): string {
    // Extract media type from path (e.g., "IMAGE/file.jpg" -> "IMAGE")
    const parts = this.path.split('/');
    if (parts.length > 0) {
      const filename = parts[parts.length - 1];
      const typePart = filename.split('_')[0];
      return typePart || 'UNKNOWN';
    }
    return 'UNKNOWN';
  }

  private getFileNameFromPath(): string | undefined {
    const parts = this.path.split('/');
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
    return undefined;
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

// Enhanced IS_FS_SUPPORTED that includes web support
export const IS_FS_SUPPORTED = true; // Enable support for both web and mobile
