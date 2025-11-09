package com.rapidphoto.features.download_photo;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.features.download_photo.dto.DownloadPhotoResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.infrastructure.s3.PresignedUrlGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handler for DownloadPhotoQuery
 * Generates presigned download URLs for photos
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DownloadPhotoHandler {
    
    private final PhotoRepository photoRepository;
    private final PresignedUrlGenerator presignedUrlGenerator;
    
    @Value("${aws.s3.presigned-url-expiration-minutes:15}")
    private int defaultExpirationMinutes;
    
    /**
     * Handle the DownloadPhotoQuery
     * 
     * @param query The query containing photo ID, user ID, and optional expiration
     * @return DownloadPhotoResponse with presigned download URL
     * @throws IllegalArgumentException if photo not found, doesn't belong to user, or is not completed
     */
    @Transactional(readOnly = true)
    public DownloadPhotoResponse handle(DownloadPhotoQuery query) {
        log.info("Generating download URL for photo: {} for user: {}", 
                query.getPhotoId(), query.getUserId());
        
        // Find photo and verify ownership
        Photo photo = photoRepository.findByIdAndUser_Id(query.getPhotoId(), query.getUserId())
                .orElseThrow(() -> {
                    log.warn("Photo not found or access denied: photoId={}, userId={}", 
                            query.getPhotoId(), query.getUserId());
                    return new IllegalArgumentException("Photo not found or access denied");
                });
        
        // Verify photo is completed (only completed photos can be downloaded)
        if (photo.getUploadStatus() != PhotoStatus.COMPLETED) {
            log.warn("Photo is not completed, cannot download: photoId={}, status={}", 
                    photo.getId(), photo.getUploadStatus());
            throw new IllegalStateException("Photo is not completed and cannot be downloaded. Status: " + photo.getUploadStatus());
        }
        
        // Determine expiration time
        int expirationMinutes = query.getExpirationMinutes() != null 
                ? query.getExpirationMinutes() 
                : defaultExpirationMinutes;
        
        // Validate expiration time (min 1 minute, max 60 minutes)
        expirationMinutes = Math.max(1, Math.min(60, expirationMinutes));
        
        // Generate presigned download URL
        String downloadUrl = presignedUrlGenerator.generateDownloadUrl(photo.getS3Key(), expirationMinutes);
        
        log.info("Successfully generated download URL for photo: {} (expires in {} minutes)", 
                photo.getId(), expirationMinutes);
        
        return DownloadPhotoResponse.builder()
                .photoId(photo.getId())
                .downloadUrl(downloadUrl)
                .filename(photo.getFilename())
                .contentType(photo.getContentType())
                .fileSize(photo.getFileSize())
                .expirationMinutes(expirationMinutes)
                .build();
    }
}

