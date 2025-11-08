package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.Photo;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Command for failing a photo upload
 * Encapsulates the data needed to mark a photo as failed
 */
@Data
@Builder
public class FailPhotoUploadCommand {
    
    private Photo photo;
    private UUID photoId;
    private String errorMessage;
    
    /**
     * Factory method to create command from photo entity and error message
     */
    public static FailPhotoUploadCommand fromPhoto(Photo photo, String errorMessage) {
        return FailPhotoUploadCommand.builder()
                .photo(photo)
                .photoId(photo.getId())
                .errorMessage(errorMessage)
                .build();
    }
}

