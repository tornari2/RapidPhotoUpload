import { useState, useEffect, useRef } from 'react';
import { TagDisplay } from '../Tagging/TagDisplay';
import { DownloadButton } from '../Download/DownloadButton';
import { ProgressBar } from '../Common/ProgressBar';
import type { Photo } from '../../types/photo';
import type { DownloadProgress } from '../../services/downloadService';
import type { UploadProgress } from '../../types/upload';

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
  getThumbnailUrl: (photo: Photo) => Promise<string>;
  onDelete?: (photo: Photo) => void;
  onTag?: (photo: Photo) => void;
  isSelected?: boolean;
  onLoad?: (photoId: string) => void;
  downloadProgress?: DownloadProgress;
  uploadProgress?: UploadProgress;
}

/**
 * Photo thumbnail component with eager loading (loads all photos immediately)
 * Images persist once loaded - browser cache + component state persistence
 */
export function PhotoThumbnail({ 
  photo, 
  onClick, 
  getThumbnailUrl, 
  onDelete,
  onTag,
  isSelected = false,
  onLoad,
  downloadProgress,
  uploadProgress,
}: PhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false); // Track when image is actually loaded
  const photoIdRef = useRef<string>(photo.id);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // Update ref when photo ID changes
  useEffect(() => {
    photoIdRef.current = photo.id;
  }, [photo.id]);

  // Load image immediately when component mounts (skip for uploading photos)
  // Parent's persistent cache + browser cache ensure smooth scrolling
  useEffect(() => {
    if (photo.uploadStatus === 'UPLOADING') {
      setIsLoading(false);
      setImageLoaded(false); // Reset image loaded state
      // Don't clear imageUrl if we already have one - this prevents flashing
      if (!imageUrl) {
        setImageUrl(null);
      }
      return;
    }

    // Reset state if photo ID changed
    const currentPhotoId = photo.id;
    if (photoIdRef.current !== currentPhotoId) {
      setImageUrl(null);
      setIsLoading(true);
      setError(false);
      setImageLoaded(false);
      retryCountRef.current = 0;
      photoIdRef.current = currentPhotoId;
    }

    // If we already have a URL for this photo ID, don't reload
    // Check this after setting photoIdRef to avoid stale checks
    if (imageUrl && !error) {
      setIsLoading(false);
      return;
    }

    isMountedRef.current = true;
    let isCancelled = false;

    const loadImage = async (retryAttempt = 0) => {
      try {
        setIsLoading(true);
        setError(false);
        // getThumbnailUrl uses parent's persistent cache - will return instantly if cached
        const url = await getThumbnailUrl(photo);
        if (!isCancelled && isMountedRef.current && photoIdRef.current === currentPhotoId) {
          setImageUrl(url);
          setIsLoading(false);
          retryCountRef.current = 0; // Reset retry count on success
        }
      } catch (err) {
        if (!isCancelled && isMountedRef.current && photoIdRef.current === currentPhotoId) {
          // Retry with exponential backoff
          if (retryAttempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Max 10 seconds
            retryCountRef.current = retryAttempt + 1;
            setTimeout(() => {
              if (!isCancelled && isMountedRef.current && photoIdRef.current === currentPhotoId) {
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
      isMountedRef.current = false;
    };
  }, [photo.id, photo.uploadStatus, getThumbnailUrl]); // Removed imageUrl and error from deps to prevent re-renders

  const handleClick = () => {
    // Don't allow clicking on photos that are still uploading
    if (photo.uploadStatus === 'UPLOADING') {
      return;
    }
    onClick(photo);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(photo);
    }
  };

  const handleTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTag && photo.uploadStatus !== 'UPLOADING') {
      onTag(photo);
    }
  };

  return (
    <div
      className={`relative aspect-square bg-gray-200 rounded-lg overflow-hidden transition-opacity group ${
        photo.uploadStatus === 'UPLOADING' || downloadProgress?.status === 'downloading'
          ? 'cursor-not-allowed opacity-75' 
          : 'cursor-pointer hover:opacity-90'
      } ${
        isSelected ? 'ring-2 ring-white' : ''
      }`}
      onClick={handleClick}
    >
      {/* Download overlay with progress bar */}
      {downloadProgress?.status === 'downloading' && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-10 p-4">
          <div className="flex flex-col items-center gap-2 w-full">
            <ProgressBar size="md" color="blue" className="w-full" />
            <span className="text-white text-xs font-medium">Downloading...</span>
          </div>
        </div>
      )}

      {/* Upload progress overlay with progress bar - stays visible until image loads */}
      {(photo.uploadStatus === 'UPLOADING' || (photo.uploadStatus === 'COMPLETED' && !imageLoaded)) && !downloadProgress && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10 p-4">
          <div className="flex flex-col items-center gap-2 w-full">
            <ProgressBar 
              size="sm" 
              color="blue" 
              className="w-full" 
              progress={uploadProgress?.progress || (photo.uploadStatus === 'COMPLETED' ? 100 : undefined)}
            />
            {(uploadProgress?.progress !== undefined || photo.uploadStatus === 'COMPLETED') && (
              <span className="text-white text-xs font-medium">
                {photo.uploadStatus === 'COMPLETED' ? '100' : Math.round(uploadProgress?.progress || 0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading && photo.uploadStatus !== 'UPLOADING' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 p-4">
          <ProgressBar size="sm" color="blue" className="w-full max-w-[60%]" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-gray-400 text-sm">Failed to load</div>
        </div>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt={photo.filename}
          className="w-full h-full object-cover"
          loading="eager"
          onError={() => {
            // Retry image load with exponential backoff
            if (retryCountRef.current < maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
              retryCountRef.current += 1;
              setTimeout(() => {
                if (isMountedRef.current && photoIdRef.current === photo.id) {
                  // Force reload by appending timestamp to URL
                  const newUrl = imageUrl.includes('?') 
                    ? `${imageUrl}&retry=${Date.now()}`
                    : `${imageUrl}?retry=${Date.now()}`;
                  setImageUrl(newUrl);
                }
              }, delay);
            } else {
              setError(true);
              retryCountRef.current = 0;
            }
          }}
          onLoad={() => {
            setImageLoaded(true); // Mark image as loaded
            if (onLoad && photo.uploadStatus !== 'UPLOADING') {
              onLoad(photo.id);
            }
            // Reset retry count on successful load
            retryCountRef.current = 0;
          }}
        />
      )}

      {/* Overlay on hover - hidden when uploading or downloading */}
      {photo.uploadStatus !== 'UPLOADING' && downloadProgress?.status !== 'downloading' && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
      )}

      {/* Status indicator */}
      {photo.uploadStatus === 'FAILED' && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-20">
          Failed
        </div>
      )}
      
      {/* Download status indicator */}
      {downloadProgress?.status === 'failed' && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-20">
          Download Failed
        </div>
      )}
      {downloadProgress?.status === 'completed' && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded z-20">
          Downloaded
        </div>
      )}

      {/* Tags overlay - visible on hover */}
      {photo.tags && photo.tags.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <TagDisplay tags={photo.tags} maxVisible={photo.tags.length} className="text-white" />
        </div>
      )}

      {/* Action buttons - Tag, Download, Delete - visible on hover */}
      {photo.uploadStatus !== 'UPLOADING' && downloadProgress?.status !== 'downloading' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-20">
          {onTag && (
            <button
              onClick={handleTag}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-lg"
              aria-label="Tag photo"
              title="Tag photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <DownloadButton photo={photo} variant="icon" />
          </div>
            {onDelete && (
              <button
                onClick={handleDelete}
              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-lg"
                aria-label="Delete photo"
                title="Delete photo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
        </div>
        )}
    </div>
  );
}

