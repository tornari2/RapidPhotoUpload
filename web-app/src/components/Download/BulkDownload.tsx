import { useState } from 'react';
import { useDownload } from '../../hooks/useDownload';
import type { Photo } from '../../types/photo';

interface BulkDownloadProps {
  photos: Photo[];
  onComplete?: () => void;
  className?: string;
}

/**
 * Bulk download component with progress indicator
 */
export function BulkDownload({ photos, onComplete, className = '' }: BulkDownloadProps) {
  const { downloadPhotos, isDownloading, progress, photoProgress, error } = useDownload();
  const [showProgress, setShowProgress] = useState(false);

  const handleDownload = async () => {
    if (photos.length === 0) return;

    setShowProgress(true);
    try {
      await downloadPhotos(photos, (_completed, _total) => {
        // Progress is handled by the hook
      });
      onComplete?.();
    } catch (err) {
      console.error('Bulk download failed:', err);
    } finally {
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);
    }
  };

  // Count how many photos are actively downloading
  const activeDownloads = Array.from(photoProgress.values()).filter(
    (p) => p.status === 'downloading'
  ).length;

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Downloading...
          </span>
        ) : (
          `Download ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`
        )}
      </button>

      {/* Progress indicator */}
      {showProgress && (isDownloading || progress.percentage > 0) && (
        <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}

      {/* Progress text */}
      {showProgress && isDownloading && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-white">
            {progress.completed} of {progress.total} photos downloaded
            {activeDownloads > 0 && (
              <span className="ml-1 text-blue-400">
                ({activeDownloads} downloading in parallel)
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {progress.percentage}% complete • Parallel downloads enabled
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error.message}
        </div>
      )}
    </div>
  );
}

