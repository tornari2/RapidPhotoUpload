import apiClient from './api';
import type {
  TagPhotoRequest,
  TagPhotoResponse,
  BulkTagPhotosRequest,
  BulkTagPhotosResponse,
} from '../types/tag';
import { retryApiCall } from '../utils/retryUtils';

/**
 * Service for tag-related API calls
 */
export const tagService = {
  /**
   * Tag a single photo with one or more tags
   */
  async tagPhoto(request: TagPhotoRequest): Promise<TagPhotoResponse> {
    return retryApiCall(async () => {
      const response = await apiClient.post<TagPhotoResponse>('/photos/tag', request);
      return response.data;
    });
  },

  /**
   * Bulk tag multiple photos with the same set of tags
   */
  async bulkTagPhotos(request: BulkTagPhotosRequest): Promise<BulkTagPhotosResponse> {
    return retryApiCall(async () => {
      const response = await apiClient.post<BulkTagPhotosResponse>('/photos/bulk-tag', request);
      return response.data;
    });
  },
};

