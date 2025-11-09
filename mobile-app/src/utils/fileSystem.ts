import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';

/**
 * Utilities for saving files to device storage
 */
export const fileSystemUtils = {
  /**
   * Request media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
      } else {
        // Android 13+ uses different permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  },

  /**
   * Check if media library permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  },

  /**
   * Download file from URL and save to device
   */
  async downloadAndSave(
    url: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Validate URL format - should be an S3 presigned URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid download URL');
      }

      // Check if URL looks like an S3 URL (should contain s3.amazonaws.com or similar)
      if (!url.includes('amazonaws.com') && !url.includes('s3')) {
        console.warn('Download URL does not appear to be an S3 URL:', url.substring(0, 100));
        // Still try to download, but log a warning
      }

      // Request permissions if needed
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Media library permission denied');
        }
      }

      // Create a temporary file path
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      console.log('Starting download from URL:', url.substring(0, 100) + '...');

      // Download the file with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {
          // Add headers to ensure direct download, not browser redirect
          headers: {
            'Accept': '*/*',
          },
        },
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite;
            onProgress?.(Math.min(progress * 100, 100));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Download failed: No result returned');
      }

      // Check if download was successful (status code should be 200)
      if (result.statusCode && result.statusCode !== 200) {
        throw new Error(`Download failed with status code: ${result.statusCode}`);
      }

      console.log('Download completed, saving to media library...');

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(result.uri);
      const album = await MediaLibrary.getAlbumAsync('RapidPhotoUpload');
      
      if (album == null) {
        await MediaLibrary.createAlbumAsync('RapidPhotoUpload', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      // Clean up temporary file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      console.log('File saved successfully to media library');
      return asset.uri;
    } catch (error: any) {
      console.error('Error downloading and saving file:', error);
      console.error('URL was:', url?.substring(0, 100));
      
      // Provide more specific error messages
      if (error.message?.includes('Network request failed')) {
        throw new Error('Network error: Please check your internet connection');
      } else if (error.message?.includes('permission')) {
        throw new Error('Permission denied: Please allow photo library access');
      } else if (error.message?.includes('status code')) {
        throw new Error(`Download failed: ${error.message}`);
      } else {
        throw new Error(error.message || 'Failed to download and save file');
      }
    }
  },

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'jpg';
  },

  /**
   * Generate a safe filename for the device
   */
  generateSafeFilename(originalFilename: string): string {
    // Remove any invalid characters
    const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Ensure it has an extension
    if (!sanitized.includes('.')) {
      return `${sanitized}.jpg`;
    }
    return sanitized;
  },
};

