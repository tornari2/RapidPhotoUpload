package com.rapidphoto.features.get_photos.dto;

import com.rapidphoto.domain.PhotoStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for photo response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoResponse {
    
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
}

