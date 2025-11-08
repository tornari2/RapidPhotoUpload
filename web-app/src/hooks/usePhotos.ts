import { useState, useEffect, useCallback, useRef } from 'react';
import { photoService } from '../services/photoService';
import type { Photo, GetUserPhotosParams } from '../types/photo';

interface UsePhotosOptions {
  userId: string;
  status?: Photo['uploadStatus'];
  uploadJobId?: string;
  pageSize?: number;
  sortBy?: GetUserPhotosParams['sortBy'];
  sortDirection?: GetUserPhotosParams['sortDirection'];
  enabled?: boolean;
}

interface UsePhotosReturn {
  photos: Photo[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalElements: number;
  totalPages: number;
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
}

/**
 * Hook for fetching and managing photos with infinite scroll support
 */
export function usePhotos(options: UsePhotosOptions): UsePhotosReturn {
  const {
    userId,
    status,
    uploadJobId,
    pageSize = 20,
    sortBy = 'createdAt',
    sortDirection = 'desc',
    enabled = true,
  } = options;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPhotos = useCallback(
    async (page: number, append = false) => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        if (page === 0) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const response = await photoService.getUserPhotos({
          userId,
          status,
          uploadJobId,
          page,
          size: pageSize,
          sortBy,
          sortDirection,
        });

        if (append) {
          setPhotos((prev) => [...prev, ...response.photos]);
        } else {
          setPhotos(response.photos);
        }

        setHasNextPage(response.hasNext);
        setHasPreviousPage(response.hasPrevious);
        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
      } catch (err) {
        // Don't set error if request was aborted
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err as Error);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        abortControllerRef.current = null;
      }
    },
    [userId, status, uploadJobId, pageSize, sortBy, sortDirection]
  );

  // Initial load
  useEffect(() => {
    if (enabled && userId) {
      setCurrentPage(0);
      fetchPhotos(0, false);
    }
  }, [enabled, userId, status, uploadJobId, sortBy, sortDirection, fetchPhotos]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasNextPage && enabled) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPhotos(nextPage, true);
    }
  }, [isLoadingMore, isLoading, hasNextPage, enabled, currentPage, fetchPhotos]);

  const refresh = useCallback(() => {
    setCurrentPage(0);
    fetchPhotos(0, false);
  }, [fetchPhotos]);

  const reset = useCallback(() => {
    setPhotos([]);
    setCurrentPage(0);
    setHasNextPage(false);
    setHasPreviousPage(false);
    setTotalElements(0);
    setTotalPages(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    photos,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    hasPreviousPage,
    totalElements,
    totalPages,
    loadMore,
    refresh,
    reset,
  };
}

