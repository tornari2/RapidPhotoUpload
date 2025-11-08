package com.rapidphoto.features.tag_photo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for bulk tagging multiple photos
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkTagPhotosRequest {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Photo IDs are required")
    @Size(min = 1, message = "At least one photo ID is required")
    private List<@NotNull(message = "Photo ID cannot be null") UUID> photoIds;
    
    @NotNull(message = "Tag names are required")
    @Size(min = 1, message = "At least one tag name is required")
    private List<@NotBlank(message = "Tag name cannot be blank") 
                 @Size(min = 1, max = 100, message = "Tag name must be between 1 and 100 characters") String> tagNames;
}

