package com.rapidphoto.features.upload_photo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for creating an upload job
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUploadJobRequest {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotEmpty(message = "At least one photo is required")
    @Valid
    private List<PhotoUploadRequest> photos;
    
    /**
     * Individual photo upload request
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PhotoUploadRequest {
        @NotNull(message = "Filename is required")
        private String filename;
        
        @NotNull(message = "File size is required")
        private Long fileSize;
        
        @NotNull(message = "Content type is required")
        private String contentType;
    }
}

