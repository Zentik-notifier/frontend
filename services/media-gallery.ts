import { MediaType } from '@/generated/gql-operations-generated';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';
import { mediaCache } from './media-cache';

export async function saveMediaToGallery(
	url: string,
	mediaType: MediaType,
	originalFileName?: string,
	options?: { silent?: boolean; skipPermissionCheck?: boolean }
): Promise<boolean> {
	try {
		// Ensure we have a local file to save
		const item = await mediaCache.getCachedItem(url, mediaType);
		const localPath = item?.localPath;

		if (!localPath) {
			if (!options?.silent) Alert.alert('Error', 'Unable to prepare media for saving');
			return false;
		}

		// Request permission (unless skipped)
		if (!options?.skipPermissionCheck) {
			const perm = await MediaLibrary.requestPermissionsAsync();
			if (!perm.granted) {
				if (!options?.silent) Alert.alert('Permission required', 'Storage permission is required to save media to gallery');
				return false;
			}
		}

		// Validate file exists
		const file = new File(localPath);
		if (!file.exists) {
			if (!options?.silent) Alert.alert('Error', 'Local media file not found');
			return false;
		}

		const asset = await MediaLibrary.createAssetAsync(localPath);
		try {
			const albumName = 'Zentik';
			let album = await MediaLibrary.getAlbumAsync(albumName);
			if (!album) {
				album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
			} else {
				await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
			}
		} catch { }

		return true;
	} catch (e) {
		if (!options?.silent) Alert.alert('Error', 'Failed to save media to gallery');
		return false;
	}
}


