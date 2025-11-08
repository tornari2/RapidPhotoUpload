/**
 * TypeScript types for tag functionality
 */

export interface Tag {
  id: string;
  name: string;
}

export interface TagPhotoRequest {
  photoId: string;
  userId: string;
  tagNames: string[];
}

export interface TagPhotoResponse {
  photoId: string;
  addedTags: string[];
  existingTags: string[];
  totalTags: number;
}

export interface BulkTagPhotosRequest {
  userId: string;
  photoIds: string[];
  tagNames: string[];
}

export interface BulkTagPhotosResponse {
  totalPhotos: number;
  successfulPhotos: number;
  failedPhotos: number;
  failures: Record<string, string>; // photoId -> error message
  results: TagPhotoResponse[];
}

