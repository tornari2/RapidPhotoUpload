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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { photoService } from '../../services/photoService';
import { TagInput } from '../Tagging/TagInput';
import { Toast } from '../Toast/Toast';
import { useDownload } from '../../hooks/useDownload';
import type { Photo } from '../../types';

const { width, height } = Dimensions.get('window');

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onDownload?: (photo: Photo) => void;
  onTag?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  onRefresh?: () => Promise<void>;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  photos,
  onClose,
  onDownload,
  onTag,
  onDelete,
  onRefresh,
}) => {
  const { downloadPhoto } = useDownload();
  const initialIndex = photos.findIndex((p) => p.id === photo.id);
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [showTagInput, setShowTagInput] = useState(false);
  // Toast state for download notifications
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const flatListRef = useRef<FlatList>(null);
  const loadedUrlsRef = useRef<Set<string>>(new Set());
  // Refs to track current state values without causing re-renders
  const imageUrlsRef = useRef<Map<string, string>>(new Map());
  const loadingUrlsRef = useRef<Set<string>>(new Set());
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
        // Close tag input when photo changes
        setShowTagInput(false);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Load download URLs for photos
  useEffect(() => {
    const loadUrls = async () => {
      // Use refs to get current state values
      const currentImageUrls = imageUrlsRef.current;
      const currentLoadingUrls = loadingUrlsRef.current;
      
      // Only load URLs for completed photos
      const photosToLoad = photos.filter(
        (p) => p.uploadStatus === 'COMPLETED' &&
               !currentImageUrls.has(p.id) && 
               !currentLoadingUrls.has(p.id) && 
               !loadedUrlsRef.current.has(p.id)
      );

      if (photosToLoad.length === 0) return;

      // Mark as loading
      setLoadingUrls((prev) => {
        const updated = new Set(prev);
        photosToLoad.forEach((p) => updated.add(p.id));
        loadingUrlsRef.current = updated; // Update ref
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
          imageUrlsRef.current = updated; // Update ref
          return updated;
        });
      } finally {
        // Remove from loading set
        setLoadingUrls((prev) => {
          const updated = new Set(prev);
          photosToLoad.forEach((p) => updated.delete(p.id));
          loadingUrlsRef.current = updated; // Update ref
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
      // Use refs to access current state values without causing re-renders
      const currentImageUrls = imageUrlsRef.current;
      const currentLoadingUrls = loadingUrlsRef.current;
      
      // Check if any photos became completed and need URLs loaded
      const completedPhotosNeedingUrls = photos.filter(
        (p) => p.uploadStatus === 'COMPLETED' &&
               !currentImageUrls.has(p.id) && 
               !currentLoadingUrls.has(p.id) && 
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
            loadingUrlsRef.current = updated; // Update ref
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
              imageUrlsRef.current = updated; // Update ref
              return updated;
            });
          } finally {
            setLoadingUrls((prev) => {
              const updated = new Set(prev);
              photosToLoad.forEach((p) => updated.delete(p.id));
              loadingUrlsRef.current = updated; // Update ref
              return updated;
            });
          }
        };
        
        loadUrls();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(retryInterval);
  }, [photos]); // Only depend on photos, not on imageUrls or loadingUrls

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

  const handleDelete = async () => {
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
  };

  const handleDownload = async () => {
    try {
      await downloadPhoto(currentPhoto);
      // Show success toast
      setToastMessage(`${currentPhoto.filename} downloaded successfully`);
      setToastType('success');
      setToastVisible(true);
      // Call the optional onDownload callback if provided
      onDownload?.(currentPhoto);
    } catch (error: any) {
      console.error('Download failed:', error);
      // Show error toast
      setToastMessage(error.message || 'Failed to download photo');
      setToastType('error');
      setToastVisible(true);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color="#F3F4F6" />
          </TouchableOpacity>
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

        <View style={styles.actionBar}>
          {onTag && (
            <TouchableOpacity
              onPress={() => setShowTagInput(true)}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pricetag-outline" size={28} color="#F3F4F6" />
              <Text style={styles.actionButtonLabel}>Tag</Text>
            </TouchableOpacity>
          )}
          {onDownload && (
            <TouchableOpacity
              onPress={handleDownload}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="download-outline" size={28} color="#F3F4F6" />
              <Text style={styles.actionButtonLabel}>Download</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={28} color="#EF4444" />
              <Text style={[styles.actionButtonLabel, styles.deleteButtonLabel]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {showTagInput && (
          <TagInput
            photo={currentPhoto}
            visible={showTagInput}
            onClose={() => setShowTagInput(false)}
            onTagged={() => {
              setShowTagInput(false);
              // Don't refresh - tags are already updated on the backend
              // and the modal closing will allow the UI to update naturally
              onTag?.(currentPhoto);
            }}
          />
        )}

        {/* Toast notification inside modal for downloads */}
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          duration={3000}
          onHide={() => setToastVisible(false)}
        />
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    position: 'relative',
  },
  closeButton: {
    padding: 12,
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
  },
  actionButtonLabel: {
    color: '#F3F4F6',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  deleteButtonLabel: {
    color: '#EF4444',
  },
  uploadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
  },
});

