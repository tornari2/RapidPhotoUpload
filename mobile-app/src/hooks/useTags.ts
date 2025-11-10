import { useState, useCallback, useEffect } from 'react';
import { tagService } from '../services/tagService';
import { useAuth } from '../contexts/AuthContext';
import type { Tag } from '../types';

/**
 * Hook for managing tags
 */
export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // getUserTags now handles 404 gracefully and returns empty array
      const userTags = await tagService.getUserTags();
      setTags(userTags);
    } catch (err: any) {
      // This shouldn't happen now since getUserTags returns empty array instead of throwing
      // But keep this as a safety net
      console.error('Unexpected error loading tags:', err);
      setTags([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tagPhoto = useCallback(async (photoId: string, tagNames: string[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    try {
      await tagService.tagPhoto(photoId, user.id, tagNames);
      await loadTags(); // Refresh tags list
    } catch (err: any) {
      throw new Error(err.message || 'Failed to tag photo');
    }
  }, [loadTags, user?.id]);

  const bulkTagPhotos = useCallback(async (photoIds: string[], tagNames: string[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    try {
      await tagService.bulkTagPhotos(photoIds, user.id, tagNames);
      await loadTags(); // Refresh tags list
    } catch (err: any) {
      throw new Error(err.message || 'Failed to tag photos');
    }
  }, [loadTags, user?.id]);

  const removeTags = useCallback(async (photoId: string, tagIds: string[]) => {
    try {
      await tagService.removeTags(photoId, tagIds);
      await loadTags(); // Refresh tags list
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove tags');
    }
  }, [loadTags]);

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    tags,
    isLoading,
    error,
    tagPhoto,
    bulkTagPhotos,
    removeTags,
    refreshTags: loadTags,
  };
}

