import apiClient from './api';
import type { Tag } from '../types';

/**
 * Service for handling tag operations
 */
export const tagService = {
  /**
   * Add tags to a photo
   * Backend expects: POST /api/photos/tag with { photoId, userId, tagNames }
   */
  async tagPhoto(photoId: string, userId: string, tags: string[]): Promise<void> {
    try {
      await apiClient.post(`/api/photos/tag`, {
        photoId,
        userId,
        tagNames: tags,
      });
    } catch (error: any) {
      console.error('Failed to tag photo:', error);
      throw new Error(error.response?.data?.message || 'Failed to tag photo');
    }
  },

  /**
   * Bulk tag multiple photos
   * Backend expects: POST /api/photos/bulk-tag with { userId, photoIds, tagNames }
   */
  async bulkTagPhotos(photoIds: string[], userId: string, tags: string[]): Promise<void> {
    try {
      await apiClient.post(`/api/photos/bulk-tag`, {
        userId,
        photoIds,
        tagNames: tags,
      });
    } catch (error: any) {
      console.error('Failed to bulk tag photos:', error);
      throw new Error(error.response?.data?.message || 'Failed to tag photos');
    }
  },

  /**
   * Remove tags from a photo
   */
  async removeTags(photoId: string, tagIds: string[]): Promise<void> {
    try {
      await apiClient.delete(`/api/photos/${photoId}/tags`, {
        data: { tagIds },
      });
    } catch (error: any) {
      console.error('Failed to remove tags:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove tags');
    }
  },

  /**
   * Get all tags for a user
   * Note: This endpoint may not exist on the backend. Returns empty array if 404.
   */
  async getUserTags(): Promise<Tag[]> {
    try {
      const response = await apiClient.get<Tag[]>('/api/tags');
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist (404), return empty array instead of throwing
      if (error.response?.status === 404) {
        console.log('Tags endpoint not available, returning empty array');
        return [];
      }
      console.error('Failed to get user tags:', error);
      // For other errors, still return empty array to not break the app
      return [];
    }
  },
};

