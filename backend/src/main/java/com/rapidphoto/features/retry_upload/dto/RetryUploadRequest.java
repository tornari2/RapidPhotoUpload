package com.rapidphoto.features.retry_upload.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for retrying a failed upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryUploadRequest {
    
    @NotNull(message = "Photo ID is required")
    private UUID photoId;
    
    @NotNull(message = "User ID is required")
    private UUID userId;
}

