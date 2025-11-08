import { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Upload button component for the header
 */
export function HeaderUploadButton() {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Dispatch custom event for GalleryPage to handle
    const event = new CustomEvent('uploadFiles', {
      detail: { files: Array.from(files) },
    });
    window.dispatchEvent(event);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleUploadClick}
        className="px-4 py-2 text-sm font-medium text-gray-800 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 border border-gray-500 rounded-md hover:from-gray-400 hover:via-gray-300 hover:to-gray-500 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}

