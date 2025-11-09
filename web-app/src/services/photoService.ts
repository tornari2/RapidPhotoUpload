import apiClient from './api';
import type {
  GetUserPhotosResponse,
  GetUserPhotosParams,
  DownloadPhotoResponse,
  PhotoMetadataResponse,
} from '../types/photo';
import { retryApiCall } from '../utils/retryUtils';

/**
 * Service for photo-related API calls
 */
export const photoService = {
  /**
   * Get photos for a user with optional filtering and pagination
   */
  async getUserPhotos(params: GetUserPhotosParams): Promise<GetUserPhotosResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', params.userId);
    
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.uploadJobId) {
      queryParams.append('uploadJobId', params.uploadJobId);
    }
    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params.size !== undefined) {
      queryParams.append('size', params.size.toString());
    }
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      queryParams.append('sortDirection', params.sortDirection);
    }

    return retryApiCall(async () => {
      const response = await apiClient.get<GetUserPhotosResponse>(
        `/photos?${queryParams.toString()}`
      );
      return response.data;
    });
  },

  /**
   * Get a presigned download URL for a photo
   */
  async getDownloadUrl(
    photoId: string,
    userId: string,
    expirationMinutes?: number
  ): Promise<DownloadPhotoResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);
    if (expirationMinutes !== undefined) {
      queryParams.append('expirationMinutes', expirationMinutes.toString());
    }

    return retryApiCall(async () => {
      const response = await apiClient.get<DownloadPhotoResponse>(
        `/photos/${photoId}/download?${queryParams.toString()}`
      );
      return response.data;
    });
  },

  /**
   * Get detailed metadata for a specific photo
   */
  async getPhotoMetadata(
    photoId: string,
    userId: string,
    includeDownloadUrl = true,
    includeTags = true
  ): Promise<PhotoMetadataResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);
    queryParams.append('includeDownloadUrl', includeDownloadUrl.toString());
    queryParams.append('includeTags', includeTags.toString());

    return retryApiCall(async () => {
      const response = await apiClient.get<PhotoMetadataResponse>(
        `/photos/${photoId}/metadata?${queryParams.toString()}`
      );
      return response.data;
    });
  },

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string, userId: string): Promise<void> {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);

    return retryApiCall(async () => {
      await apiClient.delete(`/photos/${photoId}?${queryParams.toString()}`);
    });
  },
};

