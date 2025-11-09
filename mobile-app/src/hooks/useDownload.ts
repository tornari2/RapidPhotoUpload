import { useState, useCallback } from 'react';
import { downloadService } from '../services/downloadService';
import { fileSystemUtils } from '../utils/fileSystem';
import { useAuth } from '../contexts/AuthContext';
import type { Photo } from '../types';

export interface DownloadProgress {
  photoId: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
}

interface UseDownloadReturn {
  downloadPhoto: (photo: Photo) => Promise<void>;
  downloadPhotos: (
    photos: Photo[],
    onProgress?: (completed: number, total: number) => void
  ) => Promise<void>;
  isDownloading: boolean;
  progress: { completed: number; total: number; percentage: number };
  photoProgress: Map<string, DownloadProgress>;
  error: Error | null;
}

/**
 * Hook for managing photo downloads
 */
export function useDownload(): UseDownloadReturn {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [photoProgress, setPhotoProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [error, setError] = useState<Error | null>(null);

  const downloadPhoto = useCallback(
    async (photo: Photo) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setIsDownloading(true);
        setError(null);
        setProgress({ completed: 0, total: 1, percentage: 0 });

        // Set initial progress
        setPhotoProgress(
          new Map([
            [
              photo.id,
              {
                photoId: photo.id,
                filename: photo.filename,
                status: 'downloading',
                progress: 0,
              },
            ],
          ])
        );

        // Get download URL
        const { downloadUrl, filename } = await downloadService.getDownloadUrl(
          photo.id,
          user.id
        );

        // Download and save to device
        await fileSystemUtils.downloadAndSave(
          downloadUrl,
          fileSystemUtils.generateSafeFilename(filename),
          (progressPercent) => {
            setPhotoProgress(
              new Map([
                [
                  photo.id,
                  {
                    photoId: photo.id,
                    filename: photo.filename,
                    status: 'downloading',
                    progress: progressPercent,
                  },
                ],
              ])
            );
          }
        );

        // Update to completed
        setPhotoProgress(
          new Map([
            [
              photo.id,
              {
                photoId: photo.id,
                filename: photo.filename,
                status: 'completed',
                progress: 100,
              },
            ],
          ])
        );

        setProgress({ completed: 1, total: 1, percentage: 100 });
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error('Failed to download photo');
        setError(error);

        // Update to failed
        setPhotoProgress(
          new Map([
            [
              photo.id,
              {
                photoId: photo.id,
                filename: photo.filename,
                status: 'failed',
                progress: 0,
                error: error.message,
              },
            ],
          ])
        );

        throw error;
      } finally {
        setIsDownloading(false);
        // Clear photo progress after a short delay
        setTimeout(() => {
          setPhotoProgress(new Map());
        }, 2000);
      }
    },
    [user]
  );

  const downloadPhotos = useCallback(
    async (photos: Photo[], onProgress?: (completed: number, total: number) => void) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setIsDownloading(true);
        setError(null);
        setProgress({ completed: 0, total: photos.length, percentage: 0 });
        setPhotoProgress(new Map());

        // Initialize progress for all photos
        const initialProgress = new Map<string, DownloadProgress>();
        photos.forEach((photo) => {
          initialProgress.set(photo.id, {
            photoId: photo.id,
            filename: photo.filename,
            status: 'pending',
            progress: 0,
          });
        });
        setPhotoProgress(initialProgress);

        let completed = 0;
        const total = photos.length;

        // Download photos sequentially to avoid overwhelming the device
        for (const photo of photos) {
          try {
            // Update status to downloading
            setPhotoProgress((prev) => {
              const updated = new Map(prev);
              const current = updated.get(photo.id)!;
              updated.set(photo.id, { ...current, status: 'downloading', progress: 0 });
              return updated;
            });

            // Get download URL
            const { downloadUrl, filename } = await downloadService.getDownloadUrl(
              photo.id,
              user.id
            );

            // Download and save
            await fileSystemUtils.downloadAndSave(
              downloadUrl,
              fileSystemUtils.generateSafeFilename(filename),
              (progressPercent) => {
                setPhotoProgress((prev) => {
                  const updated = new Map(prev);
                  const current = updated.get(photo.id)!;
                  updated.set(photo.id, { ...current, progress: progressPercent });
                  return updated;
                });
              }
            );

            // Update to completed
            completed++;
            const percentage = Math.round((completed / total) * 100);
            setProgress({ completed, total, percentage });

            setPhotoProgress((prev) => {
              const updated = new Map(prev);
              const current = updated.get(photo.id)!;
              updated.set(photo.id, { ...current, status: 'completed', progress: 100 });
              return updated;
            });

            onProgress?.(completed, total);
          } catch (err: any) {
            // Update to failed
            completed++;
            const percentage = Math.round((completed / total) * 100);
            setProgress({ completed, total, percentage });

            setPhotoProgress((prev) => {
              const updated = new Map(prev);
              const current = updated.get(photo.id)!;
              updated.set(photo.id, {
                ...current,
                status: 'failed',
                progress: 0,
                error: err.message || 'Download failed',
              });
              return updated;
            });

            onProgress?.(completed, total);
          }
        }
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error('Failed to download photos');
        setError(error);
        throw error;
      } finally {
        setIsDownloading(false);
        // Reset progress after a short delay
        setTimeout(() => {
          setProgress({ completed: 0, total: 0, percentage: 0 });
          setPhotoProgress(new Map());
        }, 2000);
      }
    },
    [user]
  );

  return {
    downloadPhoto,
    downloadPhotos,
    isDownloading,
    progress,
    photoProgress,
    error,
  };
}

