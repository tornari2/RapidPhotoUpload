import { useEffect, useState } from 'react';
import { photoService } from '../../services/photoService';
import { DownloadButton } from '../Download/DownloadButton';
import type { Photo } from '../../types/photo';

interface PhotoModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onTagClick?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

/**
 * Modal component for viewing full-size photos
 */
export function PhotoModal({
  photo,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onTagClick,
  onDelete,
  hasNext = false,
  hasPrevious = false,
}: PhotoModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Load full-size image when photo changes
  useEffect(() => {
    if (!photo || !isOpen) {
      setImageUrl(null);
      setError(false);
      return;
    }

    let isCancelled = false;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const response = await photoService.getDownloadUrl(photo.id, photo.userId, 60);
        if (!isCancelled) {
          setImageUrl(response.downloadUrl);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
    };
  }, [photo, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !photo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="Close"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Previous button */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Previous photo"
        >
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Next photo"
        >
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="text-white">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-white text-center">
            <p className="text-lg">Failed to load image</p>
            <p className="text-sm text-gray-400 mt-2">{photo.filename}</p>
          </div>
        )}

        {imageUrl && !isLoading && (
          <img
            src={imageUrl}
            alt={photo.filename}
            className="max-w-full max-h-[90vh] object-contain"
          />
        )}
      </div>

      {/* Photo info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center z-10">
        <p className="text-sm font-medium">{photo.filename}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(photo.createdAt).toLocaleDateString()}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {onTagClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(photo);
              }}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Tag Photo
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <DownloadButton photo={photo} variant="button" className="text-xs px-3 py-1" />
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${photo.filename}"?`)) {
                  onDelete(photo);
                }
              }}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

