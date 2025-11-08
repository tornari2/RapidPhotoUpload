package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.features.upload_photo.dto.CompletePhotoUploadRequest;
import com.rapidphoto.features.upload_photo.dto.FailPhotoUploadRequest;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for photo upload completion and failure operations
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoController {
    
    private final CompletePhotoUploadHandler completePhotoUploadHandler;
    private final FailPhotoUploadHandler failPhotoUploadHandler;
    private final DeletePhotoHandler deletePhotoHandler;
    private final PhotoRepository photoRepository;
    
    /**
     * Complete a photo upload
     * Called by client after successfully uploading photo to S3
     * 
     * @param photoId Photo ID from path
     * @param request Optional completion request (photoId can come from path)
     * @return Success response
     */
    @PostMapping("/{photoId}/complete")
    public ResponseEntity<?> completePhotoUpload(
            @PathVariable UUID photoId,
            @Valid @RequestBody(required = false) CompletePhotoUploadRequest request) {
        
        log.info("Received photo completion notification for photo: {}", photoId);
        
        // Use photoId from path if request body is not provided
        UUID targetPhotoId = (request != null && request.getPhotoId() != null) 
                ? request.getPhotoId() 
                : photoId;
        
        // Verify photo exists
        Photo photo = photoRepository.findById(targetPhotoId)
                .orElseThrow(() -> {
                    log.warn("Photo not found: {}", targetPhotoId);
                    return new IllegalArgumentException("Photo not found: " + targetPhotoId);
                });
        
        // Create command
        CompletePhotoUploadCommand command = CompletePhotoUploadCommand.fromPhoto(photo);
        
        // Handle command
        try {
            completePhotoUploadHandler.handle(command);
            log.info("Successfully completed photo upload: {}", targetPhotoId);
            return ResponseEntity.ok(new SuccessResponse("Photo upload completed successfully"));
        } catch (IllegalStateException e) {
            log.warn("Photo completion failed: {} - {}", targetPhotoId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Photo completion failed", e.getMessage()));
        } catch (Exception e) {
            log.error("Error completing photo upload: {}", targetPhotoId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to complete photo upload", e.getMessage()));
        }
    }
    
    /**
     * Fail a photo upload
     * Called by client when upload to S3 fails
     * 
     * @param photoId Photo ID from path
     * @param request The failure request with error message
     * @return Success response
     */
    @PostMapping("/{photoId}/fail")
    public ResponseEntity<?> failPhotoUpload(
            @PathVariable UUID photoId,
            @Valid @RequestBody FailPhotoUploadRequest request) {
        
        log.info("Received photo failure notification for photo: {} - Error: {}", 
                photoId, request.getErrorMessage());
        
        // Verify photo exists
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> {
                    log.warn("Photo not found: {}", photoId);
                    return new IllegalArgumentException("Photo not found: " + photoId);
                });
        
        // Use photoId from path (ensure consistency)
        if (request.getPhotoId() != null && !request.getPhotoId().equals(photoId)) {
            log.warn("Photo ID mismatch: path={}, body={}", photoId, request.getPhotoId());
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Photo ID mismatch", 
                            "Photo ID in path does not match request body"));
        }
        
        // Create command
        FailPhotoUploadCommand command = FailPhotoUploadCommand.fromPhoto(photo, request.getErrorMessage());
        
        // Handle command
        try {
            failPhotoUploadHandler.handle(command);
            log.info("Successfully failed photo upload: {}", photoId);
            return ResponseEntity.ok(new SuccessResponse("Photo upload failure recorded"));
        } catch (Exception e) {
            log.error("Error failing photo upload: {}", photoId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to record photo upload failure", e.getMessage()));
        }
    }
    
    /**
     * Delete a photo
     * Deletes the photo from both the database and S3
     * 
     * @param photoId Photo ID from path
     * @param userId User ID from query parameter (for authorization)
     * @return Success response
     */
    @DeleteMapping("/{photoId}")
    public ResponseEntity<?> deletePhoto(
            @PathVariable UUID photoId,
            @RequestParam UUID userId) {
        
        log.info("Received delete request for photo: {} by user: {}", photoId, userId);
        
        // Create command
        DeletePhotoCommand command = DeletePhotoCommand.builder()
                .photoId(photoId)
                .userId(userId)
                .build();
        
        // Handle command
        try {
            deletePhotoHandler.handle(command);
            log.info("Successfully deleted photo: {}", photoId);
            return ResponseEntity.ok(new SuccessResponse("Photo deleted successfully"));
        } catch (IllegalArgumentException e) {
            log.warn("Photo deletion failed: {} - {}", photoId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("Photo deletion failed", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting photo: {}", photoId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to delete photo", e.getMessage()));
        }
    }
    
    /**
     * Error response DTO
     */
    private record ErrorResponse(String error, String message) {}
    
    /**
     * Success response DTO
     */
    private record SuccessResponse(String message) {}
}

