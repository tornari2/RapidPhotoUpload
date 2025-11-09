import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { photoService } from '../../services/photoService';
import type { Photo } from '../../types';

const { width, height } = Dimensions.get('window');

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onDownload?: (photo: Photo) => void;
  onTag?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  photos,
  onClose,
  onDownload,
  onTag,
  onDelete,
}) => {
  const initialIndex = photos.findIndex((p) => p.id === photo.id);
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const loadedUrlsRef = useRef<Set<string>>(new Set());
  const currentPhoto = photos[currentIndex] || photo;

  useEffect(() => {
    if (flatListRef.current && initialIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 100);
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Load download URLs for photos
  useEffect(() => {
    const loadUrls = async () => {
      // Only load URLs for completed photos
      const photosToLoad = photos.filter(
        (p) => p.uploadStatus === 'COMPLETED' &&
               !imageUrls.has(p.id) && 
               !loadingUrls.has(p.id) && 
               !loadedUrlsRef.current.has(p.id)
      );

      if (photosToLoad.length === 0) return;

      // Mark as loading
      setLoadingUrls((prev) => {
        const updated = new Set(prev);
        photosToLoad.forEach((p) => updated.add(p.id));
        return updated;
      });

      try {
        const urlPromises = photosToLoad.map(async (p) => {
          try {
            const response = await photoService.getDownloadUrl(p.id, p.userId, 3600);
            return { photoId: p.id, url: response.downloadUrl };
          } catch (error) {
            console.error(`Failed to load URL for photo ${p.id}:`, error);
            return null;
          }
        });

        const results = await Promise.all(urlPromises);

        setImageUrls((prev) => {
          const updated = new Map(prev);
          results.forEach((result) => {
            if (result) {
              updated.set(result.photoId, result.url);
              loadedUrlsRef.current.add(result.photoId);
            }
          });
          return updated;
        });
      } finally {
        // Remove from loading set
        setLoadingUrls((prev) => {
          const updated = new Set(prev);
          photosToLoad.forEach((p) => updated.delete(p.id));
          return updated;
        });
      }
    };

    loadUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // Retry loading URLs for photos that become completed
  useEffect(() => {
    const retryInterval = setInterval(() => {
      // Check if any photos became completed and need URLs loaded
      const completedPhotosNeedingUrls = photos.filter(
        (p) => p.uploadStatus === 'COMPLETED' &&
               !imageUrls.has(p.id) && 
               !loadingUrls.has(p.id) && 
               !loadedUrlsRef.current.has(p.id)
      );
      
      if (completedPhotosNeedingUrls.length > 0) {
        // Trigger URL loading by calling loadUrls logic
        const loadUrls = async () => {
          const photosToLoad = completedPhotosNeedingUrls;

          if (photosToLoad.length === 0) return;

          setLoadingUrls((prev) => {
            const updated = new Set(prev);
            photosToLoad.forEach((p) => updated.add(p.id));
            return updated;
          });

          try {
            const urlPromises = photosToLoad.map(async (p) => {
              try {
                const response = await photoService.getDownloadUrl(p.id, p.userId, 3600);
                return { photoId: p.id, url: response.downloadUrl };
              } catch (error) {
                console.error(`Failed to load URL for photo ${p.id}:`, error);
                return null;
              }
            });

            const results = await Promise.all(urlPromises);

            setImageUrls((prev) => {
              const updated = new Map(prev);
              results.forEach((result) => {
                if (result) {
                  updated.set(result.photoId, result.url);
                  loadedUrlsRef.current.add(result.photoId);
                }
              });
              return updated;
            });
          } finally {
            setLoadingUrls((prev) => {
              const updated = new Set(prev);
              photosToLoad.forEach((p) => updated.delete(p.id));
              return updated;
            });
          }
        };
        
        loadUrls();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(retryInterval);
  }, [photos, imageUrls, loadingUrls]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              const photoToDelete = currentPhoto;
              const deleteIndex = currentIndex;
              
              // Determine navigation before deletion
              const shouldNavigateToPrevious = deleteIndex === photos.length - 1 && deleteIndex > 0;
              const shouldClose = photos.length === 1;
              
              await onDelete(photoToDelete);
              
              // Handle navigation after deletion
              if (shouldClose) {
                // Was the only photo, close viewer
                onClose();
              } else if (shouldNavigateToPrevious) {
                // Was last photo, navigate to previous
                setCurrentIndex(deleteIndex - 1);
              }
              // Otherwise, stay at same index (next photo will move into position)
              // The parent's refresh will update the photos array and the viewer will adjust
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#F3F4F6" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {onTag && (
              <TouchableOpacity
                onPress={() => onTag(currentPhoto)}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pricetag-outline" size={24} color="#F3F4F6" />
              </TouchableOpacity>
            )}
            {onDownload && (
              <TouchableOpacity
                onPress={() => onDownload(currentPhoto)}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="download-outline" size={24} color="#F3F4F6" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          renderItem={({ item: p }) => {
            const url = imageUrls.get(p.id);
            const isLoading = loadingUrls.has(p.id);
            const isUploading = p.uploadStatus === 'UPLOADING' || p.uploadStatus === 'PENDING';
            
            return (
              <View style={styles.imageContainer}>
                {isUploading ? (
                  <View style={styles.placeholder}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                ) : isLoading ? (
                  <View style={styles.placeholder}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                  </View>
                ) : url ? (
                  <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
                ) : (
                  <View style={styles.placeholder}>
                    <Ionicons name="image-outline" size={64} color="#6B7280" />
                  </View>
                )}
              </View>
            );
          }}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        />

        {photos.length > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={currentIndex === 0}
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentIndex === 0 ? '#6B7280' : '#F3F4F6'}
              />
            </TouchableOpacity>
            <Text style={styles.counter}>
              {currentIndex + 1} / {photos.length}
            </Text>
            <TouchableOpacity
              onPress={handleNext}
              disabled={currentIndex === photos.length - 1}
              style={[
                styles.navButton,
                currentIndex === photos.length - 1 && styles.navButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentIndex === photos.length - 1 ? '#6B7280' : '#F3F4F6'}
              />
            </TouchableOpacity>
          </View>
        )}

        {currentPhoto.tags && currentPhoto.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsLabel}>Tags:</Text>
            <Text style={styles.tagsText}>
              {currentPhoto.tags.map((tag) => tag.name).join(', ')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

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
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    position: 'relative',
  },
  closeButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width,
    height: height - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  navButton: {
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  counter: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tagsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  tagsText: {
    color: '#F3F4F6',
    fontSize: 14,
  },
  uploadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
  },
});

