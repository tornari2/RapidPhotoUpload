package com.rapidphoto.infrastructure.s3;

import java.util.UUID;

/**
 * Service interface for S3 operations
 */
public interface S3Service {
    
    /**
     * Generate presigned URL for uploading a photo
     * 
     * @param userId User ID
     * @param photoId Photo ID
     * @param filename Original filename
     * @param contentType Content type
     * @return Presigned upload URL
     */
    String generateUploadUrl(UUID userId, UUID photoId, String filename, String contentType);
    
    /**
     * Generate presigned URL for downloading a photo
     * 
     * @param s3Key S3 key of the photo
     * @return Presigned download URL
     */
    String generateDownloadUrl(String s3Key);
    
    /**
     * Verify if a file exists in S3
     * 
     * @param s3Key S3 key to check
     * @return true if file exists
     */
    boolean fileExists(String s3Key);
    
    /**
     * Delete a file from S3
     * 
     * @param s3Key S3 key of the file to delete
     * @return true if deletion was successful
     */
    boolean deleteFile(String s3Key);
    
    /**
     * Build S3 key for a photo
     * Format: uploads/{userId}/{photoId}-{filename}
     * 
     * @param userId User ID
     * @param photoId Photo ID
     * @param filename Original filename
     * @return S3 key
     */
    String buildS3Key(UUID userId, UUID photoId, String filename);
}

