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
    
    private UUID photoId;  // Optional - can come from path variable
    
    @NotBlank(message = "Error message is required")
    private String errorMessage;
}

