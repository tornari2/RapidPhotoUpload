package com.rapidphoto.features.retry_upload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Command for retrying a failed photo upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryUploadCommand {
    
    /**
     * Photo ID (required)
     */
    private UUID photoId;
    
    /**
     * User ID (required) - for authorization
     */
    private UUID userId;
}

