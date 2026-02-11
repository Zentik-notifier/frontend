import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

function normalizeSharedUri(uri: string): string {
  if (uri.startsWith("file:///var/")) {
    return uri.replace("file:///var/", "file:///private/var/");
  }
  return uri;
}

let cachedSharedDirectory: string | null = null;

async function getSharedMediaCacheDirectoryAsync(): Promise<string> {
  if (Platform.OS === "web") {
    const dir = new Directory(Paths.document);
    if (!dir.exists) dir.create();
    return dir.uri;
  }

  if (Platform.OS === "ios" || Platform.OS === "macos") {
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        const containers = Paths.appleSharedContainers;
        const firstContainer = Object.values(containers)?.[0];
        if (firstContainer) {
          const baseUri = (firstContainer as { uri: string }).uri;
          const normalizedBase = normalizeSharedUri(baseUri);
          const mediaDir = `${normalizedBase}shared_media_cache/`;
          const dir = new Directory(mediaDir);
          if (!dir.exists) dir.create();
          cachedSharedDirectory = normalizeSharedUri(mediaDir);
          return cachedSharedDirectory;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch {
      // fallback
    }
    const fallbackPath = `${Paths.document.uri}shared_media_cache/`;
    cachedSharedDirectory = fallbackPath;
    return fallbackPath;
  }

  return `${Paths.document.uri}media_cache/`;
}

/**
 * Get bucket icon URI from shared cache only (no download).
 * ShareExtension-specific: reads icons already cached by the main app.
 * Uses only expo-file-system — no media-cache-service / expo-image-manipulator.
 */
export async function getBucketIconFromCacheOnly(
  bucketId: string,
  _bucketName: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const sharedCacheDir = await getSharedMediaCacheDirectoryAsync();
    const bucketIconDir = `${sharedCacheDir}BUCKET_ICON/`;
    const fileName = `${bucketId}.png`;
    const fileUri = `${bucketIconDir}${fileName}`;
    const file = new File(fileUri);
    if (file.exists) {
      return `${fileUri}?t=${Date.now()}`;
    }
    return null;
  } catch {
    return null;
  }
}
