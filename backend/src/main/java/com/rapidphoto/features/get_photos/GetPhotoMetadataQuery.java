package com.rapidphoto.features.get_photos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Query for retrieving detailed metadata for a specific photo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GetPhotoMetadataQuery {
    
    /**
     * Photo ID (required)
     */
    private UUID photoId;
    
    /**
     * User ID (required) - for authorization
     */
    private UUID userId;
    
    /**
     * Whether to include presigned download URL
     */
    @Builder.Default
    private Boolean includeDownloadUrl = true;
    
    /**
     * Whether to include tags
     */
    @Builder.Default
    private Boolean includeTags = true;
}

