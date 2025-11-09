# Added: Folder Upload Support

## Feature Added

### ✅ Upload Entire Folders with One Click

**What Changed:**
The upload button now has a dropdown that lets you choose between uploading individual files or an entire folder.

## How It Works

### User Interface

The upload button is now split into two parts:

1. **Main "Upload" Button** (left side): Clicking this opens the standard file picker for selecting individual files
2. **Dropdown Arrow** (right side): Clicking this reveals a menu with two options:
   - **Upload Files**: Select individual files (traditional multi-select)
   - **Upload Folder**: Select an entire folder and all its contents will be uploaded

### Technical Implementation

**Browser API Used:**
- `webkitdirectory` attribute on the file input element
- This is supported in all modern browsers including Safari on Mac
- Falls back to `directory` attribute for compatibility

**How It Works:**
1. When "Upload Folder" is clicked, it opens a special folder picker dialog
2. User selects a folder (single click)
3. Browser automatically includes ALL files in that folder (and subfolders)
4. The same upload logic processes all the files at once
5. Only image files are accepted (as per the `accept="image/*"` attribute)

## Usage

### Before (Old Way):
1. Click Upload
2. Navigate to folder
3. Press Cmd+A (or Ctrl+A) to select all files
4. Click Open
5. Wait for upload

### After (New Way):
1. Click the dropdown arrow on Upload button
2. Click "Upload Folder"
3. Select the folder (single click)
4. Click "Select" or "Open"
5. All images in folder automatically upload!

## Browser Support

- ✅ **Safari** (Mac): Fully supported
- ✅ **Chrome** (Mac/Windows/Linux): Fully supported  
- ✅ **Edge** (Windows): Fully supported
- ✅ **Firefox** (Mac/Windows/Linux): Fully supported
- ✅ **Brave/Opera**: Fully supported

## Features

### What Gets Uploaded:
- All image files in the selected folder
- Files in subfolders are also included (recursive)
- Non-image files are automatically filtered out by the browser

### File Handling:
- Same validation and processing as individual file uploads
- Progress tracking works the same
- All retry logic and error handling applies
- Maintains the original file structure (flattened in display)

## UI/UX Details

### Visual Design:
- Upload button split into two sections (main action + dropdown)
- Dropdown menu with clear icons for each option
- Hover states for better interactivity
- Backdrop click closes the dropdown
- Smooth transitions and shadows

### Dropdown Menu:
- **Upload Files** option: Shows document icon
- **Upload Folder** option: Shows folder icon
- Dark theme matching the rest of the app
- Clear visual feedback on hover

## Files Modified

- `web-app/src/components/Upload/HeaderUploadButton.tsx`
  - Added second file input with `webkitdirectory` attribute
  - Added dropdown menu UI
  - Added state management for dropdown visibility
  - Split button into two-part design (main action + dropdown)
  - Unified file handling for both upload types

## Notes

### Folder Structure:
When uploading a folder, the browser flattens the file list. The folder hierarchy is preserved in the `webkitRelativePath` property of each file, but for this photo app, all images are treated equally regardless of their original folder structure.

### File Filtering:
The `accept="image/*"` attribute ensures only image files are selectable, so even if a folder contains documents, videos, etc., only images will be included in the upload.

### Performance:
- Uploading 100+ images from a folder works exactly the same as selecting 100+ individual files
- The existing concurrent upload logic (3 at a time) handles both scenarios
- Progress tracking and retry logic work identically

## Example Use Cases

1. **Vacation Photos**: Select your "Hawaii 2024" folder with 200 photos → uploads all at once
2. **Event Photography**: Select folder with 500 wedding photos → uploads in batches
3. **Organized Collections**: Select "Nature Photography" folder with subfolders → uploads all images from all subfolders
4. **Rapid Prototyping**: Quickly upload sample photo sets for testing

## Future Enhancements (Optional)

Potential future improvements:
- Show folder name in upload progress
- Option to preserve folder structure with tags
- Drag-and-drop folder support
- Preview folder contents before uploading

