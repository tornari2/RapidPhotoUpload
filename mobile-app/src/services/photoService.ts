import apiClient from './api';
import type { Photo, PaginatedResponse } from '../types';

/**
 * Service for handling photo operations
 */
export const photoService = {
  /**
   * Get user photos with pagination
   */
  async getUserPhotos(
    userId: string,
    page: number = 0,
    size: number = 20
  ): Promise<PaginatedResponse<Photo>> {
    try {
      const response = await apiClient.get<{
        photos: Photo[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      }>(
        `/api/photos`,
        {
          params: {
            userId,
            page,
            size,
          },
        }
      );
      
      // Map backend response format to frontend format
      return {
        content: response.data.photos || [],
        page: response.data.page,
        size: response.data.size,
        totalElements: response.data.totalElements,
        totalPages: response.data.totalPages,
        last: !response.data.hasNext,
      };
    } catch (error: any) {
      console.error('Failed to get user photos:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch photos';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get download URL for a photo
   */
  async getDownloadUrl(
    photoId: string,
    userId: string,
    expirationMinutes: number = 60
  ): Promise<{ downloadUrl: string; filename: string }> {
    try {
      const response = await apiClient.get<{ downloadUrl: string; filename: string }>(
        `/api/photos/${photoId}/download`,
        {
          params: {
            userId,
            expirationMinutes,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to get download URL:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to get download URL'
      );
    }
  },

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/photos/${photoId}`, {
        params: {
          userId,
        },
      });
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete photo'
      );
    }
  },

  /**
   * Delete multiple photos
   */
  async deletePhotos(photoIds: string[], userId: string): Promise<void> {
    try {
      // Delete photos sequentially to avoid overwhelming the server
      // Could be optimized to use Promise.allSettled for parallel deletion
      for (const photoId of photoIds) {
        await this.deletePhoto(photoId, userId);
      }
    } catch (error: any) {
      console.error('Failed to delete photos:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete photos'
      );
    }
  },

  /**
   * Get all photo IDs for a user (across all pages)
   */
  async getAllPhotoIds(userId: string): Promise<string[]> {
    try {
      const allPhotoIds: string[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getUserPhotos(userId, page, 100); // Use larger page size for efficiency
        allPhotoIds.push(...response.content.map(photo => photo.id));
        hasMore = !response.last;
        page++;
      }

      return allPhotoIds;
    } catch (error: any) {
      console.error('Failed to get all photo IDs:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to get photo IDs'
      );
    }
  },

  /**
   * Delete ALL photos for a user (fetches all pages)
   */
  async deleteAllPhotos(userId: string): Promise<void> {
    try {
      // First, get all photo IDs across all pages
      const allPhotoIds = await this.getAllPhotoIds(userId);
      
      if (allPhotoIds.length === 0) {
        return; // Nothing to delete
      }

      // Then delete them all
      await this.deletePhotos(allPhotoIds, userId);
    } catch (error: any) {
      console.error('Failed to delete all photos:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete all photos'
      );
    }
  },
};

