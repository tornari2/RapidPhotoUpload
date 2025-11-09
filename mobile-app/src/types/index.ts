// User types
export interface User {
  id: string;
  email: string;
  username: string;
}

// Photo types
export interface Photo {
  id: string;
  userId: string;
  uploadJobId: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  contentType: string;
  uploadStatus: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  retryCount?: number;
  createdAt: string;
  completedAt?: string;
  tags?: Tag[];
}

// Tag types
export interface Tag {
  id: string;
  name: string;
}

// Upload types
export interface UploadJob {
  id: string;
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS';
  totalPhotos: number;
  uploadedPhotos: number;
  failedPhotos: number;
  createdAt: string;
  completedAt?: string;
}

export interface PhotoUploadProgress {
  photoId: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface UploadProgress {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'partial_success' | 'failed';
  totalPhotos: number;
  completedPhotos: number;
  failedPhotos: number;
  photos: PhotoUploadProgress[];
}

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

