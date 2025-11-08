package com.rapidphoto.features.tag_photo;

import com.rapidphoto.features.tag_photo.dto.BulkTagPhotosResponse;
import com.rapidphoto.features.tag_photo.dto.TagPhotoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Handler for BulkTagPhotosCommand
 * Tags multiple photos with the same set of tags
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BulkTagPhotosHandler {
    
    private final TagPhotoHandler tagPhotoHandler;
    
    /**
     * Handle the BulkTagPhotosCommand
     * 
     * @param command The command containing user ID, photo IDs, and tag names
     * @return BulkTagPhotosResponse with results for each photo
     */
    @Transactional
    public BulkTagPhotosResponse handle(BulkTagPhotosCommand command) {
        log.info("Bulk tagging {} photos for user: {} with tags: {}", 
                command.getPhotoIds().size(), command.getUserId(), command.getTagNames());
        
        List<TagPhotoResponse> results = new ArrayList<>();
        Map<UUID, String> failures = new HashMap<>();
        int successfulCount = 0;
        int failedCount = 0;
        
        // Process each photo
        for (UUID photoId : command.getPhotoIds()) {
            try {
                TagPhotoCommand tagCommand = TagPhotoCommand.builder()
                        .photoId(photoId)
                        .userId(command.getUserId())
                        .tagNames(command.getTagNames())
                        .build();
                
                TagPhotoResponse response = tagPhotoHandler.handle(tagCommand);
                results.add(response);
                successfulCount++;
                log.debug("Successfully tagged photo: {}", photoId);
            } catch (Exception e) {
                failedCount++;
                String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
                failures.put(photoId, errorMessage);
                log.warn("Failed to tag photo: {} - Error: {}", photoId, errorMessage);
            }
        }
        
        log.info("Bulk tagging completed - Successful: {}, Failed: {}", successfulCount, failedCount);
        
        return BulkTagPhotosResponse.builder()
                .totalPhotos(command.getPhotoIds().size())
                .successfulPhotos(successfulCount)
                .failedPhotos(failedCount)
                .failures(failures)
                .results(results)
                .build();
    }
}

