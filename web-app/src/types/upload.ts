/**
 * TypeScript types for upload functionality
 */

export interface PhotoFile {
  id: string; // Client-side unique ID
  file: File;
  filename: string;
  size: number;
  type: string;
}

export interface UploadJob {
  id: string;
  userId: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  userId: string;
  uploadJobId: string;
  filename: string;
  fileSize: number;
  contentType: string;
  uploadStatus: 'UPLOADING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
}

export interface CreateUploadJobRequest {
  userId: string;
  photos: Array<{
    filename: string;
    fileSize: number;
    contentType: string;
  }>;
}

export interface CreateUploadJobResponse {
  jobId: string;
  photos: Array<{
    photoId: string;
    uploadUrl: string;
  }>;
}

export interface UploadStatusEvent {
  eventType: string;
  photoId?: string;
  jobId: string;
  photoStatus?: string;
  jobStatus?: string;
  progress?: number;
  completedCount?: number;
  failedCount?: number;
  totalCount?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface UploadProgress {
  photoId: string;
  filename: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  uploadTime?: number; // Upload duration in milliseconds
}

export interface BatchUploadProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'partial_success' | 'failed';
  photos: UploadProgress[];
}

