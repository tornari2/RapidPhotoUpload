package com.rapidphoto.features.get_photos;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.features.get_photos.dto.PhotoMetadataResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import com.rapidphoto.infrastructure.s3.PresignedUrlGenerator;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handler for GetPhotoMetadataQuery
 * Retrieves detailed metadata for a specific photo including download URL and tags
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GetPhotoMetadataHandler {
    
    private final PhotoRepository photoRepository;
    private final PresignedUrlGenerator presignedUrlGenerator;
    private final EntityManager entityManager;
    
    /**
     * Handle the GetPhotoMetadataQuery
     * 
     * @param query The query containing photo ID and user ID
     * @return PhotoMetadataResponse with detailed photo metadata
     * @throws IllegalArgumentException if photo not found or doesn't belong to user
     */
    @Transactional(readOnly = true)
    public PhotoMetadataResponse handle(GetPhotoMetadataQuery query) {
        log.debug("Handling GetPhotoMetadataQuery for photo: {} and user: {}", 
                query.getPhotoId(), query.getUserId());
        
        // Find photo and verify ownership
        Photo photo = photoRepository.findByIdAndUserId(query.getPhotoId(), query.getUserId())
                .orElseThrow(() -> {
                    log.warn("Photo not found or access denied: photoId={}, userId={}", 
                            query.getPhotoId(), query.getUserId());
                    return new IllegalArgumentException("Photo not found or access denied");
                });
        
        // Build response
        PhotoMetadataResponse.PhotoMetadataResponseBuilder builder = PhotoMetadataResponse.builder()
                .id(photo.getId())
                .userId(photo.getUser() != null ? photo.getUser().getId() : null)
                .uploadJobId(photo.getUploadJob() != null ? photo.getUploadJob().getId() : null)
                .filename(photo.getFilename())
                .s3Key(photo.getS3Key())
                .fileSize(photo.getFileSize())
                .contentType(photo.getContentType())
                .uploadStatus(photo.getUploadStatus())
                .retryCount(photo.getRetryCount())
                .createdAt(photo.getCreatedAt())
                .completedAt(photo.getCompletedAt());
        
        // Add download URL if requested
        if (query.getIncludeDownloadUrl() != null && query.getIncludeDownloadUrl()) {
            try {
                String downloadUrl = presignedUrlGenerator.generateDownloadUrl(photo.getS3Key());
                builder.downloadUrl(downloadUrl);
                log.debug("Generated download URL for photo: {}", photo.getId());
            } catch (Exception e) {
                log.error("Error generating download URL for photo: {}", photo.getId(), e);
                // Don't fail the request if URL generation fails
            }
        }
        
        // Add tags if requested
        if (query.getIncludeTags() != null && query.getIncludeTags()) {
            List<String> tags = getPhotoTags(photo.getId());
            builder.tags(tags);
            log.debug("Retrieved {} tags for photo: {}", tags.size(), photo.getId());
        }
        
        PhotoMetadataResponse response = builder.build();
        log.debug("Successfully retrieved metadata for photo: {}", photo.getId());
        
        return response;
    }
    
    /**
     * Get tags for a photo from the photo_tags junction table
     */
    private List<String> getPhotoTags(UUID photoId) {
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT t.name FROM tags t " +
                    "INNER JOIN photo_tags pt ON t.id = pt.tag_id " +
                    "WHERE pt.photo_id = :photoId " +
                    "ORDER BY t.name ASC"
            );
            query.setParameter("photoId", photoId);
            
            @SuppressWarnings("unchecked")
            List<String> tagNames = (List<String>) query.getResultList();
            return tagNames;
        } catch (Exception e) {
            log.error("Error retrieving tags for photo: {}", photoId, e);
            return Collections.emptyList();
        }
    }
}

