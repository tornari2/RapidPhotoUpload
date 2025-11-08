package com.rapidphoto.features.tag_photo;

import com.rapidphoto.features.tag_photo.dto.BulkTagPhotosRequest;
import com.rapidphoto.features.tag_photo.dto.BulkTagPhotosResponse;
import com.rapidphoto.features.tag_photo.dto.TagPhotoRequest;
import com.rapidphoto.features.tag_photo.dto.TagPhotoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for photo tagging operations
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class TagPhotoController {
    
    private final TagPhotoHandler tagPhotoHandler;
    private final BulkTagPhotosHandler bulkTagPhotosHandler;
    
    /**
     * Tag a single photo with one or more tags
     * 
     * POST /api/photos/tag
     * 
     * @param request TagPhotoRequest containing photoId, userId, and tagNames
     * @return TagPhotoResponse with tagging results
     */
    @PostMapping("/tag")
    public ResponseEntity<TagPhotoResponse> tagPhoto(@Valid @RequestBody TagPhotoRequest request) {
        log.info("POST /api/photos/tag - photoId: {}, userId: {}, tags: {}", 
                request.getPhotoId(), request.getUserId(), request.getTagNames());
        
        TagPhotoCommand command = TagPhotoCommand.builder()
                .photoId(request.getPhotoId())
                .userId(request.getUserId())
                .tagNames(request.getTagNames())
                .build();
        
        TagPhotoResponse response = tagPhotoHandler.handle(command);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Bulk tag multiple photos with the same set of tags
     * 
     * POST /api/photos/bulk-tag
     * 
     * @param request BulkTagPhotosRequest containing userId, photoIds, and tagNames
     * @return BulkTagPhotosResponse with results for each photo
     */
    @PostMapping("/bulk-tag")
    public ResponseEntity<BulkTagPhotosResponse> bulkTagPhotos(@Valid @RequestBody BulkTagPhotosRequest request) {
        log.info("POST /api/photos/bulk-tag - userId: {}, photoIds: {}, tags: {}", 
                request.getUserId(), request.getPhotoIds().size(), request.getTagNames());
        
        BulkTagPhotosCommand command = BulkTagPhotosCommand.builder()
                .userId(request.getUserId())
                .photoIds(request.getPhotoIds())
                .tagNames(request.getTagNames())
                .build();
        
        BulkTagPhotosResponse response = bulkTagPhotosHandler.handle(command);
        return ResponseEntity.ok(response);
    }
}

