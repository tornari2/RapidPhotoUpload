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
  onTag?: (photo: Photo) => void;
  selectedPhotos?: Set<string>;
  onToggleSelection?: (photoId: string) => void;
  onLoadedCountChange?: (count: number) => void;
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
  onTag,
  selectedPhotos,
  onToggleSelection,
  onLoadedCountChange,
}: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const thumbnailUrlsRef = useRef<Map<string, string>>(new Map());
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    thumbnailUrlsRef.current = thumbnailUrls;
  }, [thumbnailUrls]);

  // Handle photo load completion
  const handlePhotoLoad = useCallback((photoId: string) => {
    setLoadedPhotoIds((prev) => {
      const updated = new Set(prev);
      updated.add(photoId);
      return updated;
    });
  }, []);

  // Don't reset loaded photos - keep them persistent for smooth scrolling
  // Only reset if the photo IDs completely change (e.g., user switch)

  // Notify parent when loaded count changes
  useEffect(() => {
    if (onLoadedCountChange) {
      // Only count non-uploading photos that have loaded
      const loadedCount = photos.filter(
        (photo) => photo.uploadStatus !== 'UPLOADING' && loadedPhotoIds.has(photo.id)
      ).length;
      onLoadedCountChange(loadedCount);
    }
  }, [loadedPhotoIds, photos, onLoadedCountChange]);

  // Prefetch thumbnail URLs for all photos in batches
  useEffect(() => {
    const prefetchThumbnailUrls = async () => {
      // Get photos that don't have cached URLs yet
      const photosToPrefetch = photos.filter(
        (photo) => 
          photo.uploadStatus !== 'UPLOADING' && 
          !thumbnailUrlsRef.current.has(photo.id)
      );

      if (photosToPrefetch.length === 0) return;

      // Prefetch in batches of 20 to avoid overwhelming the server
      const batchSize = 20;
      for (let i = 0; i < photosToPrefetch.length; i += batchSize) {
        const batch = photosToPrefetch.slice(i, i + batchSize);
        
        // Fetch all URLs in parallel for this batch
        const promises = batch.map(async (photo) => {
          try {
            const response = await photoService.getDownloadUrl(photo.id, photo.userId, 60);
            const url = response.downloadUrl;
            
            // Cache the URL
            setThumbnailUrls((prev) => {
              const updated = new Map(prev);
              updated.set(photo.id, url);
              return updated;
            });
            
            // Preload the image in the browser
            const img = new Image();
            img.src = url;
            
            return url;
          } catch (error) {
            console.error(`Failed to prefetch thumbnail URL for ${photo.id}:`, error);
            return null;
          }
        });
        
        await Promise.all(promises);
        
        // Small delay between batches to avoid overwhelming
        if (i + batchSize < photosToPrefetch.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };

    prefetchThumbnailUrls();
  }, [photos]);

  // Get thumbnail URL for a photo (with persistent caching)
  const getThumbnailUrl = useCallback(
    async (photo: Photo): Promise<string> => {
      // Return cached URL if available (use ref to access latest value)
      if (thumbnailUrlsRef.current.has(photo.id)) {
        return thumbnailUrlsRef.current.get(photo.id)!;
      }

      // Fetch download URL (should rarely happen due to prefetching)
      try {
        const response = await photoService.getDownloadUrl(photo.id, photo.userId, 60);
        const url = response.downloadUrl;
        
        // Cache the URL persistently (don't clear on photos array changes)
        setThumbnailUrls((prev) => {
          const updated = new Map(prev);
          updated.set(photo.id, url);
          return updated;
        });
        return url;
      } catch (error) {
        console.error('Failed to get thumbnail URL:', error);
        throw error;
      }
    },
    [] // Stable reference - uses ref to access current cache
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
        <p className="text-white text-lg">No photos found</p>
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
            onTag={onTag}
            isSelected={selectedPhotos?.has(photo.id)}
            onLoad={handlePhotoLoad}
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
        <div className="text-center py-8 text-gray-400 text-sm">
          All photos loaded
        </div>
      )}
    </div>
  );
}

