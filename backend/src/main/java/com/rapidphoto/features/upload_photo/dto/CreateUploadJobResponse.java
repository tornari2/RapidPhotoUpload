package com.rapidphoto.features.upload_photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for upload job creation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUploadJobResponse {
    
    private UUID jobId;
    private UUID userId;
    private Integer totalCount;
    private String status;
    private List<PhotoUploadResponse> photos;
    
    /**
     * Individual photo upload response with presigned URL
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PhotoUploadResponse {
        private UUID photoId;
        private String filename;
        private String uploadUrl; // Presigned URL
        private String s3Key;
        private String status;
    }
}

