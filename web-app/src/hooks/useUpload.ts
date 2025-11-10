import { useState, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';
import { useSSE } from './useSSE';
import type {
  PhotoFile,
  BatchUploadProgress,
  CreateUploadJobResponse,
  UploadStatusEvent,
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
   * Handle SSE events to update progress
   */
  const handleSSEEvent = useCallback((event: UploadStatusEvent) => {
    setUploadProgress((prev) => {
      if (!prev || prev.jobId !== event.jobId) return prev;

      const updated = { ...prev };

      // Update job-level status
      if (event.jobStatus) {
        updated.status =
          event.jobStatus === 'COMPLETED'
            ? 'completed'
            : event.jobStatus === 'PARTIAL_SUCCESS'
            ? 'partial_success'
            : event.jobStatus === 'FAILED'
            ? 'failed'
            : 'uploading';
      }

      // Update counts
      if (event.completedCount !== undefined) {
        updated.completed = event.completedCount;
      }
      if (event.failedCount !== undefined) {
        updated.failed = event.failedCount;
      }
      if (event.progress !== undefined) {
        updated.progress = Math.round(event.progress);
      }

      // Update individual photo status
      if (event.photoId && event.photoStatus) {
        updated.photos = prev.photos.map((p) => {
          if (p.photoId === event.photoId) {
            return {
              ...p,
              status:
                event.photoStatus === 'COMPLETED'
                  ? 'completed'
                  : event.photoStatus === 'FAILED'
                  ? 'failed'
                  : 'uploading',
              progress:
                event.photoStatus === 'COMPLETED'
                  ? 100
                  : event.photoStatus === 'FAILED'
                  ? 0
                  : p.progress,
              error: event.errorMessage || p.error,
            };
          }
          return p;
        });
      }

      return updated;
    });
  }, []);

  // Connect to SSE when upload is in progress
  useSSE(uploadProgress?.jobId || null, handleSSEEvent);

  /**
   * Upload multiple photos
   */
  const uploadPhotos = useCallback(
    async (files: PhotoFile[]) => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        // Step 1: Create upload job
        const jobResponse: CreateUploadJobResponse = await uploadService.createUploadJob(
          user.id,
          files.map((f) => ({
            filename: f.filename,
            fileSize: f.size,
            contentType: f.type,
          }))
        );

        // Initialize progress tracking
        const initialProgress: BatchUploadProgress = {
          jobId: jobResponse.jobId,
          total: files.length,
          completed: 0,
          failed: 0,
          progress: 0,
          status: 'uploading',
          photos: files.map((file, index) => ({
            photoId: jobResponse.photos[index].photoId,
            filename: file.filename,
            status: 'pending',
            progress: 0,
          })),
        };
        setUploadProgress(initialProgress);

        // Step 2: Upload each file to S3
        const uploadPromises = files.map(async (file, index) => {
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
            await uploadService.uploadToS3(uploadUrl, file.file, (progress) => {
              setUploadProgress((prev) => {
                if (!prev) return prev;
                const updated = { ...prev };
                updated.photos = prev.photos.map((p) =>
                  p.photoId === photoId ? { ...p, progress } : p
                );
                return updated;
              });
            });

            // Notify backend of completion
            await uploadService.completePhotoUpload(photoId);

            const uploadTime = Date.now() - startTime;

            // Update progress
            setUploadProgress((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.photos = prev.photos.map((p) =>
                p.photoId === photoId
                  ? { ...p, status: 'completed', progress: 100, uploadTime }
                  : p
              );
              updated.completed = prev.completed + 1;
              updated.progress = Math.round(
                ((updated.completed + updated.failed) / updated.total) * 100
              );
              if (updated.completed + updated.failed === updated.total) {
                updated.status =
                  updated.failed === 0
                    ? 'completed'
                    : updated.completed > 0
                    ? 'partial_success'
                    : 'failed';
              }
              return updated;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            const uploadTime = Date.now() - startTime;
            
            // DON'T notify backend of failure - backend has validation issues
            // The stalled upload cleanup service will handle it automatically
            console.error('Upload failed for photoId:', photoId, errorMessage);

            // Update progress
            setUploadProgress((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.photos = prev.photos.map((p) =>
                p.photoId === photoId
                  ? { ...p, status: 'failed', progress: 0, error: errorMessage, uploadTime }
                  : p
              );
              updated.failed = prev.failed + 1;
              updated.progress = Math.round(
                ((updated.completed + updated.failed) / updated.total) * 100
              );
              if (updated.completed + updated.failed === updated.total) {
                updated.status =
                  updated.failed === 0
                    ? 'completed'
                    : updated.completed > 0
                    ? 'partial_success'
                    : 'failed';
              }
              return updated;
            });
          }
        });

        await Promise.all(uploadPromises);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );

  /**
   * Reset upload state
   */
  const resetUpload = useCallback(() => {
    setUploadProgress(null);
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    uploadPhotos,
    uploadProgress,
    isUploading,
    error,
    resetUpload,
  };
}

