import { useState, useCallback } from 'react';
import { downloadService } from '../services/downloadService';
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
  error: Error | null;
}

/**
 * Hook for managing photo downloads
 */
export function useDownload(): UseDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<Error | null>(null);

  const downloadPhoto = useCallback(async (photo: Photo) => {
    try {
      setIsDownloading(true);
      setError(null);
      setProgress({ completed: 0, total: 1, percentage: 0 });
      
      await downloadService.downloadPhoto(photo);
      
      setProgress({ completed: 1, total: 1, percentage: 100 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to download photo');
      setError(error);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const downloadPhotos = useCallback(
    async (photos: Photo[], onProgress?: (completed: number, total: number) => void) => {
      try {
        setIsDownloading(true);
        setError(null);
        setProgress({ completed: 0, total: photos.length, percentage: 0 });

        await downloadService.downloadPhotos(photos, 60, (completed, total) => {
          const percentage = Math.round((completed / total) * 100);
          setProgress({ completed, total, percentage });
          onProgress?.(completed, total);
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to download photos');
        setError(error);
        throw error;
      } finally {
        setIsDownloading(false);
        // Reset progress after a short delay
        setTimeout(() => {
          setProgress({ completed: 0, total: 0, percentage: 0 });
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
    error,
  };
}

