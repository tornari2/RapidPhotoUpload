import apiClient from './api';
import type {
  CreateUploadJobRequest,
  CreateUploadJobResponse,
} from '../types/upload';

/**
 * Service for handling photo upload operations
 */
export const uploadService = {
  /**
   * Create an upload job and get presigned URLs
   */
  async createUploadJob(
    userId: string,
    photos: Array<{ filename: string; fileSize: number; contentType: string }>
  ): Promise<CreateUploadJobResponse> {
    const request: CreateUploadJobRequest = { userId, photos };
    const response = await apiClient.post<CreateUploadJobResponse>(
      `/upload-jobs`,
      request
    );
    return response.data;
  },

  /**
   * Upload a file directly to S3 using a presigned URL
   */
  async uploadToS3(presignedUrl: string, file: File): Promise<void> {
    await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  /**
   * Notify backend that a photo upload is complete
   */
  async completePhotoUpload(photoId: string): Promise<void> {
    await apiClient.post(`/photos/${photoId}/complete`);
  },

  /**
   * Notify backend that a photo upload failed
   */
  async failPhotoUpload(photoId: string, errorMessage: string): Promise<void> {
    await apiClient.post(`/photos/${photoId}/fail`, {
      errorMessage,
    });
  },
};

