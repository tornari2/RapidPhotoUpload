import { useAuth } from '../../contexts/AuthContext';

/**
 * Simple upload button that works reliably
 */
export function HeaderUploadButton() {
  const { isAuthenticated } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Dispatch custom event for GalleryPage to handle
    const event = new CustomEvent('uploadFiles', {
      detail: { files: Array.from(selectedFiles) },
    });
    window.dispatchEvent(event);

    // Reset input
    e.target.value = '';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        id="upload-input"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
        title="Upload photos"
      />
      <div className="px-4 py-2 text-sm font-medium text-gray-800 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 border border-gray-500 rounded-md hover:from-gray-400 hover:via-gray-300 hover:to-gray-500 shadow-md hover:shadow-lg transition-all flex items-center gap-2 pointer-events-none">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload
      </div>
    </div>
  );
}
