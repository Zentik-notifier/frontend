import { File } from "expo-file-system";
import { Platform } from "react-native";
import { getSharedMediaCacheDirectoryAsync } from "@/utils/shared-cache";

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
