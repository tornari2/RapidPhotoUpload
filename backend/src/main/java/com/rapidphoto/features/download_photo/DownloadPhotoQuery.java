package com.rapidphoto.features.download_photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Query for downloading a photo via presigned URL
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadPhotoQuery {
    
    /**
     * Photo ID (required)
     */
    private UUID photoId;
    
    /**
     * User ID (required) - for authorization
     */
    private UUID userId;
    
    /**
     * Optional: Custom expiration time in minutes (default: uses PresignedUrlGenerator default)
     */
    private Integer expirationMinutes;
}

