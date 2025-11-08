import { useState } from 'react';
import FileUpload from '../components/Upload/FileUpload';
import BatchProgress from '../components/Upload/BatchProgress';
import { useUpload } from '../hooks/useUpload';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { PhotoFile } from '../types/upload';

/**
 * Upload page component with file selection and progress tracking
 */
export default function UploadPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { uploadPhotos, uploadProgress, isUploading, error, resetUpload } = useUpload();
  const [selectedFiles, setSelectedFiles] = useState<PhotoFile[]>([]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleFilesSelected = (files: PhotoFile[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await uploadPhotos(selectedFiles);
  };

  const handleReset = () => {
    setSelectedFiles([]);
    resetUpload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="mt-2 text-gray-600">
            Select multiple photos to upload. Progress will be tracked in real-time.
          </p>
        </div>

        {!uploadProgress && (
          <div className="space-y-6">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />

            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Files ({selectedFiles.length})
                </h2>
                <ul className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between text-sm text-gray-700"
                    >
                      <span className="truncate flex-1">{file.filename}</span>
                      <span className="ml-4 text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    {isUploading ? 'Uploading...' : 'Start Upload'}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isUploading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadProgress && (
          <div className="space-y-6">
            <BatchProgress progress={uploadProgress} />

            {uploadProgress.status !== 'uploading' && (
              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Upload More Photos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
