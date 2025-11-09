import { useState, useCallback } from 'react';
import { downloadService, type DownloadProgress } from '../services/downloadService';
import type { Photo } from '../types/photo';

interface UseDownloadReturn {
  downloadPhoto: (photo: Photo) => Promise<void>;
  downloadPhotos: (photos: Photo[], onProgress?: (completed: number, total: number) => void) => Promise<void>;
  isDownloading: boolean;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  photoProgress: Map<string, DownloadProgress>;
  error: Error | null;
}

/**
 * Hook for managing photo downloads
 */
export function useDownload(): UseDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [photoProgress, setPhotoProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [error, setError] = useState<Error | null>(null);

  const downloadPhoto = useCallback(async (photo: Photo) => {
    try {
      setIsDownloading(true);
      setError(null);
      setProgress({ completed: 0, total: 1, percentage: 0 });
      
      // Set initial progress
      setPhotoProgress(new Map([[photo.id, {
        photoId: photo.id,
        filename: photo.filename,
        status: 'downloading',
        progress: 50,
      }]]));
      
      await downloadService.downloadPhoto(photo);
      
      // Update to completed
      setPhotoProgress(new Map([[photo.id, {
        photoId: photo.id,
        filename: photo.filename,
        status: 'completed',
        progress: 100,
      }]]));
      
      setProgress({ completed: 1, total: 1, percentage: 100 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to download photo');
      setError(error);
      
      // Update to failed
      setPhotoProgress(new Map([[photo.id, {
        photoId: photo.id,
        filename: photo.filename,
        status: 'failed',
        progress: 0,
        error: error.message,
      }]]));
      
      throw error;
    } finally {
      setIsDownloading(false);
      // Clear photo progress after a short delay
      setTimeout(() => {
        setPhotoProgress(new Map());
      }, 2000);
    }
  }, []);

  const downloadPhotos = useCallback(
    async (photos: Photo[], onProgress?: (completed: number, total: number) => void) => {
      try {
        setIsDownloading(true);
        setError(null);
        setProgress({ completed: 0, total: photos.length, percentage: 0 });
        setPhotoProgress(new Map());

        await downloadService.downloadPhotos(photos, 60, (completed, total, individualProgress) => {
          const percentage = Math.round((completed / total) * 100);
          setProgress({ completed, total, percentage });
          
          // Update individual photo progress
          if (individualProgress) {
            setPhotoProgress(new Map(individualProgress));
          }
          
          onProgress?.(completed, total);
        }, 3); // 3 concurrent downloads
      } catch (err) {
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
    []
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

