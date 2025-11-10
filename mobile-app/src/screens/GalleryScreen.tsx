import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import { PhotoGrid } from '../components/PhotoGrid/PhotoGrid';
import { BulkDownload } from '../components/Download/BulkDownload';
import { photoService } from '../services/photoService';
import { useAuth } from '../contexts/AuthContext';
import { usePhotos } from '../hooks/usePhotos';
import { useUpload } from '../hooks/useUpload';
import { useDownload } from '../hooks/useDownload';
import { useToast } from '../contexts/ToastContext';
import type { Photo } from '../types';
import type { PhotoFile } from '../types/upload';

export default function GalleryScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { photos, isLoading, isRefreshing, isLoadingMore, hasMore, refresh, loadMore } = usePhotos();
  const { uploadPhotos, isUploading } = useUpload();
  const { downloadPhoto } = useDownload();
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh photos when screen comes into focus (e.g., after uploading)
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Auto-refresh when app comes to foreground and periodic refresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh photos
        refresh();
      }
    });

    // Periodic refresh every 30 seconds when app is active
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        refresh();
      }
    }, 30000); // 30 seconds

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [refresh]);

  const handleDownload = async (photo: Photo) => {
    try {
      await downloadPhoto(photo);
      // Toast notification is now handled in PhotoViewer
    } catch (error: any) {
      console.error('Download failed:', error);
      // Error toast is now handled in PhotoViewer
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!user) return;

    try {
      await photoService.deletePhoto(photo.id, user.id);
      await refresh();
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleSelectionChange = (selected: Photo[]) => {
    setSelectedPhotos(selected);
  };

  const handleBulkDownload = () => {
    // Bulk download handled by BulkDownload component
  };

  const toggleMultiSelect = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedPhotos([]);
      setIsSelectAll(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user || photos.length === 0) return;

    // Get the total count of photos for accurate confirmation message
    try {
      const allPhotoIds = await photoService.getAllPhotoIds(user.id);
      const totalCount = allPhotoIds.length;

      Alert.alert(
        'Delete All Photos',
        `Are you sure you want to delete ALL ${totalCount} photo${totalCount > 1 ? 's' : ''}? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsDeleting(true);
                // Use the new deleteAllPhotos method that fetches ALL photos across all pages
                await photoService.deleteAllPhotos(user.id);
                await refresh();
              } catch (error: any) {
                console.error('Failed to delete all photos:', error);
                Alert.alert('Delete Failed', 'Failed to delete photos. Please try again.');
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to get photo count:', error);
      // Fallback to showing current loaded count if we can't fetch all IDs
      Alert.alert(
        'Delete All Photos',
        `Are you sure you want to delete ALL photos? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsDeleting(true);
                await photoService.deleteAllPhotos(user.id);
                await refresh();
              } catch (error: any) {
                console.error('Failed to delete all photos:', error);
                Alert.alert('Delete Failed', 'Failed to delete photos. Please try again.');
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleDelete = () => {
    if (selectedPhotos.length === 0 || !user) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await photoService.deletePhotos(
                selectedPhotos.map((p) => p.id),
                user.id
              );
              // Clear selection and refresh photos
              setSelectedPhotos([]);
              setIsSelectAll(false);
              await refresh();
            } catch (error: any) {
              console.error('Failed to delete photos:', error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const requestPermissions = async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to upload them.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleCloudIconPress = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 100,
      });

      if (!result.canceled && result.assets) {
        const validImages: PhotoFile[] = [];
        const tooLargeFiles: string[] = [];

        result.assets.forEach((asset) => {
          const fileSize = asset.fileSize || 0;
          const filename = asset.fileName || `photo_${Date.now()}.jpg`;
          
          if (fileSize > MAX_FILE_SIZE) {
            tooLargeFiles.push(`${filename} (${formatFileSize(fileSize)})`);
          } else {
            validImages.push({
              uri: asset.uri,
              filename,
              fileSize,
              type: asset.mimeType || 'image/jpeg',
              width: asset.width,
              height: asset.height,
            });
          }
        });

        // Show warning for files that are too large
        if (tooLargeFiles.length > 0) {
          const message = `The following ${tooLargeFiles.length} file${tooLargeFiles.length > 1 ? 's' : ''} exceed the 10MB limit and were not added:\n\n${tooLargeFiles.slice(0, 5).join('\n')}${tooLargeFiles.length > 5 ? `\n...and ${tooLargeFiles.length - 5} more` : ''}`;
          Alert.alert('File Size Limit', message);
        }

        // Only upload valid images immediately
        if (validImages.length > 0) {
          // Start upload immediately
          try {
            await uploadPhotos(validImages, 3); // 3 concurrent uploads
            await refresh();
          } catch (err: any) {
            console.error('Upload failed:', err);
            const errorMessage = err.message || 'Upload failed. Please try again.';
            Alert.alert('Upload Failed', errorMessage);
          }
        } else if (tooLargeFiles.length > 0) {
          // If all files were too large, don't upload
          return;
        }
      }
    } catch (error: any) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <View style={styles.headerActions}>
          {!isMultiSelectMode && (
            <>
              <TouchableOpacity
                onPress={handleCloudIconPress}
                style={styles.headerButton}
                disabled={isUploading}
              >
                <Ionicons name="cloud-upload-outline" size={24} color={isUploading ? '#666' : '#8B5CF6'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAll}
                style={styles.headerButton}
                disabled={isDeleting || photos.length === 0}
              >
                <Ionicons 
                  name="trash-bin-outline" 
                  size={24} 
                  color={isDeleting || photos.length === 0 ? '#666' : '#EF4444'} 
                />
              </TouchableOpacity>
            </>
          )}
          {isMultiSelectMode && (
            <>
              {selectedPhotos.length > 0 && (
                <>
                  <TouchableOpacity
                    onPress={handleBulkDownload}
                    style={styles.headerButton}
                  >
                    <Ionicons name="download-outline" size={24} color="#8B5CF6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.headerButton}
                    disabled={isDeleting}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={24}
                      color={isDeleting ? '#666' : '#EF4444'}
                    />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {isMultiSelectMode && selectedPhotos.length > 0 && (
        <View style={styles.bulkActions}>
          <BulkDownload photos={selectedPhotos} />
          <Text style={styles.selectedCount}>
            {selectedPhotos.length} selected
          </Text>
        </View>
      )}

      <PhotoGrid
        onDownload={handleDownload}
        onDelete={handleDeletePhoto}
        multiSelect={isMultiSelectMode}
        onSelectionChange={handleSelectionChange}
        selectAll={isSelectAll}
        onSelectAllChange={setIsSelectAll}
        photos={photos}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onRefresh={refresh}
        onLoadMore={loadMore}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  bulkActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  selectedCount: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

