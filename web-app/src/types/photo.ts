/**
 * TypeScript types for photo functionality
 */

export type PhotoStatus = 'UPLOADING' | 'COMPLETED' | 'FAILED';

export interface Photo {
  id: string;
  userId: string;
  uploadJobId: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  contentType: string;
  uploadStatus: PhotoStatus;
  retryCount?: number;
  createdAt: string;
  completedAt?: string;
  tags?: Array<{
    id: string;
    name: string;
  }>;
}

export interface GetUserPhotosResponse {
  photos: Photo[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface GetUserPhotosParams {
  userId: string;
  status?: PhotoStatus;
  uploadJobId?: string;
  page?: number;
  size?: number;
  sortBy?: 'createdAt' | 'filename' | 'fileSize' | 'uploadStatus';
  sortDirection?: 'asc' | 'desc';
}

export interface DownloadPhotoResponse {
  photoId: string;
  downloadUrl: string;
  filename: string;
  contentType: string;
  fileSize: number;
  expirationMinutes: number;
}

export interface PhotoMetadataResponse {
  id: string;
  userId: string;
  uploadJobId: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  contentType: string;
  uploadStatus: PhotoStatus;
  retryCount?: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  tags?: string[]; // Backend returns tags as string array
}

