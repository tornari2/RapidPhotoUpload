package com.rapidphoto.features.tag_photo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Command for bulk tagging multiple photos
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkTagPhotosCommand {
    
    private UUID userId;
    private List<UUID> photoIds;
    private List<String> tagNames;
}

