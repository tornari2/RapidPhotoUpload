package com.rapidphoto.features.upload_photo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for completing a photo upload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompletePhotoUploadRequest {
    
    private UUID photoId;  // Optional - can come from path variable
}

