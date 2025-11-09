import { useEffect, useState, useRef, useCallback } from 'react';
import { photoService } from '../../services/photoService';
import { DownloadButton } from '../Download/DownloadButton';
import { ProgressBar } from '../Common/ProgressBar';
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
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const [layout, setLayout] = useState({
    overlayTop: 0,
    actionTop: 0,
    actionLeft: 0,
    actionWidth: 0,
  });

  // Load full-size image when photo changes
  useEffect(() => {
    if (!photo || !isOpen) {
      setImageUrl(null);
      setError(false);
      retryCountRef.current = 0;
      return;
    }

    let isCancelled = false;

    const loadImage = async (retryAttempt = 0) => {
      try {
        setIsLoading(true);
        setError(false);
        const response = await photoService.getDownloadUrl(photo.id, photo.userId, 3600); // 60 hour expiration
        if (!isCancelled) {
          setImageUrl(response.downloadUrl);
          setIsLoading(false);
          retryCountRef.current = 0; // Reset retry count on success
        }
      } catch (err) {
        if (!isCancelled) {
          // Retry with exponential backoff
          if (retryAttempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Max 10 seconds
            retryCountRef.current = retryAttempt + 1;
            setTimeout(() => {
              if (!isCancelled) {
                loadImage(retryAttempt + 1);
              }
            }, delay);
          } else {
            // Max retries reached, show error
          setError(true);
          setIsLoading(false);
            retryCountRef.current = 0;
          }
        }
      }
    };

    loadImage(retryCountRef.current);

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
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    } else {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  const updateLayout = useCallback(() => {
    const header = document.getElementById('gallery-header');
    const actions = document.getElementById('gallery-header-actions');
    const selectRow = document.getElementById('gallery-select-row');

    const headerRect = header?.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    const selectRect = selectRow?.getBoundingClientRect();

    setLayout({
      overlayTop: headerRect ? headerRect.bottom : 0,
      // Position at the same vertical level as Select All button (which is below Upload button)
      // If Select All button doesn't exist, position below the actions row
      actionTop: selectRect 
        ? selectRect.top 
        : actionsRect 
        ? actionsRect.bottom + 8 
        : headerRect 
        ? headerRect.bottom + 8 
        : 0,
      actionLeft: selectRect ? selectRect.left : (actionsRect ? actionsRect.left : 0),
      actionWidth: actionsRect ? actionsRect.width : 0,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => updateLayout();
    
    // Initial layout calculation with a slight delay to ensure DOM is settled
    setTimeout(() => {
      updateLayout();
    }, 0);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updateLayout]);

  if (!isOpen || !photo) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
        onClick={onClose}
        style={{ top: layout.overlayTop }}
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
            <div className="w-full max-w-md px-8">
              <ProgressBar size="lg" color="white" showLabel label="Loading image..." />
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
              onError={() => {
                // Retry image load with exponential backoff
                if (retryCountRef.current < maxRetries) {
                  const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
                  retryCountRef.current += 1;
                  setTimeout(() => {
                    // Force reload by appending timestamp to URL
                    const newUrl = imageUrl.includes('?') 
                      ? `${imageUrl}&retry=${Date.now()}`
                      : `${imageUrl}?retry=${Date.now()}`;
                    setImageUrl(newUrl);
                  }, delay);
                } else {
                  setError(true);
                  retryCountRef.current = 0;
                }
              }}
              onLoad={() => {
                // Reset retry count on successful load
                retryCountRef.current = 0;
              }}
            />
          )}
        </div>
      </div>

      {layout.actionWidth > 0 && (
        <div
          className="fixed z-[70] text-white px-6 lg:px-8 pointer-events-auto"
          style={{
            top: layout.actionTop,
            left: layout.actionLeft,
            width: layout.actionWidth,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-2">
            {onTagClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(photo);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Tag Photo
              </button>
            )}
            <div onClick={(e) => e.stopPropagation()}>
              <DownloadButton photo={photo} variant="button" className="text-sm px-4 py-2" />
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${photo.filename}"?`)) {
                    onDelete(photo);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="mt-2 text-right">
            <p className="text-sm font-medium">{photo.filename}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(photo.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

