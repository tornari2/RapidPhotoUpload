// Upload types for mobile app
export interface PhotoFile {
  uri: string;
  filename: string;
  fileSize: number;
  type: string;
  width?: number;
  height?: number;
}

export interface CreateUploadJobRequest {
  photos: Array<{
    filename: string;
    fileSize: number;
    contentType: string;
  }>;
}

export interface PhotoUploadResponse {
  photoId: string;
  uploadUrl: string;
  s3Key: string;
}

export interface CreateUploadJobResponse {
  jobId: string;
  photos: PhotoUploadResponse[];
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
  progress: number; // Overall percentage
  status: 'pending' | 'uploading' | 'completed' | 'partial_success' | 'failed';
  photos: UploadProgress[];
}

export interface UploadStatusEvent {
  jobId: string;
  photoId?: string;
  jobStatus?: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS';
  photoStatus?: 'UPLOADING' | 'COMPLETED' | 'FAILED';
  completedCount?: number;
  failedCount?: number;
  progress?: number;
  totalCount?: number;
  errorMessage?: string;
  timestamp: string;
}

