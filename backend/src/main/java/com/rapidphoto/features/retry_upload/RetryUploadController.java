package com.rapidphoto.features.retry_upload;

import com.rapidphoto.features.retry_upload.dto.RetryUploadRequest;
import com.rapidphoto.features.retry_upload.dto.RetryUploadResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for retry upload operations
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class RetryUploadController {
    
    private final RetryUploadHandler retryUploadHandler;
    
    /**
     * Retry a failed photo upload
     * 
     * POST /api/photos/retry
     * 
     * @param request RetryUploadRequest containing photoId and userId
     * @return RetryUploadResponse with new presigned upload URL
     */
    @PostMapping("/retry")
    public ResponseEntity<RetryUploadResponse> retryUpload(@Valid @RequestBody RetryUploadRequest request) {
        log.info("POST /api/photos/retry - photoId: {}, userId: {}", 
                request.getPhotoId(), request.getUserId());
        
        RetryUploadCommand command = RetryUploadCommand.builder()
                .photoId(request.getPhotoId())
                .userId(request.getUserId())
                .build();
        
        RetryUploadResponse response = retryUploadHandler.handle(command);
        return ResponseEntity.ok(response);
    }
}

