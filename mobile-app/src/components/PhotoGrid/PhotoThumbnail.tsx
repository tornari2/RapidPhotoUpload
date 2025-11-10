import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { photoService } from '../../services/photoService';
import type { Photo } from '../../types';

interface PhotoThumbnailProps {
  photo: Photo;
  onPress: (photo: Photo) => void;
  onDownload?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  isSelected?: boolean;
  onSelect?: (photo: Photo) => void;
  downloadProgress?: number;
}

export const PhotoThumbnail = memo<PhotoThumbnailProps>(
  ({
    photo,
    onPress,
    onDownload,
    onDelete,
    isSelected = false,
    onSelect,
    downloadProgress,
  }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const [imageError, setImageError] = useState(false);

    // Fetch download URL for the photo
    useEffect(() => {
      let isCancelled = false;
      let retryTimeout: NodeJS.Timeout | null = null;
      let retryCount = 0;
      const maxRetries = 20; // Retry for up to 2 minutes (20 * 6 seconds)

      const loadImageUrl = async () => {
        // Only try to load URL for completed photos
        if (photo.uploadStatus !== 'COMPLETED') {
          if (photo.uploadStatus === 'UPLOADING' || photo.uploadStatus === 'PENDING') {
            // Photo is still uploading, retry after a delay
            if (retryCount < maxRetries && !isCancelled) {
              retryCount++;
              retryTimeout = setTimeout(() => {
                loadImageUrl();
              }, 6000); // Retry every 6 seconds
            } else if (!isCancelled) {
              // Max retries reached, show placeholder
              setIsLoadingImage(false);
              setImageError(false);
            }
          } else {
            // Photo failed or other status, show placeholder
            setIsLoadingImage(false);
            setImageError(false);
          }
          return;
        }

        try {
          setIsLoadingImage(true);
          setImageError(false);
          const response = await photoService.getDownloadUrl(
            photo.id,
            photo.userId,
            3600 // 60 hour expiration
          );
          if (!isCancelled) {
            setThumbnailUrl(response.downloadUrl);
            setIsLoadingImage(false);
          }
        } catch (error: any) {
          console.error('Failed to load thumbnail URL:', error);
          
          // If photo is not completed (500 error), retry after delay
          const isNotCompletedError = error.response?.status === 500 && 
                                     (error.response?.data?.message?.includes('not completed') ||
                                      error.response?.data?.message?.includes('Status:'));
          
          if (isNotCompletedError && retryCount < maxRetries && !isCancelled) {
            retryCount++;
            retryTimeout = setTimeout(() => {
              loadImageUrl();
            }, 6000); // Retry every 6 seconds
          } else if (!isCancelled) {
            setImageError(true);
            setIsLoadingImage(false);
          }
        }
      };

      loadImageUrl();

      return () => {
        isCancelled = true;
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
      };
    }, [photo.id, photo.userId, photo.uploadStatus]);

    const handlePress = () => {
      if (onSelect) {
        onSelect(photo);
      } else {
        onPress(photo);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.container, isSelected && styles.selected]}
        onPress={handlePress}
        onLongPress={() => onPress(photo)}
        activeOpacity={0.8}
      >
        {isLoadingImage ? (
          <View style={styles.placeholder}>
            {photo.uploadStatus === 'UPLOADING' || photo.uploadStatus === 'PENDING' ? (
              <>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color="#8B5CF6" />
            )}
          </View>
        ) : thumbnailUrl && !imageError ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={32} color="#6B7280" />
          </View>
        )}

        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
          </View>
        )}

        {downloadProgress !== undefined && downloadProgress < 100 && (
          <View style={styles.downloadOverlay}>
            <View style={styles.downloadProgressBar}>
              <View
                style={[
                  styles.downloadProgressFill,
                  { width: `${downloadProgress}%` },
                ]}
              />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

PhotoThumbnail.displayName = 'PhotoThumbnail';

const styles = StyleSheet.create({
  container: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  selected: {
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#1F2937',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  downloadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  downloadProgressBar: {
    height: 2,
    backgroundColor: '#374151',
    borderRadius: 1,
    overflow: 'hidden',
  },
  downloadProgressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  uploadingText: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
  },
});

