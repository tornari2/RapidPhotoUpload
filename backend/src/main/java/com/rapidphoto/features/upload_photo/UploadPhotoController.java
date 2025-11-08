package com.rapidphoto.features.upload_photo;

import com.rapidphoto.domain.User;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobRequest;
import com.rapidphoto.features.upload_photo.dto.CreateUploadJobResponse;
import com.rapidphoto.features.auth.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for photo upload operations
 */
@RestController
@RequestMapping("/api/upload-jobs")
@RequiredArgsConstructor
@Slf4j
public class UploadPhotoController {
    
    private final CreateUploadJobHandler createUploadJobHandler;
    private final UploadPhotoValidator validator;
    private final UserRepository userRepository;
    
    /**
     * Create a new upload job with presigned URLs for photos
     * 
     * @param request The upload job request containing user ID and photo information
     * @param bindingResult Validation result
     * @return Response with job ID, photo IDs, and presigned URLs
     */
    @PostMapping
    public ResponseEntity<?> createUploadJob(
            @Valid @RequestBody CreateUploadJobRequest request,
            BindingResult bindingResult) {
        
        log.info("Received upload job creation request for user: {}", request.getUserId());
        
        // Perform additional validation
        validator.validate(request, bindingResult);
        
        if (bindingResult.hasErrors()) {
            log.warn("Validation errors in upload job request: {}", bindingResult.getAllErrors());
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Validation failed", bindingResult.getAllErrors().toString()));
        }
        
        // Verify user exists
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> {
                    log.warn("User not found: {}", request.getUserId());
                    return new IllegalArgumentException("User not found: " + request.getUserId());
                });
        
        // Create command from request
        CreateUploadJobCommand command = CreateUploadJobCommand.fromRequest(user, request);
        
        // Handle command
        try {
            CreateUploadJobResponse response = createUploadJobHandler.handle(command);
            log.info("Successfully created upload job: {} for user: {}", 
                    response.getJobId(), response.getUserId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error creating upload job for user: {}", request.getUserId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Failed to create upload job", e.getMessage()));
        }
    }
    
    /**
     * Error response DTO
     */
    private record ErrorResponse(String error, String message) {}
}

