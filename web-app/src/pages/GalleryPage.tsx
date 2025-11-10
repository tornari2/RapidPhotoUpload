import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePhotos } from '../hooks/usePhotos';
import { useUpload } from '../hooks/useUpload';
import { useDownload } from '../hooks/useDownload';
import { PhotoGrid } from '../components/PhotoGrid/PhotoGrid';
import { BulkTagModal } from '../components/Tagging/BulkTagModal';
import { BulkDownload } from '../components/Download/BulkDownload';
import { TagInput } from '../components/Tagging/TagInput';
import { ProgressBar } from '../components/Common/ProgressBar';
import { useTags } from '../hooks/useTags';
import { photoService } from '../services/photoService';
import { HeaderUploadButton } from '../components/Upload/HeaderUploadButton';
import type { Photo } from '../types/photo';
import type { PhotoFile } from '../types/upload';

/**
 * Unified gallery page combining upload, photos, and dashboard functionality
 */
export default function GalleryPage() {
  const { user } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<Photo | null>(null);
  const [tagInputValue, setTagInputValue] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<Map<string, Photo>>(new Map());
  const [photoTagUpdates, setPhotoTagUpdates] = useState<Map<string, Photo>>(new Map());

  const {
    photos: loadedPhotos,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalElements,
    loadMore,
    error,
    refresh,
  } = usePhotos({
    userId: user?.id || '',
    enabled: !!user?.id,
    pageSize: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const { uploadPhotos, uploadProgress } = useUpload();
  const { photoProgress: downloadProgress } = useDownload();
  const { tagPhoto, isLoading: isTagging } = useTags();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Combine loaded photos with uploading photos and apply tag updates
  const allPhotos = useMemo(() => {
    // Create a Set of loaded photo IDs to prevent duplicates
    const loadedPhotoIds = new Set(loadedPhotos.map(p => p.id));
    
    // Only include uploading photos that aren't already in loadedPhotos
    const uploadingPhotosArray = Array.from(uploadingPhotos.values()).filter(
      photo => !loadedPhotoIds.has(photo.id)
    );
    
    const combined = [...uploadingPhotosArray, ...loadedPhotos];
    
    // Apply tag updates to photos
    return combined.map((photo) => {
      const updated = photoTagUpdates.get(photo.id);
      return updated || photo;
    });
  }, [loadedPhotos, uploadingPhotos, photoTagUpdates]);

  // Calculate how many photos are currently loading
  // Use min to prevent negative or inflated values during deletion/addition transitions
  const photosCurrentlyLoading = useMemo(() => {
    const nonUploadingPhotos = allPhotos.filter(p => p.uploadStatus !== 'UPLOADING');
    const effectiveLoadedCount = Math.min(loadedCount, nonUploadingPhotos.length);
    return Math.max(0, nonUploadingPhotos.length - effectiveLoadedCount);
  }, [allPhotos, loadedCount]);

  // Sync loadedCount when allPhotos changes (handles deletions/additions)
  useEffect(() => {
    const nonUploadingPhotos = allPhotos.filter(p => p.uploadStatus !== 'UPLOADING');
    // If we have fewer photos than loaded count, adjust it down (photo was deleted)
    if (nonUploadingPhotos.length < loadedCount) {
      setLoadedCount(nonUploadingPhotos.length);
    }
  }, [allPhotos, loadedCount]);

  // Delay showing loading screen to prevent flicker on fast refreshes
  useEffect(() => {
    if (isLoading && allPhotos.length === 0) {
      // Only show loading screen after 150ms delay
      const timer = setTimeout(() => {
        setShowLoadingScreen(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Hide loading screen immediately when we have photos or loading completes
      setShowLoadingScreen(false);
    }
  }, [isLoading, allPhotos.length]);

  // Prevent body scroll - only the photo grid should scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Auto-refresh when window/tab comes into focus and periodic refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab/window became visible, refresh photos
        refresh();
      }
    };

    const handleFocus = () => {
      // Window gained focus, refresh photos
      refresh();
    };

    // Listen for visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Periodic refresh every 30 seconds when tab is visible
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 30000); // 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [refresh]);

  // Eagerly load all remaining photos after initial load completes
  // This effect will trigger loadMore whenever we're ready for the next page
  useEffect(() => {
    // Only trigger if:
    // 1. Initial load is complete
    // 2. Not currently loading more
    // 3. There are more pages to load
    // 4. We have at least some photos loaded
    if (!isLoading && !isLoadingMore && hasNextPage && loadedPhotos.length > 0) {
      // Trigger loadMore - the effect will run again when state updates
      // This creates a chain reaction that loads all pages
      loadMore();
    }
  }, [isLoading, isLoadingMore, hasNextPage, loadedPhotos.length, loadMore]);

  // Update uploading photos from upload progress
  useEffect(() => {
    if (uploadProgress) {
      setUploadingPhotos((prev) => {
        const newUploadingPhotos = new Map<string, Photo>();
        
        uploadProgress.photos.forEach((progress) => {
          const existingPhoto = prev.get(progress.photoId);
          
          if (progress.status === 'completed') {
            // Photo is done uploading, keep it briefly then it will be removed
            // It will appear in loadedPhotos after refresh
            if (existingPhoto) {
              newUploadingPhotos.set(progress.photoId, {
                ...existingPhoto,
                uploadStatus: 'COMPLETED',
              });
            }
            return;
          }
          
          // Create or update photo object for uploading photos
          const photo: Photo = existingPhoto || {
            id: progress.photoId,
            userId: user?.id || '',
            uploadJobId: uploadProgress.jobId,
            filename: progress.filename,
            s3Key: '', // Not available yet
            fileSize: 0,
            contentType: 'image/*',
            uploadStatus: progress.status === 'failed' ? 'FAILED' : 'UPLOADING',
            createdAt: new Date().toISOString(),
          };
          
          photo.uploadStatus = progress.status === 'failed' ? 'FAILED' : 'UPLOADING';
          newUploadingPhotos.set(progress.photoId, photo);
        });
        
        return newUploadingPhotos;
      });
      
      // Refresh photos when upload completes
      if (uploadProgress.status === 'completed' || uploadProgress.status === 'partial_success') {
        setTimeout(() => {
          refresh();
          // Clear uploading photos after a short delay to allow backend to process
          setTimeout(() => {
            setUploadingPhotos(new Map());
          }, 2000);
        }, 1000);
      }
    }
  }, [uploadProgress, user?.id, refresh]);

  // Listen for upload files event from header button
  useEffect(() => {
    const handleUploadFiles = (event: Event) => {
      const customEvent = event as CustomEvent<{ files: File[] }>;
      const files = customEvent.detail.files;
      
      if (!files || files.length === 0 || !user?.id) return;

      const photoFiles: PhotoFile[] = files
        .filter((file) => file.type.startsWith('image/'))
        .map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          filename: file.name,
          size: file.size,
          type: file.type,
        }));

      if (photoFiles.length > 0) {
        uploadPhotos(photoFiles);
      }
    };

    window.addEventListener('uploadFiles', handleUploadFiles as EventListener);
    return () => {
      window.removeEventListener('uploadFiles', handleUploadFiles as EventListener);
    };
  }, [user?.id, uploadPhotos]);

  const handlePhotoClick = (photo: Photo) => {
    // Don't allow selecting uploading photos
    if (photo.uploadStatus === 'UPLOADING') {
      return;
    }
    
    // Toggle selection
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        next.add(photo.id);
      }
      return next;
    });
  };

  const handleTagPhoto = async () => {
    if (!taggingPhoto || !user || tagInputValue.length === 0) return;

    try {
      await tagPhoto({
        photoId: taggingPhoto.id,
        userId: user.id,
        tagNames: tagInputValue,
      });
      
      // Fetch updated photo metadata with tags
        const updatedPhoto = await photoService.getPhotoMetadata(
          taggingPhoto.id,
          user.id,
          true,
          true
        );
      
      // Convert tags from string[] to Tag[] format
      // PhotoMetadataResponse has tags as string[], but Photo needs {id, name}[]
      const photoWithTags: Photo = {
        ...updatedPhoto,
        tags: updatedPhoto.tags?.map((tagName, index) => ({
          id: `${taggingPhoto.id}-tag-${index}`,
          name: tagName,
        })) || [],
      };
      
      // Store the updated photo with tags in our tag updates map
      setPhotoTagUpdates((prev) => {
        const updated = new Map(prev);
        updated.set(taggingPhoto.id, photoWithTags);
        return updated;
      });
      
      // Update uploading photo if it's in the uploading map
      if (uploadingPhotos.has(taggingPhoto.id)) {
        setUploadingPhotos((prev) => {
          const updated = new Map(prev);
          updated.set(taggingPhoto.id, photoWithTags);
          return updated;
        });
      }
      
      // Also refresh to ensure consistency (though tags won't be in the response)
      await refresh();
      
      // Deselect the tagged photo
      setSelectedPhotos((prev) => {
        const updated = new Set(prev);
        updated.delete(taggingPhoto.id);
        return updated;
      });
      
      setShowTagModal(false);
      setTaggingPhoto(null);
      setTagInputValue([]);
    } catch (err) {
      console.error('Failed to tag photo:', err);
      alert('Failed to tag photo. Please try again.');
    }
  };

  const handleOpenTagModal = (photo: Photo) => {
    // Don't allow tagging photos that are still uploading
    if (photo.uploadStatus === 'UPLOADING') {
      alert('Cannot tag a photo that is currently uploading. Please wait for the upload to complete.');
      return;
    }
    setTaggingPhoto(photo);
    setTagInputValue(photo.tags?.map((t) => t.name) || []);
    setShowTagModal(true);
  };

  const handleBulkTagSuccess = async () => {
    if (!user) return;
    
    // Fetch updated photos with tags from the backend
    const selectedPhotoIds = Array.from(selectedPhotos);
    
    try {
      // Fetch each tagged photo's metadata to get the updated tags
      const updatedPhotosPromises = selectedPhotoIds.map(photoId =>
        photoService.getPhotoMetadata(photoId, user.id, true, true)
      );
      
      const updatedPhotosMetadata = await Promise.all(updatedPhotosPromises);
      
      // Update the photo tag updates map with the new tag data
      setPhotoTagUpdates((prev) => {
        const updated = new Map(prev);
        
        updatedPhotosMetadata.forEach((metadata) => {
          // Convert PhotoMetadataResponse to Photo format
          const photoWithTags: Photo = {
            id: metadata.id,
            userId: metadata.userId,
            uploadJobId: metadata.uploadJobId,
            filename: metadata.filename,
            s3Key: metadata.s3Key,
            fileSize: metadata.fileSize,
            contentType: metadata.contentType,
            uploadStatus: metadata.uploadStatus,
            retryCount: metadata.retryCount,
            createdAt: metadata.createdAt,
            completedAt: metadata.completedAt,
            // Convert tags from string[] to Tag[] format
            tags: metadata.tags?.map((tagName, index) => ({
              id: `${metadata.id}-tag-${index}`, // Temporary ID
              name: tagName,
            })) || [],
          };
          
          updated.set(metadata.id, photoWithTags);
        });
        
        return updated;
      });
      
      // Also refresh to ensure full consistency
      refresh();
    } catch (err) {
      console.error('Failed to fetch updated tags:', err);
      // Fallback to just refreshing
      refresh();
    }
    
    setSelectedPhotos(new Set());
  };

  const handleToggleSelection = (photoId: string) => {
    // Don't allow selecting uploading photos
    const photo = allPhotos.find((p) => p.id === photoId);
    if (photo && photo.uploadStatus === 'UPLOADING') {
      return;
    }
    
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    // Filter out uploading photos
    const selectablePhotos = allPhotos.filter((p) => p.uploadStatus !== 'UPLOADING');
    
    if (selectedPhotos.size === selectablePhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(selectablePhotos.map((p) => p.id)));
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!user) return;
    
    // Don't allow deletion of photos that are still uploading
    if (photo.uploadStatus === 'UPLOADING') {
      alert('Cannot delete a photo that is currently uploading. Please wait for the upload to complete.');
      return;
    }
    
    setIsDeleting(true);
    
    // Optimistically remove the photo from local state immediately
    const previousPhotos = loadedPhotos;
    
    // Remove from loaded photos optimistically
    setLoadedCount(prev => Math.max(0, prev - 1));
    
    try {
      await photoService.deletePhoto(photo.id, user.id);
      
      // Remove from uploading photos if present
      setUploadingPhotos((prev) => {
        const updated = new Map(prev);
        updated.delete(photo.id);
        return updated;
      });
      
      // Remove from selected photos if it was selected
      setSelectedPhotos((prev) => {
        const updated = new Set(prev);
        updated.delete(photo.id);
        return updated;
      });
      
      // Remove from tag updates
      setPhotoTagUpdates((prev) => {
        const updated = new Map(prev);
        updated.delete(photo.id);
        return updated;
      });
      
      // Silently refresh in background to ensure consistency
      refresh();
    } catch (err: any) {
      console.error('Failed to delete photo:', err);
      
      // Check if it's a 404 or "not found" error - photo might already be deleted
      const statusCode = err?.response?.status;
      const errorMessage = err?.response?.data?.message || err?.message || '';
      
      if (statusCode === 404 || errorMessage.toLowerCase().includes('not found')) {
        // Photo already deleted, just refresh the list silently
        await refresh();
        
        // Remove from uploading photos if present
        setUploadingPhotos((prev) => {
          const updated = new Map(prev);
          updated.delete(photo.id);
          return updated;
        });
        
        // Remove from selected photos if it was selected
        setSelectedPhotos((prev) => {
          const updated = new Set(prev);
          updated.delete(photo.id);
          return updated;
        });
      } else {
        // For other errors (access denied, etc.), show an alert and restore state
        const displayMessage = errorMessage || 'Failed to delete photo. Please try again.';
        alert(`Failed to delete photo: ${displayMessage}`);
        
        // Restore previous state on error
        setLoadedCount(previousPhotos.length);
      }
    } finally {
      // Small delay before clearing isDeleting to prevent progress bar flicker
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedPhotos.size === 0) return;
    
    // Filter out uploading photos
    const uploadablePhotoIds = Array.from(selectedPhotos).filter((id) => {
      const photo = allPhotos.find((p) => p.id === id);
      return photo && photo.uploadStatus !== 'UPLOADING';
    });
    
    if (uploadablePhotoIds.length === 0) {
      alert('Cannot delete photos that are currently uploading. Please wait for the uploads to complete.');
      return;
    }
    
    setIsDeleting(true);
    try {
      const deleteResults = await Promise.allSettled(
        uploadablePhotoIds.map((photoId) => {
        const photo = allPhotos.find((p) => p.id === photoId);
        if (photo) {
          return photoService.deletePhoto(photoId, user.id);
        }
        return Promise.resolve();
        })
      );
      
      // Check for errors (excluding 404s which mean already deleted)
      const errors = deleteResults.filter((result) => {
        if (result.status === 'rejected') {
          const err = result.reason as any;
          const statusCode = err?.response?.status;
          const errorMessage = err?.response?.data?.message || err?.message || '';
          // Don't count 404 or "not found" as errors - photo already deleted
          return statusCode !== 404 && !errorMessage.toLowerCase().includes('not found');
        }
        return false;
      });
      
      // Refresh the list regardless of errors
      await refresh();
      
      // Remove from uploading photos
      setUploadingPhotos((prev) => {
        const updated = new Map(prev);
        uploadablePhotoIds.forEach((id) => updated.delete(id));
        return updated;
      });
      
      setSelectedPhotos(new Set());
      
      // Only show alert if there were real errors (not 404s)
      if (errors.length > 0) {
        alert(`Failed to delete ${errors.length} photo(s). Please try again.`);
      }
    } catch (err) {
      console.error('Failed to delete photos:', err);
      // Still refresh the list even if there's an error
      await refresh();
      setSelectedPhotos(new Set());
    } finally {
      // Small delay before clearing isDeleting to prevent progress bar flicker
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    }
  };


  const selectedPhotosList = allPhotos.filter((p) => selectedPhotos.has(p.id));

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Please log in to view your photos</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-black flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 max-w-7xl w-full mx-auto px-6 lg:px-8 pt-6 pb-4 relative z-[80]"
        id="gallery-header"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Photos</h1>
            <p className="mt-2 text-white">
              {totalElements > 0 && (
                <span>
                  {totalElements} photo{totalElements !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3" id="gallery-header-actions">
            <HeaderUploadButton />
            {selectedPhotos.size > 0 && (
              <>
                <span className="text-sm text-white">
                  {selectedPhotos.size} selected
                </span>
                <BulkDownload
                  photos={selectedPhotosList}
                  onComplete={() => {
                    // Clear selections after download completes
                    setSelectedPhotos(new Set());
                  }}
                />
                <button
                  onClick={() => setShowBulkTagModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Tag Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
                <button
                  onClick={() => setSelectedPhotos(new Set())}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {allPhotos.length > 0 && (
          <div className="mb-4" id="gallery-select-row">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-800 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 border border-gray-500 rounded-md hover:from-gray-400 hover:via-gray-300 hover:to-gray-500 shadow-md hover:shadow-lg transition-all"
            >
              {(() => {
                const selectablePhotos = allPhotos.filter((p) => p.uploadStatus !== 'UPLOADING');
                return selectedPhotos.size === selectablePhotos.length && selectablePhotos.length > 0
                  ? 'Deselect All'
                  : 'Select All';
              })()}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            <p className="font-medium">Error loading photos</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-6 lg:px-8 pt-6 pb-6">
        {/* Global loading progress bar - only show when 2+ photos are loading simultaneously */}
        {!showLoadingScreen && !isDeleting && photosCurrentlyLoading >= 2 && (
          <div className="mb-6 px-8">
            <div className="w-full max-w-2xl mx-auto">
              <ProgressBar 
                size="md" 
                color="blue" 
                showLabel 
                label={`Loading photos: ${loadedCount} of ${allPhotos.filter(p => p.uploadStatus !== 'UPLOADING').length}`}
              />
            </div>
          </div>
        )}
        
        <PhotoGrid
          photos={allPhotos}
          isLoading={showLoadingScreen}
          isLoadingMore={isLoadingMore}
          hasNextPage={hasNextPage}
          onLoadMore={loadMore}
          onPhotoClick={handlePhotoClick}
          onDelete={handleDeletePhoto}
          onTag={handleOpenTagModal}
          selectedPhotos={selectedPhotos}
          onToggleSelection={handleToggleSelection}
          onLoadedCountChange={setLoadedCount}
          downloadProgress={downloadProgress}
          uploadProgress={uploadProgress}
        />
      </div>

        {/* Tag Modal for single photo */}
        {showTagModal && taggingPhoto && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Tag Photo</h2>
                <button
                  onClick={() => {
                    setShowTagModal(false);
                    setTaggingPhoto(null);
                    setTagInputValue([]);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">
                    Tags
                  </label>
                  <TagInput
                    tags={tagInputValue}
                    onChange={setTagInputValue}
                    placeholder="Add tags (press Enter to add)"
                    maxTags={10}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTagModal(false);
                      setTaggingPhoto(null);
                      setTagInputValue([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700"
                    disabled={isTagging}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTagPhoto}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isTagging || tagInputValue.length === 0}
                  >
                    {isTagging ? 'Tagging...' : 'Save Tags'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Tag Modal */}
        {showBulkTagModal && user && (
          <BulkTagModal
            isOpen={showBulkTagModal}
            onClose={() => setShowBulkTagModal(false)}
            photos={selectedPhotosList}
            userId={user.id}
            onSuccess={handleBulkTagSuccess}
          />
        )}
    </div>
  );
}

