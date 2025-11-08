package com.rapidphoto.features.get_photos;

import com.rapidphoto.domain.Photo;
import com.rapidphoto.domain.PhotoStatus;
import com.rapidphoto.features.get_photos.dto.GetUserPhotosResponse;
import com.rapidphoto.features.get_photos.dto.PhotoResponse;
import com.rapidphoto.features.upload_photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Handler for GetUserPhotosQuery
 * Retrieves photos for a user with optional filtering and pagination
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GetUserPhotosHandler {
    
    private final PhotoRepository photoRepository;
    
    /**
     * Handle the GetUserPhotosQuery
     * 
     * @param query The query containing user ID and optional filters
     * @return GetUserPhotosResponse with paginated photos
     */
    @Transactional(readOnly = true)
    public GetUserPhotosResponse handle(GetUserPhotosQuery query) {
        log.debug("Handling GetUserPhotosQuery for user: {} with filters: status={}, uploadJobId={}, page={}, size={}", 
                query.getUserId(), query.getStatus(), query.getUploadJobId(), query.getPage(), query.getSize());
        
        // Validate and normalize pagination parameters
        int page = Math.max(0, query.getPage());
        int size = Math.min(100, Math.max(1, query.getSize())); // Max 100, min 1
        
        // Build sort
        Sort sort = buildSort(query.getSortBy(), query.getSortDirection());
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Query photos based on filters
        Page<Photo> photoPage;
        if (query.getStatus() != null && query.getUploadJobId() != null) {
            photoPage = photoRepository.findByUserIdAndUploadStatusAndUploadJobId(
                    query.getUserId(), query.getStatus(), query.getUploadJobId(), pageable);
        } else if (query.getStatus() != null) {
            photoPage = photoRepository.findByUserIdAndUploadStatus(
                    query.getUserId(), query.getStatus(), pageable);
        } else if (query.getUploadJobId() != null) {
            photoPage = photoRepository.findByUserIdAndUploadJobId(
                    query.getUserId(), query.getUploadJobId(), pageable);
        } else {
            photoPage = photoRepository.findByUserId(query.getUserId(), pageable);
        }
        
        // Convert to DTOs
        List<PhotoResponse> photoResponses = photoPage.getContent().stream()
                .map(this::toPhotoResponse)
                .collect(Collectors.toList());
        
        log.debug("Retrieved {} photos for user: {} (page {} of {})", 
                photoResponses.size(), query.getUserId(), page, photoPage.getTotalPages());
        
        return GetUserPhotosResponse.builder()
                .photos(photoResponses)
                .page(photoPage.getNumber())
                .size(photoPage.getSize())
                .totalElements(photoPage.getTotalElements())
                .totalPages(photoPage.getTotalPages())
                .hasNext(photoPage.hasNext())
                .hasPrevious(photoPage.hasPrevious())
                .build();
    }
    
    /**
     * Convert Photo entity to PhotoResponse DTO
     */
    private PhotoResponse toPhotoResponse(Photo photo) {
        return PhotoResponse.builder()
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
                .completedAt(photo.getCompletedAt())
                .build();
    }
    
    /**
     * Build Sort object from sort field and direction
     */
    private Sort buildSort(String sortBy, String sortDirection) {
        // Validate and normalize sort field
        String field;
        switch (sortBy != null ? sortBy.toLowerCase() : "createdat") {
            case "filename":
                field = "filename";
                break;
            case "filesize":
                field = "fileSize";
                break;
            case "uploadstatus":
                field = "uploadStatus";
                break;
            case "createdat":
            default:
                field = "createdAt";
                break;
        }
        
        // Validate and normalize sort direction
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection) 
                ? Sort.Direction.ASC 
                : Sort.Direction.DESC;
        
        return Sort.by(direction, field);
    }
}

