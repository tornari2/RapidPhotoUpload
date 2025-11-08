package com.rapidphoto.features.upload_photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Command for deleting a photo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeletePhotoCommand {
    
    private UUID photoId;
    private UUID userId;
}

