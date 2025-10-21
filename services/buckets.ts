import { Platform } from 'react-native';
import { settingsService } from './settings-service';

export interface UploadBucketIconResponse {
    icon: string;
    id: string;
    name: string;
}

export const uploadBucketIcon = async (
    imageUri: string,
    filename: string = 'icon.jpg'
): Promise<string> => {
    const apiUrl = await settingsService.getApiUrl();
    const url = `${apiUrl}/api/v1/attachments/upload`;

    const token = settingsService.getAuthData().accessToken;
    if (!token) {
        throw new Error('No authentication token found');
    }

    const formData = new FormData();
    
    // On web, we need to fetch the image and create a proper File object
    if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });
        formData.append('file', file);
    } else {
        // On native (iOS/Android), use the React Native format
        formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
        } as any);
    }
    
    formData.append('filename', `bucket-icon-${Date.now()}`);
    formData.append('mediaType', 'ICON');

    const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const attachment = await uploadResponse.json();

    return `${apiUrl}/api/v1/attachments/${attachment.id}/download/public`;
};
