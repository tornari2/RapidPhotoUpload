import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PhotoViewer } from './PhotoViewer';
import { usePhotos } from '../../hooks/usePhotos';
import type { Photo } from '../../types';

interface PhotoGridProps {
  onDownload?: (photo: Photo) => void;
  onTag?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  multiSelect?: boolean;
  onSelectionChange?: (selectedPhotos: Photo[]) => void;
  selectAll?: boolean;
  onSelectAllChange?: (selectAll: boolean) => void;
  // Optional props to allow parent to control photos state
  photos?: Photo[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  onDownload,
  onTag,
  onDelete,
  multiSelect = false,
  onSelectionChange,
  selectAll = false,
  onSelectAllChange,
  // Optional controlled props
  photos: controlledPhotos,
  isLoading: controlledIsLoading,
  isRefreshing: controlledIsRefreshing,
  isLoadingMore: controlledIsLoadingMore,
  hasMore: controlledHasMore,
  onRefresh: controlledRefresh,
  onLoadMore: controlledLoadMore,
}) => {
  // Use controlled props if provided, otherwise use hook
  const hookData = usePhotos();
  const photos = controlledPhotos ?? hookData.photos;
  const isLoading = controlledIsLoading ?? hookData.isLoading;
  const isRefreshing = controlledIsRefreshing ?? hookData.isRefreshing;
  const isLoadingMore = controlledIsLoadingMore ?? hookData.isLoadingMore;
  const hasMore = controlledHasMore ?? hookData.hasMore;
  const refresh = controlledRefresh ?? hookData.refresh;
  const loadMore = controlledLoadMore ?? hookData.loadMore;

  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const lastSelectAllPropRef = useRef(selectAll);
  const skipNextSyncRef = useRef(false);

  // Only use focus effect if we're using the hook (not controlled)
  useFocusEffect(
    React.useCallback(() => {
      if (!controlledPhotos) {
        refresh();
      }
    }, [refresh, controlledPhotos])
  );

  // Close viewer if the currently viewing photo was deleted
  useEffect(() => {
    if (viewingPhoto && !photos.find((p) => p.id === viewingPhoto.id)) {
      setViewingPhoto(null);
    }
  }, [photos, viewingPhoto]);

  // Clear selected photos that no longer exist
  useEffect(() => {
    const photoIds = new Set(photos.map((p) => p.id));
    setSelectedPhotos((prev) => {
      const filtered = new Set(Array.from(prev).filter((id) => photoIds.has(id)));
      if (filtered.size !== prev.size) {
        // Update parent if selection changed
        const selectedPhotosArray = photos.filter((p) => filtered.has(p.id));
        onSelectionChange?.(selectedPhotosArray);
      }
      return filtered;
    });
  }, [photos, onSelectionChange]);

  // Handle select all changes from parent
  useEffect(() => {
    if (!multiSelect) {
      setSelectedPhotos(new Set());
      lastSelectAllPropRef.current = selectAll;
      return;
    }
    
    // Skip if this was triggered by our own update
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      lastSelectAllPropRef.current = selectAll;
      return;
    }
    
    // Only react to actual prop changes
    if (selectAll === lastSelectAllPropRef.current) {
      return;
    }
    
    lastSelectAllPropRef.current = selectAll;
    
    if (selectAll) {
      const allPhotoIds = new Set(photos.map((p) => p.id));
      setSelectedPhotos(allPhotoIds);
      onSelectionChange?.(photos);
    } else {
      setSelectedPhotos(new Set());
      onSelectionChange?.([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAll, multiSelect]);

  // Update parent's selectAll state when individual selections change
  useEffect(() => {
    if (!multiSelect || !onSelectAllChange) return;
    
    // Check if all current photos are selected
    const allPhotoIds = new Set(photos.map((p) => p.id));
    const allSelected = photos.length > 0 && 
                       allPhotoIds.size === selectedPhotos.size &&
                       Array.from(allPhotoIds).every(id => selectedPhotos.has(id));
    
    // Only update if state differs from prop
    if (allSelected !== selectAll) {
      skipNextSyncRef.current = true;
      onSelectAllChange(allSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotos.size, photos.length, multiSelect]);

  const handleSelect = useCallback(
    (photo: Photo) => {
      if (!multiSelect) {
        setViewingPhoto(photo);
        return;
      }

      const newSelected = new Set(selectedPhotos);
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else {
        newSelected.add(photo.id);
      }
      setSelectedPhotos(newSelected);

      const selectedPhotosArray = photos.filter((p) => newSelected.has(p.id));
      onSelectionChange?.(selectedPhotosArray);
    },
    [multiSelect, selectedPhotos, photos, onSelectionChange]
  );

  const handlePress = useCallback((photo: Photo) => {
    setViewingPhoto(photo);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Photo }) => (
      <PhotoThumbnail
        photo={item}
        onPress={handlePress}
        onDownload={onDownload}
        onTag={onTag}
        onDelete={onDelete}
        isSelected={selectedPhotos.has(item.id)}
        onSelect={handleSelect}
      />
    ),
    [handlePress, handleSelect, onDownload, onTag, onDelete, selectedPhotos]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos yet</Text>
        <Text style={styles.emptySubtext}>Upload some photos to get started</Text>
      </View>
    );
  }, [isLoading]);

  if (isLoading && photos.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#8B5CF6" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={photos}
          onClose={() => setViewingPhoto(null)}
          onDownload={onDownload}
          onTag={onTag}
          onDelete={onDelete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    padding: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});

