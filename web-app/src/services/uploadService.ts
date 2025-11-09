import apiClient from './api';
import type {
  CreateUploadJobRequest,
  CreateUploadJobResponse,
} from '../types/upload';
import { retryApiCall, retryS3Upload } from '../utils/retryUtils';

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
    
    // Retry the API call with exponential backoff
    return retryApiCall(async () => {
      const response = await apiClient.post<CreateUploadJobResponse>(
        `/upload-jobs`,
        request
      );
      return response.data;
    });
  },

  /**
   * Upload a file directly to S3 using a presigned URL with progress tracking
   * Includes automatic retry with exponential backoff for failed uploads
   */
  async uploadToS3(
    presignedUrl: string, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Wrap the upload with retry logic
    return retryS3Upload(
      () => this._performS3Upload(presignedUrl, file, onProgress),
      (attempt, error) => {
        console.warn(`S3 upload retry attempt ${attempt} after error:`, error.message);
        // Reset progress to 0 on retry so UI reflects the retry
        if (onProgress) {
          onProgress(0);
        }
      }
    );
  },

  /**
   * Internal method to perform the actual S3 upload
   */
  _performS3Upload(
    presignedUrl: string, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set timeout for the request (60 seconds for large files)
      xhr.timeout = 60000;

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  },

  /**
   * Notify backend that a photo upload is complete
   */
  async completePhotoUpload(photoId: string): Promise<void> {
    return retryApiCall(async () => {
      await apiClient.post(`/photos/${photoId}/complete`);
    });
  },

  /**
   * Notify backend that a photo upload failed
   */
  async failPhotoUpload(photoId: string, errorMessage: string): Promise<void> {
    return retryApiCall(async () => {
      await apiClient.post(`/photos/${photoId}/fail`, {
        errorMessage,
      });
    });
  },
};

