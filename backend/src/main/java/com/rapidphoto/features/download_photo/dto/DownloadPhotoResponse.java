package com.rapidphoto.features.download_photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for photo download
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadPhotoResponse {
    
    private UUID photoId;
    private String downloadUrl;
    private String filename;
    private String contentType;
    private Long fileSize;
    private Integer expirationMinutes;
}

