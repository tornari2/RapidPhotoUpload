import apiClient from './api';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  CreateUploadJobRequest,
  CreateUploadJobResponse,
  PhotoFile,
} from '../types/upload';

/**
 * Service for handling photo uploads
 */
export const uploadService = {
  /**
   * Create an upload job and get presigned URLs
   */
  async createUploadJob(
    userId: string,
    photos: Array<{ filename: string; fileSize: number; contentType: string }>
  ): Promise<CreateUploadJobResponse> {
    try {
      const response = await apiClient.post<CreateUploadJobResponse>(
        `/api/upload-jobs`,
        {
          userId,
          photos,
        } as CreateUploadJobRequest
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to create upload job:', error);
      
      // Parse validation errors from backend
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        const errorMessage = errorData.message || errorData.error || '';
        
        // Parse field errors from Spring validation format
        // Format: "Field error in object 'createUploadJobRequest' on field 'photos[2].fileSize': ..."
        if (errorMessage.includes('Field error') && errorMessage.includes('fileSize')) {
          const fileSizeErrors: string[] = [];
          const fileSizeRegex = /photos\[(\d+)\]\.fileSize.*?rejected value \[(\d+)\].*?default message \[([^\]]+)\]/g;
          let match;
          
          while ((match = fileSizeRegex.exec(errorMessage)) !== null) {
            const index = parseInt(match[1]);
            const fileSize = parseInt(match[2]);
            const message = match[3];
            
            if (index >= 0 && index < photos.length) {
              const filename = photos[index].filename;
              const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
              fileSizeErrors.push(`${filename} (${fileSizeMB} MB)`);
            }
          }
          
          if (fileSizeErrors.length > 0) {
            throw new Error(
              `The following ${fileSizeErrors.length} file${fileSizeErrors.length > 1 ? 's' : ''} exceed the 10MB limit:\n${fileSizeErrors.join('\n')}`
            );
          }
        }
        
        // Fallback to generic message
        throw new Error(errorMessage || 'Validation failed. Please check file sizes and try again.');
      }
      
      throw new Error(
        error.response?.data?.message || error.response?.data?.error || 'Failed to create upload job'
      );
    }
  },

  /**
   * Upload file to S3 using presigned URL with progress tracking
   */
  async uploadToS3(
    presignedUrl: string,
    file: PhotoFile,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      // Use FileSystem upload for React Native
      return this.uploadToS3WithProgress(presignedUrl, file, onProgress);
    } catch (error: any) {
      console.error('Failed to upload to S3:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  },

  /**
   * Upload file to S3 with progress tracking using FileSystem upload
   */
  async uploadToS3WithProgress(
    presignedUrl: string,
    file: PhotoFile,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const uploadTask = FileSystem.createUploadTask(
        presignedUrl,
        file.uri,
        {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
        },
        (uploadProgress) => {
          if (onProgress && uploadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              (uploadProgress.totalBytesWritten /
                uploadProgress.totalBytesExpectedToWrite) *
              100;
            onProgress(Math.round(progress));
          }
        }
      );

      const result = await uploadTask.uploadAsync();
      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(`Upload failed with status ${result.statusCode}`);
      }
    } catch (error: any) {
      console.error('Failed to upload to S3:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  },

  /**
   * Notify backend that a photo upload is complete
   */
  async completePhotoUpload(photoId: string): Promise<void> {
    try {
      await apiClient.post(`/api/photos/${photoId}/complete`, {
        photoId,
      });
    } catch (error: any) {
      console.error('Failed to complete photo upload:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to complete upload'
      );
    }
  },

  /**
   * Notify backend that a photo upload failed
   */
  async failPhotoUpload(photoId: string, errorMessage: string): Promise<void> {
    try {
      await apiClient.post(`/api/photos/${photoId}/fail`, {
        photoId,
        errorMessage,
      });
    } catch (error: any) {
      console.error('Failed to report upload failure:', error);
      // Don't throw here - this is just a notification
    }
  },
};

