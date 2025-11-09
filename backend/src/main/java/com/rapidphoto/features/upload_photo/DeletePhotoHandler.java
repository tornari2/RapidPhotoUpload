package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Handler for DeletePhotoCommand
 * Deletes a photo from both the database and S3
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeletePhotoHandler {
    
    private final PhotoRepository photoRepository;
    private final S3Service s3Service;
    
    /**
     * Handle the DeletePhotoCommand
     * 
     * @param command The command containing photo ID and user ID
     * @throws IllegalArgumentException if photo not found or doesn't belong to user
     */
    @Transactional
    public void handle(DeletePhotoCommand command) {
        log.info("Deleting photo: {} for user: {}", command.getPhotoId(), command.getUserId());
        
        // Verify photo exists and belongs to user
        Photo photo = photoRepository.findByIdAndUser_Id(command.getPhotoId(), command.getUserId())
                .orElseThrow(() -> {
                    log.warn("Photo not found or access denied: photoId={}, userId={}", 
                            command.getPhotoId(), command.getUserId());
                    return new IllegalArgumentException("Photo not found or access denied");
                });
        
        // Delete from S3
        try {
            boolean deleted = s3Service.deleteFile(photo.getS3Key());
            if (!deleted) {
                log.warn("Failed to delete file from S3: {} (continuing with database deletion)", photo.getS3Key());
                // Continue with database deletion even if S3 deletion fails
                // (file might not exist in S3 if upload failed)
            } else {
                log.debug("Successfully deleted file from S3: {}", photo.getS3Key());
            }
        } catch (Exception e) {
            log.error("Exception while deleting file from S3: {} - Error: {}", photo.getS3Key(), e.getMessage(), e);
            // Continue with database deletion even if S3 deletion fails
        }
        
        // Delete from database
        try {
            photoRepository.delete(photo);
            log.info("Successfully deleted photo from database: {} for user: {}", command.getPhotoId(), command.getUserId());
        } catch (Exception e) {
            log.error("Failed to delete photo from database: {} - Error: {}", command.getPhotoId(), e.getMessage(), e);
            throw new RuntimeException("Failed to delete photo from database: " + e.getMessage(), e);
        }
    }
}

