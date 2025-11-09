import { useState, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';
import type {
  PhotoFile,
  BatchUploadProgress,
  CreateUploadJobResponse,
} from '../types/upload';

/**
 * Hook for managing photo uploads
 */
export function useUpload() {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload multiple photos with progress tracking
   */
  const uploadPhotos = useCallback(
    async (files: PhotoFile[], concurrency: number = 3) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setIsUploading(true);
      setError(null);

      try {
        // Step 1: Create upload job
        const jobResponse: CreateUploadJobResponse = await uploadService.createUploadJob(
          user.id,
          files.map((file) => ({
            filename: file.filename,
            fileSize: file.fileSize,
            contentType: file.type,
          }))
        );

        // Initialize progress
        const initialProgress: BatchUploadProgress = {
          jobId: jobResponse.jobId,
          total: files.length,
          completed: 0,
          failed: 0,
          progress: 0,
          status: 'uploading',
          photos: jobResponse.photos.map((photo, index) => ({
            photoId: photo.photoId,
            filename: files[index].filename,
            status: 'pending',
            progress: 0,
          })),
        };

        setUploadProgress(initialProgress);

        // Step 2: Upload each file to S3 with concurrency control
        const uploadPromises: Promise<void>[] = [];
        const queue = [...files];
        const activeUploads: Promise<void>[] = [];

        const uploadPhoto = async (file: PhotoFile, index: number) => {
          const { photoId, uploadUrl } = jobResponse.photos[index];
          const startTime = Date.now();

          try {
            // Update status to uploading
            setUploadProgress((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.photos = prev.photos.map((p) =>
                p.photoId === photoId ? { ...p, status: 'uploading', progress: 0 } : p
              );
              return updated;
            });

            // Upload to S3 with progress tracking
            await uploadService.uploadToS3WithProgress(uploadUrl, file, (progress) => {
              setUploadProgress((prev) => {
                if (!prev) return prev;
                const updated = { ...prev };
                updated.photos = prev.photos.map((p) =>
                  p.photoId === photoId ? { ...p, progress } : p
                );
                // Update overall progress
                const totalProgress = updated.photos.reduce((sum, p) => sum + p.progress, 0);
                updated.progress = Math.round(totalProgress / updated.photos.length);
                return updated;
              });
            });

            // Notify backend of completion
            await uploadService.completePhotoUpload(photoId);

            const uploadTime = Date.now() - startTime;

            // Update progress to completed
            setUploadProgress((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.photos = prev.photos.map((p) =>
                p.photoId === photoId
                  ? { ...p, status: 'completed', progress: 100, uploadTime }
                  : p
              );
              updated.completed++;
              const totalProgress = updated.photos.reduce((sum, p) => sum + p.progress, 0);
              updated.progress = Math.round(totalProgress / updated.photos.length);
              
              // Check if all uploads are done
              if (updated.completed + updated.failed === updated.total) {
                if (updated.failed === 0) {
                  updated.status = 'completed';
                } else if (updated.completed > 0) {
                  updated.status = 'partial_success';
                } else {
                  updated.status = 'failed';
                }
              }
              
              return updated;
            });
          } catch (error: any) {
            const errorMessage = error.message || 'Upload failed';
            
            // Report failure to backend
            await uploadService.failPhotoUpload(photoId, errorMessage);

            // Update progress to failed
            setUploadProgress((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.photos = prev.photos.map((p) =>
                p.photoId === photoId
                  ? { ...p, status: 'failed', progress: 0, error: errorMessage }
                  : p
              );
              updated.failed++;
              const totalProgress = updated.photos.reduce((sum, p) => sum + p.progress, 0);
              updated.progress = Math.round(totalProgress / updated.photos.length);
              
              // Check if all uploads are done
              if (updated.completed + updated.failed === updated.total) {
                if (updated.failed === 0) {
                  updated.status = 'completed';
                } else if (updated.completed > 0) {
                  updated.status = 'partial_success';
                } else {
                  updated.status = 'failed';
                }
              }
              
              return updated;
            });
          }
        };

        // Process uploads with concurrency limit
        while (queue.length > 0 || activeUploads.length > 0) {
          // Fill up to concurrency limit
          while (activeUploads.length < concurrency && queue.length > 0) {
            const file = queue.shift()!;
            const index = files.indexOf(file);
            const uploadPromise = uploadPhoto(file, index).finally(() => {
              const idx = activeUploads.indexOf(uploadPromise);
              if (idx > -1) {
                activeUploads.splice(idx, 1);
              }
            });
            activeUploads.push(uploadPromise);
          }

          // Wait for at least one upload to complete
          if (activeUploads.length > 0) {
            await Promise.race(activeUploads);
          }
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to upload photos';
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );

  return {
    uploadPhotos,
    uploadProgress,
    isUploading,
    error,
  };
}

