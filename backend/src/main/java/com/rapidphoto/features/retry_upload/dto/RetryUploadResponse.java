package com.rapidphoto.features.retry_upload.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for retry upload operation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryUploadResponse {
    
    private UUID photoId;
    private String uploadUrl;
    private String filename;
    private String contentType;
    private Integer retryCount;
    private String message;
}

