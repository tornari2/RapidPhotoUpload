import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Upload button component for the header with folder upload support
 */
export function HeaderUploadButton() {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleFilesUploadClick = () => {
    setShowDropdown(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFolderUploadClick = () => {
    setShowDropdown(false);
    if (folderInputRef.current) {
      folderInputRef.current.click();
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
    if (e.target === fileInputRef.current) {
      fileInputRef.current.value = '';
    } else if (e.target === folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Main Upload Button */}
      <div className="flex">
        <button
          onClick={handleFilesUploadClick}
          className="px-4 py-2 text-sm font-medium text-gray-800 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 border border-gray-500 rounded-l-md hover:from-gray-400 hover:via-gray-300 hover:to-gray-500 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </button>
        
        {/* Dropdown Toggle */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-2 py-2 text-sm font-medium text-gray-800 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 border-l border-gray-600 border-r border-gray-500 border-t border-gray-500 border-b border-gray-500 rounded-r-md hover:from-gray-400 hover:via-gray-300 hover:to-gray-500 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-20">
            <button
              onClick={handleFilesUploadClick}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2 rounded-t-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Upload Files
            </button>
            <button
              onClick={handleFolderUploadClick}
              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2 rounded-b-md border-t border-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Upload Folder
            </button>
          </div>
        </>
      )}

      {/* Hidden file input for individual files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Hidden file input for folder selection */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept="image/*"
        /* @ts-ignore - webkitdirectory is not in TypeScript types but works in modern browsers */
        webkitdirectory=""
        directory=""
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

