import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePhotos } from '../hooks/usePhotos';
import { PhotoGrid } from '../components/PhotoGrid/PhotoGrid';
import { PhotoModal } from '../components/PhotoGrid/PhotoModal';
import { BulkTagModal } from '../components/Tagging/BulkTagModal';
import { BulkDownload } from '../components/Download/BulkDownload';
import { TagInput } from '../components/Tagging/TagInput';
import { useTags } from '../hooks/useTags';
import { photoService } from '../services/photoService';
import type { Photo } from '../types/photo';

/**
 * Photos page component with photo grid, modal, and tagging
 */
export default function PhotosPage() {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [taggingPhoto, setTaggingPhoto] = useState<Photo | null>(null);
  const [tagInputValue, setTagInputValue] = useState<string[]>([]);

  const {
    photos,
    isLoading,
    isLoadingMore,
    hasNextPage,
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

  const { tagPhoto, isLoading: isTagging } = useTags();
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePhotoClick = (photo: Photo) => {
    const index = photos.findIndex((p) => p.id === photo.id);
    setSelectedPhotoIndex(index);
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(-1);
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex < photos.length - 1) {
      const nextIndex = selectedPhotoIndex + 1;
      setSelectedPhotoIndex(nextIndex);
      setSelectedPhoto(photos[nextIndex]);
    } else if (hasNextPage) {
      loadMore();
    }
  };

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex > 0) {
      const prevIndex = selectedPhotoIndex - 1;
      setSelectedPhotoIndex(prevIndex);
      setSelectedPhoto(photos[prevIndex]);
    }
  };

  const handleTagPhoto = async () => {
    if (!taggingPhoto || !user || tagInputValue.length === 0) return;

    try {
      await tagPhoto({
        photoId: taggingPhoto.id,
        userId: user.id,
        tagNames: tagInputValue,
      });
      
      // Refresh photos to get updated tags
      await refresh();
      
      // Update selected photo if it's the one we tagged
      if (selectedPhoto?.id === taggingPhoto.id) {
        const updatedPhoto = await photoService.getPhotoMetadata(
          taggingPhoto.id,
          user.id,
          true,
          true
        );
        setSelectedPhoto(updatedPhoto as Photo);
      }
      
      setShowTagModal(false);
      setTaggingPhoto(null);
      setTagInputValue([]);
    } catch (err) {
      console.error('Failed to tag photo:', err);
    }
  };

  const handleOpenTagModal = (photo: Photo) => {
    setTaggingPhoto(photo);
    setTagInputValue(photo.tags?.map((t) => t.name) || []);
    setShowTagModal(true);
  };

  const handleBulkTagSuccess = () => {
    refresh();
    setSelectedPhotos(new Set());
  };

  const handleToggleSelection = (photoId: string) => {
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
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      await photoService.deletePhoto(photo.id, user.id);
      await refresh();
      
      // Close modal if the deleted photo was selected
      if (selectedPhoto?.id === photo.id) {
        handleCloseModal();
      }
    } catch (err: any) {
      console.error('Failed to delete photo:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete photo. Please try again.';
      alert(`Failed to delete photo: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedPhotos.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedPhotos).map((photoId) => {
        const photo = photos.find((p) => p.id === photoId);
        if (photo) {
          return photoService.deletePhoto(photoId, user.id);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      await refresh();
      setSelectedPhotos(new Set());
    } catch (err) {
      console.error('Failed to delete photos:', err);
      alert('Failed to delete some photos. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedPhotosList = photos.filter((p) => selectedPhotos.has(p.id));

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to view your photos</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Photos</h1>
            <p className="mt-2 text-gray-600">
              {photos.length > 0 && (
                <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          
          {selectedPhotos.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedPhotos.size} selected
              </span>
              <BulkDownload
                photos={selectedPhotosList}
                onComplete={() => {
                  // Optionally clear selection after download
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {selectedPhotos.size === 0 && photos.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Error loading photos</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        )}

        <PhotoGrid
          photos={photos}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasNextPage={hasNextPage}
          onLoadMore={loadMore}
          onPhotoClick={handlePhotoClick}
          onDelete={handleDeletePhoto}
        />

        <PhotoModal
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={handleCloseModal}
          onNext={handleNextPhoto}
          onPrevious={handlePreviousPhoto}
          onTagClick={handleOpenTagModal}
          onDelete={handleDeletePhoto}
          hasNext={selectedPhotoIndex < photos.length - 1 || hasNextPage}
          hasPrevious={selectedPhotoIndex > 0}
        />

        {/* Tag Modal for single photo */}
        {showTagModal && taggingPhoto && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Tag Photo</h2>
                <button
                  onClick={() => {
                    setShowTagModal(false);
                    setTaggingPhoto(null);
                    setTagInputValue([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
    </div>
  );
}
