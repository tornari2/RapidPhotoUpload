package com.rapidphoto.features.download_photo;

import com.rapidphoto.features.download_photo.dto.DownloadPhotoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for photo download operations
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class DownloadPhotoController {
    
    private final DownloadPhotoHandler downloadPhotoHandler;
    
    /**
     * Generate a presigned download URL for a photo
     * 
     * GET /api/photos/{photoId}/download?userId={userId}&expirationMinutes={expirationMinutes}
     * 
     * @param photoId Photo ID (required)
     * @param userId User ID (required) - for authorization
     * @param expirationMinutes Optional: Custom expiration time in minutes (1-60, default: 15)
     * @return DownloadPhotoResponse with presigned download URL
     */
    @GetMapping("/{photoId}/download")
    public ResponseEntity<DownloadPhotoResponse> downloadPhoto(
            @PathVariable UUID photoId,
            @RequestParam UUID userId,
            @RequestParam(required = false) Integer expirationMinutes) {
        
        log.info("GET /api/photos/{}/download - userId: {}, expirationMinutes: {}", 
                photoId, userId, expirationMinutes);
        
        DownloadPhotoQuery query = DownloadPhotoQuery.builder()
                .photoId(photoId)
                .userId(userId)
                .expirationMinutes(expirationMinutes)
                .build();
        
        DownloadPhotoResponse response = downloadPhotoHandler.handle(query);
        return ResponseEntity.ok(response);
    }
}

