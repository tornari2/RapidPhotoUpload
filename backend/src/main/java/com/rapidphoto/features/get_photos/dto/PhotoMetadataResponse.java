package com.rapidphoto.features.get_photos.dto;

import com.rapidphoto.domain.PhotoStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for detailed photo metadata response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoMetadataResponse {
    
    private UUID id;
    private UUID userId;
    private UUID uploadJobId;
    private String filename;
    private String s3Key;
    private Long fileSize;
    private String contentType;
    private PhotoStatus uploadStatus;
    private Integer retryCount;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    
    // Additional metadata
    private String downloadUrl; // Presigned download URL
    private List<String> tags; // Photo tags
}

