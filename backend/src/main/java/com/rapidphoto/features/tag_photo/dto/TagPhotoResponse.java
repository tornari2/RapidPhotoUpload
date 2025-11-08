package com.rapidphoto.features.tag_photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for tagging operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagPhotoResponse {
    
    private UUID photoId;
    private List<String> addedTags;
    private List<String> existingTags;
    private int totalTags;
}

