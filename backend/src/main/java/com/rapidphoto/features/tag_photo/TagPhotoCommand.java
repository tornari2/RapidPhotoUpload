package com.rapidphoto.features.tag_photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Command for tagging a single photo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagPhotoCommand {
    
    private UUID photoId;
    private UUID userId;
    private List<String> tagNames;
}

