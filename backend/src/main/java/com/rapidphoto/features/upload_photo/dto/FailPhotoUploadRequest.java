package com.rapidphoto.features.upload_photo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for failing a photo upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailPhotoUploadRequest {
    
    @NotNull(message = "Photo ID is required")
    private UUID photoId;
    
    @NotBlank(message = "Error message is required")
    private String errorMessage;
}

