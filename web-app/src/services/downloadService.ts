import { photoService } from './photoService';
import type { Photo } from '../types/photo';
import { retryWithBackoff } from '../utils/retryUtils';

export interface DownloadProgress {
  photoId: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
}

/**
 * Service for handling photo downloads
 */
export const downloadService = {
  /**
   * Download a single photo
   */
  async downloadPhoto(photo: Photo, expirationMinutes = 60): Promise<void> {
    try {
      const response = await photoService.getDownloadUrl(photo.id, photo.userId, expirationMinutes);
      
      // Fetch the image as a blob with retry logic
      const blob = await retryWithBackoff(
        async () => {
          const imageResponse = await fetch(response.downloadUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
          }
          return await imageResponse.blob();
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          timeoutMs: 60000, // 60 seconds for large images
          shouldRetry: () => {
            // Retry on network errors and server errors
            return true;
          },
        }
      );
      
      const blobUrl = URL.createObjectURL(blob);
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download photo:', error);
      throw error;
    }
  },

  /**
   * Download multiple photos with parallel processing and concurrency control
   */
  async downloadPhotos(
    photos: Photo[],
    expirationMinutes = 60,
    onProgress?: (completed: number, total: number, photoProgress?: Map<string, DownloadProgress>) => void,
    concurrency = 3 // Download 3 photos at a time
  ): Promise<void> {
    const total = photos.length;
    let completed = 0;
    const photoProgress = new Map<string, DownloadProgress>();

    // Initialize progress for all photos
    photos.forEach(photo => {
      photoProgress.set(photo.id, {
        photoId: photo.id,
        filename: photo.filename,
        status: 'pending',
        progress: 0,
      });
    });

    // Report initial state
    onProgress?.(0, total, photoProgress);

    // Process photos in batches with concurrency control
    const downloadPhoto = async (photo: Photo) => {
      try {
        // Update status to downloading
        const currentProgress = photoProgress.get(photo.id)!;
        photoProgress.set(photo.id, { ...currentProgress, status: 'downloading', progress: 50 });
        onProgress?.(completed, total, photoProgress);

        await this.downloadPhoto(photo, expirationMinutes);

        // Update status to completed
        photoProgress.set(photo.id, { ...currentProgress, status: 'completed', progress: 100 });
        completed++;
        onProgress?.(completed, total, photoProgress);
      } catch (error) {
        // Update status to failed
        const currentProgress = photoProgress.get(photo.id)!;
        photoProgress.set(photo.id, {
          ...currentProgress,
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Download failed',
        });
        completed++;
        onProgress?.(completed, total, photoProgress);
      }
    };

    // Process photos with concurrency limit
    const queue = [...photos];
    const activeDownloads: Promise<void>[] = [];

    while (queue.length > 0 || activeDownloads.length > 0) {
      // Fill up to concurrency limit
      while (activeDownloads.length < concurrency && queue.length > 0) {
        const photo = queue.shift()!;
        const downloadPromise = downloadPhoto(photo);
        activeDownloads.push(downloadPromise);
      }

      // Wait for at least one download to complete
      if (activeDownloads.length > 0) {
        await Promise.race(activeDownloads);
        // Remove completed downloads
        for (let i = activeDownloads.length - 1; i >= 0; i--) {
          const promise = activeDownloads[i];
          // Check if promise is settled
          await Promise.race([promise, Promise.resolve()]).then(() => {
            activeDownloads.splice(i, 1);
          });
        }
      }
    }
  },
};

