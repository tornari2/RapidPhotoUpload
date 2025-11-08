package com.rapidphoto.features.upload_photo;

import com.rapidphoto.features.upload_photo.dto.CreateUploadJobRequest;
import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

import java.util.Set;

/**
 * Validator for upload photo requests
 * Performs additional business rule validation beyond Jakarta Validation annotations
 */
@Component
public class UploadPhotoValidator implements Validator {
    
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp"
    );
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final long MIN_FILE_SIZE = 1024; // 1KB
    private static final int MAX_PHOTOS_PER_JOB = 100;
    
    @Override
    public boolean supports(Class<?> clazz) {
        return CreateUploadJobRequest.class.isAssignableFrom(clazz);
    }
    
    @Override
    public void validate(Object target, Errors errors) {
        CreateUploadJobRequest request = (CreateUploadJobRequest) target;
        
        if (request.getPhotos() == null || request.getPhotos().isEmpty()) {
            errors.rejectValue("photos", "photos.empty", "At least one photo is required");
            return;
        }
        
        // Validate photo count
        if (request.getPhotos().size() > MAX_PHOTOS_PER_JOB) {
            errors.rejectValue("photos", "photos.tooMany", 
                    String.format("Maximum %d photos allowed per job", MAX_PHOTOS_PER_JOB));
        }
        
        // Validate each photo
        for (int i = 0; i < request.getPhotos().size(); i++) {
            CreateUploadJobRequest.PhotoUploadRequest photo = request.getPhotos().get(i);
            String fieldPrefix = "photos[" + i + "]";
            
            validatePhoto(photo, fieldPrefix, errors);
        }
    }
    
    private void validatePhoto(
            CreateUploadJobRequest.PhotoUploadRequest photo,
            String fieldPrefix,
            Errors errors) {
        
        // Validate filename
        if (photo.getFilename() != null) {
            String filename = photo.getFilename().trim();
            if (filename.isEmpty()) {
                errors.rejectValue(fieldPrefix + ".filename", "filename.empty", 
                        "Filename cannot be empty");
            } else if (filename.length() > 500) {
                errors.rejectValue(fieldPrefix + ".filename", "filename.tooLong", 
                        "Filename cannot exceed 500 characters");
            } else if (!isValidFilename(filename)) {
                errors.rejectValue(fieldPrefix + ".filename", "filename.invalid", 
                        "Filename contains invalid characters");
            }
        }
        
        // Validate file size
        if (photo.getFileSize() != null) {
            if (photo.getFileSize() < MIN_FILE_SIZE) {
                errors.rejectValue(fieldPrefix + ".fileSize", "fileSize.tooSmall", 
                        String.format("File size must be at least %d bytes", MIN_FILE_SIZE));
            } else if (photo.getFileSize() > MAX_FILE_SIZE) {
                errors.rejectValue(fieldPrefix + ".fileSize", "fileSize.tooLarge", 
                        String.format("File size cannot exceed %d bytes", MAX_FILE_SIZE));
            }
        }
        
        // Validate content type
        if (photo.getContentType() != null) {
            if (!ALLOWED_CONTENT_TYPES.contains(photo.getContentType().toLowerCase())) {
                errors.rejectValue(fieldPrefix + ".contentType", "contentType.invalid", 
                        "Content type must be one of: " + String.join(", ", ALLOWED_CONTENT_TYPES));
            }
        }
    }
    
    private boolean isValidFilename(String filename) {
        // Check for path traversal attempts and other dangerous characters
        return !filename.contains("..") &&
               !filename.contains("/") &&
               !filename.contains("\\") &&
               !filename.contains("\0") &&
               filename.matches("^[^<>:\"|?*]+$");
    }
}

