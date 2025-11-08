package com.rapidphoto.features.retry_upload;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.features.retry_upload.dto.RetryUploadResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler for RetryUploadCommand
 * Allows retrying failed photo uploads with new presigned URLs
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RetryUploadHandler {
    
    private final PhotoRepository photoRepository;
    private final S3Service s3Service;
    
    @Value("${photo.upload.max-retries:3}")
    private int maxRetries;
    
    /**
     * Handle the RetryUploadCommand
     * 
     * @param command The command containing photo ID and user ID
     * @return RetryUploadResponse with new presigned upload URL
     * @throws IllegalArgumentException if photo not found or doesn't belong to user
     * @throws IllegalStateException if photo cannot be retried (not failed or max retries exceeded)
     */
    @Transactional
    public RetryUploadResponse handle(RetryUploadCommand command) {
        log.info("Retrying upload for photo: {} for user: {}", 
                command.getPhotoId(), command.getUserId());
        
        // Find photo and verify ownership
        Photo photo = photoRepository.findByIdAndUserId(command.getPhotoId(), command.getUserId())
                .orElseThrow(() -> {
                    log.warn("Photo not found or access denied: photoId={}, userId={}", 
                            command.getPhotoId(), command.getUserId());
                    return new IllegalArgumentException("Photo not found or access denied");
                });
        
        // Verify photo can be retried
        if (photo.getUploadStatus() != PhotoStatus.FAILED) {
            log.warn("Photo is not failed, cannot retry: photoId={}, status={}", 
                    photo.getId(), photo.getUploadStatus());
            throw new IllegalStateException(
                    "Photo cannot be retried. Current status: " + photo.getUploadStatus() + 
                    ". Only failed photos can be retried.");
        }
        
        // Check max retry count
        if (!photo.canRetry(maxRetries)) {
            log.warn("Photo has exceeded max retry count: photoId={}, retryCount={}, maxRetries={}", 
                    photo.getId(), photo.getRetryCount(), maxRetries);
            throw new IllegalStateException(
                    "Photo has exceeded maximum retry attempts. Retry count: " + photo.getRetryCount() + 
                    ", Maximum: " + maxRetries);
        }
        
        // Retry the photo (changes status from FAILED to UPLOADING)
        photo.retry();
        photo = photoRepository.save(photo);
        log.debug("Photo status changed to UPLOADING: {}", photo.getId());
        
        // Generate new presigned upload URL
        String presignedUrl = s3Service.generateUploadUrl(
                photo.getUser().getId(),
                photo.getId(),
                photo.getFilename(),
                photo.getContentType()
        );
        
        log.info("Successfully retried upload for photo: {} (retry count: {})", 
                photo.getId(), photo.getRetryCount());
        
        return RetryUploadResponse.builder()
                .photoId(photo.getId())
                .uploadUrl(presignedUrl)
                .filename(photo.getFilename())
                .contentType(photo.getContentType())
                .retryCount(photo.getRetryCount())
                .message("Upload retry initiated. Use the provided URL to upload the photo.")
                .build();
    }
}

