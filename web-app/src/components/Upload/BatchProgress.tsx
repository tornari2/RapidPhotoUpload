import UploadProgress from './UploadProgress';
import type { BatchUploadProgress } from '../../types/upload';

interface BatchProgressProps {
  progress: BatchUploadProgress;
}

/**
 * Batch upload progress component showing overall and individual photo progress
 */
export default function BatchProgress({ progress }: BatchProgressProps) {
  const getStatusText = () => {
    switch (progress.status) {
      case 'completed':
        return 'All photos uploaded successfully';
      case 'partial_success':
        return 'Some photos failed to upload';
      case 'failed':
        return 'All photos failed to upload';
      default:
        return 'Uploading photos...';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-600';
      case 'partial_success':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {progress.completed} of {progress.total} completed
          </span>
          {progress.failed > 0 && (
            <span className="text-red-600">{progress.failed} failed</span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {progress.photos.map((photo) => (
          <UploadProgress key={photo.photoId} progress={photo} />
        ))}
      </div>
    </div>
  );
}

