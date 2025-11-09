import apiClient from './api';
import type { Photo } from '../types';

export interface DownloadUrlResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}

/**
 * Service for handling photo download operations
 */
export const downloadService = {
  /**
   * Get presigned download URL for a photo
   */
  async getDownloadUrl(
    photoId: string,
    userId: string,
    expirationMinutes: number = 60
  ): Promise<DownloadUrlResponse> {
    try {
      console.log(`Requesting download URL for photo ${photoId}, user ${userId}`);
      
      const response = await apiClient.get<DownloadUrlResponse>(
        `/api/photos/${photoId}/download`,
        {
          params: {
            userId,
            expirationMinutes,
          },
        }
      );
      
      // Validate response
      if (!response.data || !response.data.downloadUrl) {
        console.error('Invalid download URL response:', response.data);
        throw new Error('Invalid download URL response from server');
      }
      
      // Log URL (first 100 chars only for security)
      const urlPreview = response.data.downloadUrl.substring(0, 100);
      console.log(`Received download URL: ${urlPreview}...`);
      
      // Validate URL format
      if (!response.data.downloadUrl.startsWith('http://') && 
          !response.data.downloadUrl.startsWith('https://')) {
        console.error('Invalid URL format:', response.data.downloadUrl);
        throw new Error('Invalid download URL format');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to get download URL:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(
        error.response?.data?.message || 'Failed to get download URL'
      );
    }
  },
};

