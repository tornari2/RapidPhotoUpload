package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.UploadEvent;
import com.rapidphoto.domain.UploadJob;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.features.upload_photo.repository.UploadJobRepository;
import com.rapidphoto.features.upload_status.UploadStatusEvent;
import com.rapidphoto.features.upload_status.UploadStatusService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Handler for FailPhotoUploadCommand
 * Marks photo as failed and updates upload job status
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FailPhotoUploadHandler {
    
    private final PhotoRepository photoRepository;
    private final UploadJobRepository uploadJobRepository;
    private final EntityManager entityManager;
    private final UploadStatusService uploadStatusService;
    
    /**
     * Handle the fail photo upload command
     * 
     * @param command The command containing photo information and error message
     * @throws IllegalArgumentException if photo not found
     */
    @Transactional
    public void handle(FailPhotoUploadCommand command) {
        UUID photoId = command.getPhotoId();
        String errorMessage = command.getErrorMessage();
        log.info("Failing photo upload: {} - Error: {}", photoId, errorMessage);
        
        // Load photo with upload job
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> {
                    log.warn("Photo not found: {}", photoId);
                    return new IllegalArgumentException("Photo not found: " + photoId);
                });
        
        // Mark photo as failed using domain method
        photo.markAsFailed();
        photo = photoRepository.save(photo);
        log.debug("Photo marked as failed: {} (retry count: {})", photoId, photo.getRetryCount());
        
        // Create upload event for failure tracking
        UploadEvent failureEvent = UploadEvent.failed(photo, errorMessage);
        entityManager.persist(failureEvent);
        log.debug("Created failure event for photo: {}", photoId);
        
        // Update upload job status
        UploadJob uploadJob = null;
        if (photo.getUploadJob() != null) {
            final Photo finalPhoto = photo; // Make effectively final for lambda
            uploadJob = uploadJobRepository.findById(finalPhoto.getUploadJob().getId())
                    .orElseThrow(() -> {
                        log.warn("Upload job not found: {}", finalPhoto.getUploadJob().getId());
                        return new IllegalStateException("Upload job not found");
                    });
            
            uploadJob.incrementFailed();
            uploadJobRepository.save(uploadJob);
            log.debug("Upload job {} updated: failed count = {}", 
                    uploadJob.getId(), uploadJob.getFailedCount());
        }
        
        // Emit SSE event for photo failure
        if (uploadJob != null) {
            emitPhotoFailedEvent(photo, uploadJob, errorMessage);
        }
        
        log.info("Successfully failed photo upload: {}", photoId);
    }
    
    /**
     * Emit SSE event for photo failure
     */
    private void emitPhotoFailedEvent(Photo photo, UploadJob uploadJob, String errorMessage) {
        try {
            UploadStatusEvent event = UploadStatusEvent.builder()
                    .eventType("photo_failed")
                    .photoId(photo.getId())
                    .jobId(uploadJob.getId())
                    .photoStatus(photo.getUploadStatus().name())
                    .jobStatus(uploadJob.getStatus().name())
                    .progress(uploadJob.getProgressPercentage())
                    .completedCount(uploadJob.getCompletedCount())
                    .failedCount(uploadJob.getFailedCount())
                    .totalCount(uploadJob.getTotalCount())
                    .errorMessage(errorMessage)
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
            log.error("Error emitting SSE event for photo failure: {}", photo.getId(), e);
            // Don't fail the transaction if SSE emission fails
        }
    }
}

