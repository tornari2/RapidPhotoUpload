package com.rapidphoto.features.get_photos;

import com.rapidphoto.features.get_photos.dto.GetUserPhotosResponse;
import com.rapidphoto.features.get_photos.dto.PhotoMetadataResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for photo query endpoints
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class GetPhotosController {
    
    private final GetUserPhotosHandler getUserPhotosHandler;
    private final GetPhotoMetadataHandler getPhotoMetadataHandler;
    
    /**
     * Get photos for a user with optional filtering and pagination
     * 
     * GET /api/photos?userId={userId}&status={status}&uploadJobId={uploadJobId}&page={page}&size={size}&sortBy={sortBy}&sortDirection={sortDirection}
     * 
     * @param userId User ID (required)
     * @param status Optional: Filter by upload status (UPLOADING, COMPLETED, FAILED)
     * @param uploadJobId Optional: Filter by upload job ID
     * @param page Optional: Page number (0-indexed, default: 0)
     * @param size Optional: Page size (default: 20, max: 100)
     * @param sortBy Optional: Sort field (createdAt, filename, fileSize, uploadStatus, default: createdAt)
     * @param sortDirection Optional: Sort direction (asc, desc, default: desc)
     * @return GetUserPhotosResponse with paginated photos
     */
    @GetMapping
    public ResponseEntity<?> getUserPhotos(
            @RequestParam UUID userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID uploadJobId,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortDirection) {
        
        log.info("GET /api/photos - userId: {}, status: {}, uploadJobId: {}, page: {}, size: {}", 
                userId, status, uploadJobId, page, size);

        com.rapidphoto.domain.PhotoStatus statusFilter = null;

        if (status == null || status.isBlank()) {
            statusFilter = com.rapidphoto.domain.PhotoStatus.COMPLETED;
        } else if (!"all".equalsIgnoreCase(status)) {
            try {
                statusFilter = com.rapidphoto.domain.PhotoStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid status value received: {}", status);
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Invalid status value", "Supported values: completed, failed, uploading, all"));
            }
        }
        
        GetUserPhotosQuery query = GetUserPhotosQuery.builder()
                .userId(userId)
                .status(statusFilter)
                .uploadJobId(uploadJobId)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();
        
        GetUserPhotosResponse response = getUserPhotosHandler.handle(query);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get detailed metadata for a specific photo
     * 
     * GET /api/photos/{photoId}/metadata?userId={userId}&includeDownloadUrl={includeDownloadUrl}&includeTags={includeTags}
     * 
     * @param photoId Photo ID (required)
     * @param userId User ID (required) - for authorization
     * @param includeDownloadUrl Optional: Include presigned download URL (default: true)
     * @param includeTags Optional: Include photo tags (default: true)
     * @return PhotoMetadataResponse with detailed photo metadata
     */
    @GetMapping("/{photoId}/metadata")
    public ResponseEntity<PhotoMetadataResponse> getPhotoMetadata(
            @PathVariable UUID photoId,
            @RequestParam UUID userId,
            @RequestParam(required = false, defaultValue = "true") Boolean includeDownloadUrl,
            @RequestParam(required = false, defaultValue = "true") Boolean includeTags) {
        
        log.info("GET /api/photos/{}/metadata - userId: {}", photoId, userId);
        
        GetPhotoMetadataQuery query = GetPhotoMetadataQuery.builder()
                .photoId(photoId)
                .userId(userId)
                .includeDownloadUrl(includeDownloadUrl)
                .includeTags(includeTags)
                .build();
        
        PhotoMetadataResponse response = getPhotoMetadataHandler.handle(query);
        return ResponseEntity.ok(response);
    }

    private record ErrorResponse(String error, String message) {}
}

