import { photoService } from './photoService';
import type { Photo } from '../types/photo';

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
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = response.downloadUrl;
      link.download = response.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download photo:', error);
      throw error;
    }
  },

  /**
   * Download multiple photos
   */
  async downloadPhotos(
    photos: Photo[],
    expirationMinutes = 60,
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const total = photos.length;
    let completed = 0;

    for (const photo of photos) {
      try {
        await this.downloadPhoto(photo, expirationMinutes);
        completed++;
        onProgress?.(completed, total);
        
        // Small delay between downloads to avoid overwhelming the browser
        if (completed < total) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to download photo ${photo.id}:`, error);
        // Continue with next photo even if one fails
        completed++;
        onProgress?.(completed, total);
      }
    }
  },
};

