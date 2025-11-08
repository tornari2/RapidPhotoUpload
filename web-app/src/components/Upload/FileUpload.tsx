import { useRef, useState, useEffect } from 'react';
import type { PhotoFile } from '../../types/upload';

interface FileUploadProps {
  onFilesSelected: (files: PhotoFile[]) => void;
  disabled?: boolean;
  accept?: string;
}

/**
 * File upload component with multi-select and folder upload support
 */
export default function FileUpload({
  onFilesSelected,
  disabled = false,
  accept = 'image/*',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Check if folder selection is supported
  // Safari on Mac has very limited support, so we detect Safari specifically
  const isFolderUploadSupported = () => {
    if (typeof document === 'undefined') return false;
    
    // Detect Safari - Safari has poor support for webkitdirectory
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
                     (navigator.userAgent.includes('Mac') && navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'));
    
    if (isSafari) {
      console.warn('Safari detected: Folder upload has limited support in Safari');
      return false; // Safari doesn't reliably support folder uploads
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    return 'webkitdirectory' in input || 'directory' in input;
  };
  
  const folderSupported = isFolderUploadSupported();

  // Set webkitdirectory attribute directly on the DOM element
  // React doesn't handle this attribute well, so we set it manually
  useEffect(() => {
    if (folderInputRef.current && folderSupported) {
      // Set webkitdirectory as a boolean attribute
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      console.log('Set webkitdirectory attribute on folder input');
    }
  }, [folderSupported]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const photoFiles: PhotoFile[] = Array.from(files)
        .filter((file) => {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            return false;
          }
          return true;
        })
        .map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          filename: file.name,
          size: file.size,
          type: file.type,
        }));

      if (photoFiles.length === 0) {
        console.warn('No valid image files selected');
        return;
      }

      onFilesSelected(photoFiles);
    } catch (error) {
      console.error('Error processing files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Cannot open file';
      alert(`Error: ${errorMessage}\n\nTry using "Click to upload" instead of drag-and-drop, or ensure the files are not locked or in use.`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFolderChange called!', e);
    const files = e.target.files;
    console.log('Files from folder selection:', files);
    console.log('File count:', files?.length || 0);
    
    if (!files || files.length === 0) {
      console.warn('No files selected from folder');
      alert('No files found in the selected folder. Make sure the folder contains image files.');
      return;
    }
    
    console.log(`✅ Selected ${files.length} files from folder`);
    console.log('Browser:', navigator.userAgent);
    console.log('Sample files (first 5):', Array.from(files).slice(0, 5).map(f => ({ 
      name: f.name, 
      type: f.type, 
      size: f.size,
      webkitRelativePath: (f as any).webkitRelativePath 
    })));
    
    handleFiles(files);
    // Reset input to allow selecting the same folder again
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    try {
      handleFiles(e.dataTransfer.files);
    } catch (error) {
      console.error('Error handling dropped files:', error);
      alert('Error dropping files. Please try using "Click to upload" instead.');
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🔵 Folder button clicked!', { disabled, folderSupported, hasRef: !!folderInputRef.current });
    
    if (disabled) {
      console.warn('❌ Upload is disabled');
      return;
    }
    
    if (!folderSupported) {
      alert('Folder upload is not supported in your browser. Please use Chrome, Edge, or Firefox for folder uploads, or select multiple files manually.');
      return;
    }
    
    if (!folderInputRef.current) {
      console.error('❌ Folder input ref is null!');
      return;
    }
    
    console.log('✅ Opening folder picker...');
    console.log('Folder input element:', folderInputRef.current);
    console.log('Folder input attributes:', {
      webkitdirectory: folderInputRef.current.getAttribute('webkitdirectory'),
      directory: folderInputRef.current.getAttribute('directory'),
      multiple: folderInputRef.current.multiple,
      type: folderInputRef.current.type,
    });
    
    // Verify the attribute is actually set before clicking
    if (!folderInputRef.current.hasAttribute('webkitdirectory')) {
      console.error('⚠️ webkitdirectory attribute missing! Setting it now...');
      folderInputRef.current.setAttribute('webkitdirectory', '');
    }
    
    try {
      folderInputRef.current.click();
      console.log('✅ Click event triggered on folder input');
    } catch (error) {
      console.error('❌ Error clicking folder input:', error);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is a valid HTML attribute but not in React types
        webkitdirectory=""
        onChange={handleFolderChange}
        disabled={disabled}
        className="hidden"
        id="folder-input"
      />
      <div className="space-y-2">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-blue-600 hover:text-blue-500">
            Click to upload
          </span>
        </div>
        {folderSupported && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-gray-500">or</span>
            <button
              type="button"
              onClick={handleFolderClick}
              disabled={disabled}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed underline"
              title="Select a folder to upload all images inside"
            >
              Upload folder
            </button>
          </div>
        )}
        {!folderSupported && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <p className="font-semibold">⚠️ Safari Limitation</p>
            <p className="mt-1">Safari doesn't support folder uploads. Use Chrome or Edge, or select multiple files manually (Cmd+Click to select multiple).</p>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB each</p>
      </div>
    </div>
  );
}

