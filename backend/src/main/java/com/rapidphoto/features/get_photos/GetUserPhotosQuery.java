package com.rapidphoto.features.get_photos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Query for retrieving user photos with optional filtering
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GetUserPhotosQuery {
    
    /**
     * User ID (required)
     */
    private UUID userId;
    
    /**
     * Optional: Filter by upload status
     */
    private com.rapidphoto.domain.PhotoStatus status;
    
    /**
     * Optional: Filter by upload job ID
     */
    private UUID uploadJobId;
    
    /**
     * Optional: Page number (0-indexed, default: 0)
     */
    @Builder.Default
    private Integer page = 0;
    
    /**
     * Optional: Page size (default: 20, max: 100)
     */
    @Builder.Default
    private Integer size = 20;
    
    /**
     * Optional: Sort by field (default: "createdAt")
     * Valid values: createdAt, filename, fileSize, uploadStatus
     */
    @Builder.Default
    private String sortBy = "createdAt";
    
    /**
     * Optional: Sort direction (default: "desc")
     * Valid values: asc, desc
     */
    @Builder.Default
    private String sortDirection = "desc";
}

