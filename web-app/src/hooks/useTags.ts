import { useState, useCallback } from 'react';
import { tagService } from '../services/tagService';
import type { TagPhotoRequest, BulkTagPhotosRequest } from '../types/tag';

interface UseTagsReturn {
  tagPhoto: (request: TagPhotoRequest) => Promise<void>;
  bulkTagPhotos: (request: BulkTagPhotosRequest) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing photo tagging operations
 */
export function useTags(): UseTagsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const tagPhoto = useCallback(async (request: TagPhotoRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      await tagService.tagPhoto(request);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to tag photo');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkTagPhotos = useCallback(async (request: BulkTagPhotosRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      await tagService.bulkTagPhotos(request);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk tag photos');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tagPhoto,
    bulkTagPhotos,
    isLoading,
    error,
  };
}

