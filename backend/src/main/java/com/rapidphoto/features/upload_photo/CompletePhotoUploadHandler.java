package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.upload_status.UploadStatusEvent;
import com.rapidphoto.features.upload_status.UploadStatusService;
import com.rapidphoto.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Handler for CompletePhotoUploadCommand
 * Verifies S3 existence and updates photo status to COMPLETED
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompletePhotoUploadHandler {
    
    private final PhotoRepository photoRepository;
    private final UploadJobRepository uploadJobRepository;
    private final S3Service s3Service;
    private final UploadStatusService uploadStatusService;
    
    /**
     * Handle the complete photo upload command
     * 
     * @param command The command containing photo information
     * @throws IllegalArgumentException if photo not found or already completed
     * @throws IllegalStateException if file doesn't exist in S3
     */
    @Transactional
    public void handle(CompletePhotoUploadCommand command) {
        UUID photoId = command.getPhotoId();
        log.info("Completing photo upload: {}", photoId);
        
        // Load photo with upload job
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> {
                    log.warn("Photo not found: {}", photoId);
                    return new IllegalArgumentException("Photo not found: " + photoId);
                });
        
        // Verify file exists in S3
        if (!s3Service.fileExists(photo.getS3Key())) {
            log.warn("Photo file does not exist in S3: {} (s3Key: {})", photoId, photo.getS3Key());
            throw new IllegalStateException("Photo file does not exist in S3: " + photo.getS3Key());
        }
        
        // Mark photo as completed using domain method
        photo.markAsCompleted();
        photo = photoRepository.save(photo);
        log.debug("Photo marked as completed: {}", photoId);
        
        // Update upload job status
        UploadJob uploadJob = null;
        if (photo.getUploadJob() != null) {
            final Photo finalPhoto = photo; // Make effectively final for lambda
            uploadJob = uploadJobRepository.findById(finalPhoto.getUploadJob().getId())
                    .orElseThrow(() -> {
                        log.warn("Upload job not found: {}", finalPhoto.getUploadJob().getId());
                        return new IllegalStateException("Upload job not found");
                    });
            
            uploadJob.incrementCompleted();
            uploadJobRepository.save(uploadJob);
            log.debug("Upload job {} updated: completed count = {}", 
                    uploadJob.getId(), uploadJob.getCompletedCount());
        }
        
        // Emit SSE event for photo completion
        if (uploadJob != null) {
            emitPhotoCompletedEvent(photo, uploadJob);
        }
        
        log.info("Successfully completed photo upload: {}", photoId);
    }
    
    /**
     * Emit SSE event for photo completion
     */
    private void emitPhotoCompletedEvent(Photo photo, UploadJob uploadJob) {
        try {
            UploadStatusEvent event = UploadStatusEvent.builder()
                    .eventType("photo_completed")
                    .photoId(photo.getId())
                    .jobId(uploadJob.getId())
                    .photoStatus(photo.getUploadStatus().name())
                    .jobStatus(uploadJob.getStatus().name())
                    .progress(uploadJob.getProgressPercentage())
                    .completedCount(uploadJob.getCompletedCount())
                    .failedCount(uploadJob.getFailedCount())
                    .totalCount(uploadJob.getTotalCount())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            uploadStatusService.emitEvent(uploadJob.getId(), event);
            
            // If job is complete, emit job completion event
            if (uploadJob.isComplete()) {
                UploadStatusEvent jobEvent = UploadStatusEvent.builder()
                        .eventType("job_completed")
                        .jobId(uploadJob.getId())
                        .jobStatus(uploadJob.getStatus().name())
                        .progress(100.0)
                        .completedCount(uploadJob.getCompletedCount())
                        .failedCount(uploadJob.getFailedCount())
                        .totalCount(uploadJob.getTotalCount())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                uploadStatusService.emitEvent(uploadJob.getId(), jobEvent);
            }
        } catch (Exception e) {
            log.error("Error emitting SSE event for photo completion: {}", photo.getId(), e);
            // Don't fail the transaction if SSE emission fails
        }
    }
}

