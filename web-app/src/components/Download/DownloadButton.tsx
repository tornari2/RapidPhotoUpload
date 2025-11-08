import { useDownload } from '../../hooks/useDownload';
import type { Photo } from '../../types/photo';

interface DownloadButtonProps {
  photo: Photo;
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Download button component for single photo download
 */
export function DownloadButton({ photo, variant = 'icon', className = '' }: DownloadButtonProps) {
  const { downloadPhoto, isDownloading } = useDownload();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadPhoto(photo);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isDownloading ? 'Downloading...' : 'Download'}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label="Download photo"
      title="Download photo"
    >
      {isDownloading ? (
        <svg
          className="w-5 h-5 animate-spin"
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
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
    </button>
  );
}

