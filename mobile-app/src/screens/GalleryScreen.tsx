import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  ScrollView,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoGrid } from '../components/PhotoGrid/PhotoGrid';
import { BulkDownload } from '../components/Download/BulkDownload';
import { BulkTagModal } from '../components/Tagging/BulkTagModal';
import { TagInput } from '../components/Tagging/TagInput';
import { ImagePicker } from '../components/Upload/ImagePicker';
import { BatchProgress } from '../components/Upload/BatchProgress';
import { Button } from '../components/Button';
import { photoService } from '../services/photoService';
import { useAuth } from '../contexts/AuthContext';
import { usePhotos } from '../hooks/usePhotos';
import { useUpload } from '../hooks/useUpload';
import type { Photo } from '../types';
import type { PhotoFile } from '../types/upload';

export default function GalleryScreen() {
  const { user } = useAuth();
  const { photos, isLoading, isRefreshing, isLoadingMore, hasMore, refresh, loadMore } = usePhotos();
  const { uploadPhotos, uploadProgress, isUploading, error: uploadError } = useUpload();
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<Photo | null>(null);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<PhotoFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleDownload = (photo: Photo) => {
    // Download handled by DownloadButton component
  };

  const handleTag = (photo: Photo) => {
    setTaggingPhoto(photo);
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

  const handleBulkTag = () => {
    if (selectedPhotos.length > 0) {
      setShowBulkTagModal(true);
    }
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

  const handleSelectAll = () => {
    if (!isMultiSelectMode) return;
    const newSelectAll = !isSelectAll;
    setIsSelectAll(newSelectAll);
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

  const handleImagesSelected = (images: PhotoFile[]) => {
    setSelectedImages(images);
    // Clear validation error when new images are selected
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleValidationError = (message: string) => {
    setValidationError(message);
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) return;

    try {
      await uploadPhotos(selectedImages, 3); // 3 concurrent uploads
      setSelectedImages([]);
      setValidationError(null);
      setShowUploadModal(false);
      await refresh();
    } catch (err: any) {
      console.error('Upload failed:', err);
      // Show validation errors in the modal
      const errorMessage = err.message || 'Upload failed. Please try again.';
      if (errorMessage.includes('exceed') || errorMessage.includes('10MB')) {
        setValidationError(errorMessage);
      } else {
        setValidationError(`Upload failed: ${errorMessage}`);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedImages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <View style={styles.headerActions}>
          {!isMultiSelectMode && (
            <TouchableOpacity
              onPress={() => setShowUploadModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#8B5CF6" />
            </TouchableOpacity>
          )}
          {isMultiSelectMode && (
            <>
              {selectedPhotos.length > 0 && (
                <>
                  <TouchableOpacity
                    onPress={handleBulkTag}
                    style={styles.headerButton}
                  >
                    <Ionicons name="pricetag-outline" size={24} color="#8B5CF6" />
                  </TouchableOpacity>
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
              <TouchableOpacity
                onPress={handleSelectAll}
                style={styles.headerButton}
              >
                <Ionicons
                  name={isSelectAll ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isSelectAll ? '#8B5CF6' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={toggleMultiSelect}
            style={styles.headerButton}
          >
            <Ionicons
              name={isMultiSelectMode ? 'close-circle' : 'checkbox-outline'}
              size={24}
              color={isMultiSelectMode ? '#8B5CF6' : '#9CA3AF'}
            />
          </TouchableOpacity>
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
        onTag={handleTag}
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

      {taggingPhoto && (
        <TagInput
          photo={taggingPhoto}
          visible={!!taggingPhoto}
          onClose={() => setTaggingPhoto(null)}
          onTagged={() => {
            setTaggingPhoto(null);
            // Refresh photos if needed
          }}
        />
      )}

      {showBulkTagModal && (
        <BulkTagModal
          photos={selectedPhotos}
          visible={showBulkTagModal}
          onClose={() => {
            setShowBulkTagModal(false);
            setSelectedPhotos([]);
            setIsMultiSelectMode(false);
          }}
          onTagged={() => {
            setShowBulkTagModal(false);
            setSelectedPhotos([]);
            setIsMultiSelectMode(false);
            // Refresh photos if needed
          }}
        />
      )}

      {showUploadModal && (
        <Modal
          visible={showUploadModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Photos</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowUploadModal(false);
                    setSelectedImages([]);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#F3F4F6" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <ImagePicker
                  onImagesSelected={handleImagesSelected}
                  onValidationError={handleValidationError}
                  maxImages={100}
                  disabled={isUploading}
                />

                {validationError && (
                  <View style={styles.validationErrorContainer}>
                    <View style={styles.validationErrorHeader}>
                      <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                      <Text style={styles.validationErrorTitle}>File Size Warning</Text>
                    </View>
                    <Text style={styles.validationErrorText}>{validationError}</Text>
                    <TouchableOpacity
                      onPress={() => setValidationError(null)}
                      style={styles.validationErrorDismiss}
                    >
                      <Text style={styles.validationErrorDismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedImages.length > 0 && (
                  <View style={styles.uploadActions}>
                    <Button
                      title={isUploading ? 'Uploading...' : `Upload ${selectedImages.length} Photo${selectedImages.length > 1 ? 's' : ''}`}
                      onPress={handleUpload}
                      variant="primary"
                      size="large"
                      disabled={isUploading}
                      loading={isUploading}
                      style={styles.uploadButton}
                    />
                    {!isUploading && (
                      <TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear Selection</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {uploadProgress && (
                  <View style={styles.progressContainer}>
                    <BatchProgress progress={uploadProgress} />
                  </View>
                )}

                {uploadError && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{uploadError}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalTitle: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  uploadActions: {
    marginTop: 16,
    gap: 12,
  },
  uploadButton: {
    marginBottom: 8,
  },
  clearButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  validationErrorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#78350F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  validationErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  validationErrorTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  validationErrorText: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  validationErrorDismiss: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  validationErrorDismissText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
});

