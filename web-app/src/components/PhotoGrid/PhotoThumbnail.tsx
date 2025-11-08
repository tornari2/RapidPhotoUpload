import { useState, useRef, useEffect } from 'react';
import { TagDisplay } from '../Tagging/TagDisplay';
import { DownloadButton } from '../Download/DownloadButton';
import type { Photo } from '../../types/photo';

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
  getThumbnailUrl: (photo: Photo) => Promise<string>;
  onDelete?: (photo: Photo) => void;
}

/**
 * Photo thumbnail component with lazy loading
 */
export function PhotoThumbnail({ photo, onClick, getThumbnailUrl, onDelete }: PhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Load image when in view
  useEffect(() => {
    if (!isInView) return;

    let isCancelled = false;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const url = await getThumbnailUrl(photo);
        if (!isCancelled) {
          setImageUrl(url);
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
  }, [isInView, photo, getThumbnailUrl]);

  const handleClick = () => {
    onClick(photo);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Are you sure you want to delete "${photo.filename}"?`)) {
      onDelete(photo);
    }
  };

  return (
    <div
      ref={imgRef}
      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
      onClick={handleClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-400 text-sm">Failed to load</div>
        </div>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt={photo.filename}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />

      {/* Status indicator */}
      {photo.uploadStatus === 'UPLOADING' && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
          Uploading
        </div>
      )}

      {photo.uploadStatus === 'FAILED' && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          Failed
        </div>
      )}

      {/* Tags overlay */}
      {photo.tags && photo.tags.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
          <TagDisplay tags={photo.tags} maxVisible={2} className="text-white" />
        </div>
      )}

      {/* Download button - visible on hover */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <DownloadButton photo={photo} variant="icon" />
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            aria-label="Delete photo"
            title="Delete photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

