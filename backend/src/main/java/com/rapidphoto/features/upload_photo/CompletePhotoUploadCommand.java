package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Command for completing a photo upload
 * Encapsulates the data needed to mark a photo as completed
 */
@Data
@Builder
public class CompletePhotoUploadCommand {
    
    private Photo photo;
    private UUID photoId;
    
    /**
     * Factory method to create command from photo entity
     */
    public static CompletePhotoUploadCommand fromPhoto(Photo photo) {
        return CompletePhotoUploadCommand.builder()
                .photo(photo)
                .photoId(photo.getId())
                .build();
    }
}

