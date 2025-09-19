import { Directory, Paths } from 'expo-file-system';
import { Platform, NativeModules } from 'react-native';


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

export async function getSharedMediaCacheDirectoryAsync(): Promise<string> {
  if (Platform.OS === 'web') {
    const dir = new Directory(Paths.document);
    if (!dir.exists) {
      dir.create();
    }
    return dir.uri;
  }

  if (Platform.OS === 'ios') {
    // 1) Try native module (matches the same App Group logic as extensions)
    try {
      const nativePath: string | undefined = await NativeModules?.SharedContainer?.getSharedMediaCacheDirectory?.();
      if (nativePath) {
        // Ensure file:// prefix and trailing slash
        const withScheme = nativePath.startsWith('file://') ? nativePath : `file://${nativePath}`;
        const normalized = normalizeSharedUri(withScheme.endsWith('/') ? withScheme : withScheme + '/');
        const dir = new Directory(normalized);
        if (!dir.exists) {
          dir.create();
        }
        cachedSharedDirectory = normalized;
        return normalized;
      }
    } catch (error) {
      console.warn('[SharedCache] Native SharedContainer not available, falling back:', error);
    }

    // 2) Fallback: use expo-file-system shared containers enumeration
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        const containers = Paths.appleSharedContainers;
        const firstContainer = Object.values(containers)?.[0];
        if (firstContainer) {
          const baseUri = (firstContainer as any).uri as string;
          const normalizedBase = normalizeSharedUri(baseUri);
          const mediaDir = `${normalizedBase}shared_media_cache/`;
          const dir = new Directory(mediaDir);
          if (!dir.exists) {
            dir.create();
          }
          const uri = normalizeSharedUri(mediaDir);
          cachedSharedDirectory = uri;
          return cachedSharedDirectory;
        }
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (error) {
      console.warn('[SharedCache] Expo shared containers not available, using fallback:', error);
    }
    const fallbackPath = `${Paths.document.uri}shared_media_cache/`;
    console.warn('[SharedCache] Falling back to documents directory for shared cache:', fallbackPath);
    cachedSharedDirectory = fallbackPath;
    return fallbackPath;
  }

  return `${Paths.document.uri}media_cache/`;
}