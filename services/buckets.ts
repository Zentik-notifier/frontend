import { ApiConfigService } from './api-config';

export interface UploadBucketIconResponse {
  iconUrl: string;
}

export const uploadBucketIcon = async (
  bucketId: string,
  formData: FormData
): Promise<UploadBucketIconResponse> => {
  const apiUrl = await ApiConfigService.getApiUrl();
  const url = `${apiUrl}/api/v1/buckets/${bucketId}/upload-icon`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type, let fetch set it automatically with boundary
    },
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};
