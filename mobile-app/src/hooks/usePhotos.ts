import { useState, useCallback, useEffect, useRef } from 'react';
import { photoService } from '../services/photoService';
import { useAuth } from '../contexts/AuthContext';
import type { Photo, PaginatedResponse } from '../types';

/**
 * Hook for managing photo fetching with infinite scroll
 */
export function usePhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const isLoadingRef = useRef(false); // Prevent concurrent loads
  const lastUserIdRef = useRef<string | null>(null); // Track last loaded user ID

  const loadPhotos = useCallback(
    async (page: number, append: boolean = false) => {
      const currentUserId = user?.id;
      
      if (!currentUserId || isLoadingRef.current) return;
      
      // Validate user ID is a valid UUID format (not empty)
      if (currentUserId.trim() === '') {
        console.warn('Cannot load photos: user ID is empty');
        setError('User ID is missing');
        return;
      }

      // Prevent loading if we're already loading for this user
      if (lastUserIdRef.current === currentUserId && isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;
      lastUserIdRef.current = currentUserId;
      
      try {
        if (page === 0) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const response: PaginatedResponse<Photo> = await photoService.getUserPhotos(
          currentUserId,
          page,
          pageSize
        );

        if (append) {
          setPhotos((prev) => [...prev, ...response.content]);
        } else {
          setPhotos(response.content);
        }

        setHasMore(!response.last);
        setCurrentPage(page);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load photos';
        setError(errorMessage);
        console.error('Error loading photos:', err);
        // Don't spam errors - only log once per error type
        if (!append) {
          // Only show error on initial load, not on pagination
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
        isLoadingRef.current = false;
      }
    },
    [user?.id] // Only depend on user.id, not the whole user object
  );

  const refresh = useCallback(async () => {
    if (isLoadingRef.current) return;
    setIsRefreshing(true);
    await loadPhotos(0, false);
  }, [loadPhotos]);

  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore && !isLoading && !isLoadingRef.current) {
      await loadPhotos(currentPage + 1, true);
    }
  }, [currentPage, hasMore, isLoadingMore, isLoading, loadPhotos]);

  useEffect(() => {
    const currentUserId = user?.id;
    const isValidUserId = currentUserId && currentUserId.trim() !== '';
    
    // Only load if user ID changed and is valid
    if (isValidUserId && lastUserIdRef.current !== currentUserId) {
      loadPhotos(0, false);
    } else if (!isValidUserId && lastUserIdRef.current !== null) {
      // Clear photos if user logs out or has no valid ID
      setPhotos([]);
      setHasMore(true);
      setCurrentPage(0);
      lastUserIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id

  return {
    photos,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}

