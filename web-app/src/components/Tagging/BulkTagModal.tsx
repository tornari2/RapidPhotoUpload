import { useState } from 'react';
import { TagInput } from './TagInput';
import { useTags } from '../../hooks/useTags';
import type { Photo } from '../../types/photo';

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  userId: string;
  onSuccess?: () => void;
}

/**
 * Modal for bulk tagging multiple photos
 */
export function BulkTagModal({
  isOpen,
  onClose,
  photos,
  userId,
  onSuccess,
}: BulkTagModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const { bulkTagPhotos, isLoading, error } = useTags();

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tags.length === 0) {
      return;
    }

    try {
      await bulkTagPhotos({
        userId,
        photoIds: photos.map((p) => p.id),
        tagNames: tags,
      });
      
      setTags([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to bulk tag photos:', err);
    }
  };

  const handleClose = () => {
    setTags([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Tag {photos.length} Photo{photos.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
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
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          )}

          {/* Tag input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Add tags (press Enter to add)"
              maxTags={10}
            />
          </div>

          {/* Photo preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos to tag ({photos.length})
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded">
              {photos.slice(0, 8).map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square bg-gray-200 rounded text-xs text-gray-500 flex items-center justify-center truncate"
                  title={photo.filename}
                >
                  {photo.filename.substring(0, 10)}
                </div>
              ))}
              {photos.length > 8 && (
                <div className="aspect-square bg-gray-200 rounded text-xs text-gray-500 flex items-center justify-center">
                  +{photos.length - 8}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || tags.length === 0}
            >
              {isLoading ? 'Tagging...' : 'Add Tags'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

