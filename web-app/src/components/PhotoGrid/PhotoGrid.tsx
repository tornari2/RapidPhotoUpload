import { useEffect, useRef, useCallback, useState } from 'react';
import { PhotoThumbnail } from './PhotoThumbnail';
import type { Photo } from '../../types/photo';
import { photoService } from '../../services/photoService';

interface PhotoGridProps {
  photos: Photo[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onPhotoClick: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
}

/**
 * Photo grid component with CSS Grid layout and infinite scroll
 */
export function PhotoGrid({
  photos,
  isLoading,
  isLoadingMore,
  hasNextPage,
  onLoadMore,
  onPhotoClick,
  onDelete,
}: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());

  // Get thumbnail URL for a photo (with caching)
  const getThumbnailUrl = useCallback(
    async (photo: Photo): Promise<string> => {
      // Return cached URL if available
      if (thumbnailUrls.has(photo.id)) {
        return thumbnailUrls.get(photo.id)!;
      }

      // Fetch download URL
      try {
        const response = await photoService.getDownloadUrl(photo.id, photo.userId, 60);
        const url = response.downloadUrl;
        
        // Cache the URL
        setThumbnailUrls((prev) => new Map(prev).set(photo.id, url));
        return url;
      } catch (error) {
        console.error('Failed to get thumbnail URL:', error);
        throw error;
      }
    },
    [thumbnailUrls]
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: '100px', // Trigger 100px before reaching the bottom
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isLoadingMore, isLoading, onLoadMore]);

  if (isLoading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No photos found</p>
        <p className="text-gray-400 text-sm mt-2">Upload some photos to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* CSS Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            onClick={onPhotoClick}
            getThumbnailUrl={getThumbnailUrl}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center">
          {isLoadingMore && (
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasNextPage && photos.length > 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          All photos loaded
        </div>
      )}
    </div>
  );
}

