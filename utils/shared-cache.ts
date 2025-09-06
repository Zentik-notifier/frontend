import * as FS from 'expo-file-system';
import { Paths } from 'expo-file-system/next';
import { Platform } from 'react-native';


function normalizeSharedUri(uri: string): string {
  if (uri.startsWith('file:///var/')) {
    return uri.replace('file:///var/', 'file:///private/var/');
  }
  return uri;
}

/**
 * Gets the shared media cache directory that can be accessed by the main app and extensions.
 * Uses App Groups shared container on iOS for cross-process access.
 */
let cachedSharedDirectory: string | null = null;

export function getSharedMediaCacheDirectory(): string {
  if (Platform.OS === 'web') {
    return '';
  }

  if (Platform.OS === 'ios') {
    if (cachedSharedDirectory) {
      return cachedSharedDirectory;
    }
    return `${FS.documentDirectory}shared_media_cache/`;
  }
  return `${FS.documentDirectory}media_cache/`;
}

export async function getSharedMediaCacheDirectoryAsync(): Promise<string> {
  if (Platform.OS === 'web') {
    return '';
  }

  if (Platform.OS === 'ios') {
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        const containers = Paths.appleSharedContainers;
        const firstContainer = Object.values(containers)?.[0];
        if (firstContainer) {
          const baseUri = (firstContainer as any).uri as string;
          const normalizedBase = normalizeSharedUri(baseUri);
          const mediaDir = `${normalizedBase}shared_media_cache/`;
          const info = await FS.getInfoAsync(mediaDir);
          if (!info.exists) {
            await FS.makeDirectoryAsync(mediaDir, { intermediates: true });
          }
          const uri = normalizeSharedUri(mediaDir);
          cachedSharedDirectory = uri;
          return cachedSharedDirectory;
        }
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (error) {
      console.warn('[SharedCache] Native module not available, using fallback:', error);
    }
    const fallbackPath = `${FS.documentDirectory}shared_media_cache/`;
    console.warn('[SharedCache] Falling back to documents directory for shared cache:', fallbackPath);
    cachedSharedDirectory = fallbackPath;
    return fallbackPath;
  }
  return `${FS.documentDirectory}media_cache/`;
}

export const getMetadataDirectory = async (): Promise<string> => {
  const sharedCacheDir = await getSharedMediaCacheDirectoryAsync();
  const metadataFilePath = `${sharedCacheDir}metadata.json`;

  return metadataFilePath;
}