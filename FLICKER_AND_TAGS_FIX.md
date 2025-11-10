# Fixed: Loading Bar Flicker and Tags Not Showing

## Issues Fixed

### 1. ✅ Loading Bar Flicker on Photo Deletion

**Problem:**
When deleting a photo, the loading progress bar would briefly flash on screen even though no photos were actually loading.

**Root Causes:**
1. **Race condition in `photosCurrentlyLoading` calculation**: When a photo was deleted, `allPhotos` would update immediately but `loadedCount` would sync later via a `useEffect`, causing a temporary mismatch that triggered the progress bar.
2. **Premature `isDeleting` flag reset**: The `isDeleting` flag was cleared immediately, allowing the progress bar to show during the refresh operation.

**Solutions:**
1. **Modified `photosCurrentlyLoading` calculation** to use `Math.min(loadedCount, nonUploadingPhotos.length)` to cap the effective loaded count, preventing false positives during deletion transitions.
2. **Added 100ms delay** before clearing `isDeleting` flag in both `handleDeletePhoto` and `handleBulkDelete` to prevent the progress bar from flashing during the refresh operation.

### 2. ✅ Tags Not Showing on Photos

**Problem:**
Tags were not being returned from the backend API, so photos never displayed their tags in the UI (visible on hover).

**Root Cause:**
The `Photo` entity was missing the ManyToMany relationship to tags, and the `PhotoResponse` DTO wasn't including tags in the response.

**Solution:**

#### Backend Changes:

1. **Photo Entity** (`Photo.java`):
   - Added `@ManyToMany` relationship to `Tag` entity
   - Added `Set<Tag> tags` field with proper JPA annotations
   - Used `photo_tags` junction table

2. **PhotoResponse DTO** (`PhotoResponse.java`):
   - Added `List<TagDto> tags` field
   - Created nested `TagDto` class with `id` and `name`

3. **GetUserPhotosHandler** (`GetUserPhotosHandler.java`):
   - Updated `toPhotoResponse()` method to map tags from entity to DTO
   - Tags are now included in all photo list responses

## Files Modified

### Frontend:
- `web-app/src/pages/GalleryPage.tsx`
  - Improved `photosCurrentlyLoading` calculation
  - Added delay before clearing `isDeleting` flag

### Backend:
- `backend/src/main/java/com/rapidphoto/domain/Photo.java`
  - Added ManyToMany relationship to tags
  
- `backend/src/main/java/com/rapidphoto/features/get_photos/dto/PhotoResponse.java`
  - Added tags field and TagDto inner class
  
- `backend/src/main/java/com/rapidphoto/features/get_photos/GetUserPhotosHandler.java`
  - Updated mapping to include tags in response
  - Removed unused import

## Testing

### To Test Loading Bar Flicker Fix:
1. Load a gallery with multiple photos
2. Delete a photo
3. Verify that the loading progress bar does NOT briefly appear
4. Delete multiple photos using bulk delete
5. Verify no flicker occurs

### To Test Tags Display:
1. Add tags to some photos using the tagging feature
2. Restart the backend to apply entity changes
3. Load the gallery
4. Hover over photos that have tags
5. Verify tags are displayed at the bottom of the photo thumbnail

## Note

**Backend restart required** for the tags feature to work. The JPA entity changes require the application to reload the entity mappings.

The `photo_tags` junction table already exists in the database (from migration V6), so no database changes are needed.


