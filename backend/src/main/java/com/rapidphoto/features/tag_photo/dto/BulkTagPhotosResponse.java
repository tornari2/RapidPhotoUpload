package com.rapidphoto.features.tag_photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Response DTO for bulk tagging operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkTagPhotosResponse {
    
    private int totalPhotos;
    private int successfulPhotos;
    private int failedPhotos;
    private Map<UUID, String> failures; // photoId -> error message
    private List<TagPhotoResponse> results;
}

