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
 * Request DTO for tagging a photo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagPhotoRequest {
    
    @NotNull(message = "Photo ID is required")
    private UUID photoId;
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Tag names are required")
    @Size(min = 1, message = "At least one tag name is required")
    private List<@NotBlank(message = "Tag name cannot be blank") 
                 @Size(min = 1, max = 100, message = "Tag name must be between 1 and 100 characters") String> tagNames;
}

